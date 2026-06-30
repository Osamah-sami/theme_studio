/* =========================================================================
   Theme Studio — smart color engine
   Generates a complete, perceptually balanced shadcn token set from a single
   primary color using the OKLCH color space (Björn Ottosson's OKLab).

   Exposes window.theme_studio_color with:
     hexToOklch(hex)            -> {L, C, h}
     oklchToHex({L,C,h})        -> "#rrggbb"
     shades(hex)                -> {50..950: "#rrggbb"}   (Tailwind-style ramp)
     generate(primaryHex, mode) -> { ...tokens }          mode = "Light"|"Dark"
     generateBoth(primaryHex)   -> { light: {...}, dark: {...} }
     contrastRatio(hex1, hex2)  -> Number                 WCAG 2.1 ratio (1..21)
     bestForeground(bgHex, opts)-> "#rrggbb"              most readable text color
     wcagLevel(ratio, large)    -> "AAA"|"AA"|"Fail"      WCAG 2.1 grade

   The generated token dict uses the same CSS-property names the rest of Theme
   Studio consumes (background, foreground, primary, …) plus the sidebar-* and
   chart-* tokens that shadcn_desk.css reads.
   ========================================================================= */
(function () {
	"use strict";

	/* ---- sRGB <-> linear ------------------------------------------------ */
	function srgbToLinear(c) {
		return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
	}
	function linearToSrgb(c) {
		return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
	}
	function clamp01(x) {
		return x < 0 ? 0 : x > 1 ? 1 : x;
	}

	/* ---- hex parsing / formatting -------------------------------------- */
	function parseHex(hex) {
		if (typeof hex !== "string") return null;
		var h = hex.trim().replace(/^#/, "");
		if (h.length === 3) {
			h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
		}
		if (!/^[0-9a-f]{6}$/i.test(h)) return null;
		return {
			r: parseInt(h.slice(0, 2), 16) / 255,
			g: parseInt(h.slice(2, 4), 16) / 255,
			b: parseInt(h.slice(4, 6), 16) / 255,
		};
	}
	function toHex(rgb) {
		function ch(v) {
			var n = Math.round(clamp01(v) * 255);
			var s = n.toString(16);
			return s.length === 1 ? "0" + s : s;
		}
		return "#" + ch(rgb.r) + ch(rgb.g) + ch(rgb.b);
	}

	/* ---- linear sRGB <-> OKLab ----------------------------------------- */
	function linearRgbToOklab(r, g, b) {
		var l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
		var m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
		var s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
		var l_ = Math.cbrt(l);
		var m_ = Math.cbrt(m);
		var s_ = Math.cbrt(s);
		return {
			L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
			a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
			b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
		};
	}
	function oklabToLinearRgb(L, a, b) {
		var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
		var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
		var s_ = L - 0.0894841775 * a - 1.291485548 * b;
		var l = l_ * l_ * l_;
		var m = m_ * m_ * m_;
		var s = s_ * s_ * s_;
		return {
			r: +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
			g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
			b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
		};
	}

	/* ---- OKLab <-> OKLCH ----------------------------------------------- */
	function oklabToOklch(L, a, b) {
		var C = Math.sqrt(a * a + b * b);
		var h = (Math.atan2(b, a) * 180) / Math.PI;
		if (h < 0) h += 360;
		return { L: L, C: C, h: h };
	}
	function oklchToOklab(L, C, h) {
		var rad = (h * Math.PI) / 180;
		return { L: L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
	}

	/* ---- public conversions -------------------------------------------- */
	function hexToOklch(hex) {
		var rgb = parseHex(hex);
		if (!rgb) return { L: 0.5, C: 0, h: 0 };
		var lab = linearRgbToOklab(
			srgbToLinear(rgb.r),
			srgbToLinear(rgb.g),
			srgbToLinear(rgb.b)
		);
		return oklabToOklch(lab.L, lab.a, lab.b);
	}
	function oklchToHex(oklch) {
		var lab = oklchToOklab(oklch.L, Math.max(0, oklch.C), oklch.h);
		var lin = oklabToLinearRgb(lab.L, lab.a, lab.b);
		// Gamut clip: reduce chroma until the color fits in sRGB.
		if (outOfGamut(lin)) {
			var lo = 0;
			var hi = oklch.C;
			for (var i = 0; i < 18; i++) {
				var mid = (lo + hi) / 2;
				var l2 = oklchToOklab(oklch.L, mid, oklch.h);
				lin = oklabToLinearRgb(l2.L, l2.a, l2.b);
				if (outOfGamut(lin)) hi = mid;
				else lo = mid;
			}
		}
		return toHex({
			r: linearToSrgb(clamp01(lin.r)),
			g: linearToSrgb(clamp01(lin.g)),
			b: linearToSrgb(clamp01(lin.b)),
		});
	}
	function outOfGamut(lin) {
		var e = 0.0001;
		return (
			lin.r < -e || lin.r > 1 + e || lin.g < -e || lin.g > 1 + e || lin.b < -e || lin.b > 1 + e
		);
	}

	/* ---- WCAG 2.1 contrast --------------------------------------------- */
	// Relative luminance per WCAG 2.1 (sRGB, linearized).
	function relativeLuminance(hex) {
		var rgb = parseHex(hex);
		if (!rgb) return 0;
		var r = srgbToLinear(rgb.r);
		var g = srgbToLinear(rgb.g);
		var b = srgbToLinear(rgb.b);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	}
	// Contrast ratio between two hex colors, 1 (none) .. 21 (black on white).
	function contrastRatio(hex1, hex2) {
		var l1 = relativeLuminance(hex1);
		var l2 = relativeLuminance(hex2);
		var lighter = Math.max(l1, l2);
		var darker = Math.min(l1, l2);
		return (lighter + 0.05) / (darker + 0.05);
	}
	// Grade a ratio against WCAG 2.1 thresholds for normal/large text.
	function wcagLevel(ratio, large) {
		if (large) {
			if (ratio >= 4.5) return "AAA";
			if (ratio >= 3) return "AA";
			return "Fail";
		}
		if (ratio >= 7) return "AAA";
		if (ratio >= 4.5) return "AA";
		return "Fail";
	}
	// Pick the most readable foreground for a background, optionally tinted to
	// the background hue. Returns whichever of near-black/near-white scores best,
	// then nudges lightness to reach AA (4.5:1) when the tint falls short.
	function bestForeground(bgHex, opts) {
		opts = opts || {};
		var bg = hexToOklch(bgHex);
		var tintC = opts.tint ? Math.min(bg.C, 0.04) : 0;
		var dark = mk(0.18, tintC, bg.h);
		var light = mk(0.985, Math.min(tintC, 0.02), bg.h);
		var darkRatio = contrastRatio(bgHex, dark);
		var lightRatio = contrastRatio(bgHex, light);
		var pick = darkRatio >= lightRatio ? dark : light;
		var target = opts.target || 4.5;
		if (contrastRatio(bgHex, pick) >= target) return pick;
		// Push toward the better-scoring extreme until it clears the target.
		var goDarker = darkRatio >= lightRatio;
		var fg = hexToOklch(pick);
		for (var i = 0; i < 16 && contrastRatio(bgHex, oklchToHex(fg)) < target; i++) {
			fg.L = goDarker ? Math.max(0, fg.L - 0.05) : Math.min(1, fg.L + 0.05);
		}
		return oklchToHex(fg);
	}

	/* ---- helpers -------------------------------------------------------- */
	// Choose readable foreground text, guaranteed to meet WCAG AA where possible.
	function readableOn(oklch) {
		return hexToOklch(bestForeground(oklchToHex(oklch), { tint: true, target: 4.5 }));
	}
	function mk(L, C, h) {
		return oklchToHex({ L: L, C: C, h: h });
	}

	/* ---- Tailwind-style 50..950 ramp ----------------------------------- */
	// Lightness targets tuned to match shadcn/Tailwind ramps in OKLCH.
	var RAMP = {
		50: 0.971,
		100: 0.936,
		200: 0.885,
		300: 0.808,
		400: 0.704,
		500: 0.637,
		600: 0.577,
		700: 0.505,
		800: 0.444,
		900: 0.396,
		950: 0.258,
	};
	function shades(hex) {
		var base = hexToOklch(hex);
		var out = {};
		Object.keys(RAMP).forEach(function (step) {
			var L = RAMP[step];
			// Chroma follows a bell curve: muted at the extremes, full in the mids.
			var t = 1 - Math.abs(L - 0.62) / 0.62;
			var C = Math.max(0.012, base.C * (0.35 + 0.65 * t));
			out[step] = mk(L, C, base.h);
		});
		return out;
	}

	/* ---- full token generation ----------------------------------------- */
	function generate(primaryHex, mode) {
		var p = hexToOklch(primaryHex);
		var h = p.h;
		// A complementary-ish accent hue keeps charts/sidebar lively.
		var h2 = (h + 28) % 360;
		var destH = 25; // stable red for destructive in OKLCH
		var isDark = (mode || "Light") === "Dark";
		var t = {};

		if (!isDark) {
			t["background"] = mk(0.995, 0.004, h);
			t["foreground"] = mk(0.205, 0.02, h);
			t["card"] = mk(1.0, 0.0, h);
			t["card-foreground"] = mk(0.205, 0.02, h);
			t["popover"] = mk(1.0, 0.0, h);
			t["popover-foreground"] = mk(0.205, 0.02, h);

			t["primary"] = mk(Math.min(Math.max(p.L, 0.45), 0.62), Math.max(p.C, 0.12), h);
			t["primary-foreground"] = oklchToHex(readableOn(hexToOklch(t["primary"])));

			t["secondary"] = mk(0.967, 0.012, h);
			t["secondary-foreground"] = mk(0.27, 0.02, h);
			t["muted"] = mk(0.967, 0.01, h);
			t["muted-foreground"] = mk(0.55, 0.02, h);
			t["accent"] = mk(0.955, 0.022, h);
			t["accent-foreground"] = mk(0.27, 0.04, h);

			t["destructive"] = mk(0.58, 0.21, destH);
			t["destructive-foreground"] = mk(0.985, 0.01, destH);

			t["border"] = mk(0.922, 0.012, h);
			t["input"] = mk(0.922, 0.012, h);
			t["ring"] = mk(0.62, Math.max(p.C * 0.8, 0.08), h);

			t["sidebar"] = mk(0.985, 0.006, h);
			t["sidebar-foreground"] = mk(0.205, 0.02, h);
			t["sidebar-primary"] = t["primary"];
			t["sidebar-primary-foreground"] = t["primary-foreground"];
			t["sidebar-accent"] = mk(0.955, 0.022, h);
			t["sidebar-accent-foreground"] = mk(0.27, 0.04, h);
			t["sidebar-border"] = mk(0.922, 0.012, h);
			t["sidebar-ring"] = t["ring"];
		} else {
			t["background"] = mk(0.18, 0.015, h);
			t["foreground"] = mk(0.97, 0.008, h);
			t["card"] = mk(0.215, 0.018, h);
			t["card-foreground"] = mk(0.97, 0.008, h);
			t["popover"] = mk(0.215, 0.018, h);
			t["popover-foreground"] = mk(0.97, 0.008, h);

			t["primary"] = mk(Math.min(Math.max(p.L + 0.08, 0.6), 0.78), Math.max(p.C, 0.11), h);
			t["primary-foreground"] = oklchToHex(readableOn(hexToOklch(t["primary"])));

			t["secondary"] = mk(0.27, 0.02, h);
			t["secondary-foreground"] = mk(0.97, 0.008, h);
			t["muted"] = mk(0.27, 0.018, h);
			t["muted-foreground"] = mk(0.71, 0.02, h);
			t["accent"] = mk(0.3, 0.03, h);
			t["accent-foreground"] = mk(0.97, 0.008, h);

			t["destructive"] = mk(0.62, 0.2, destH);
			t["destructive-foreground"] = mk(0.97, 0.01, destH);

			t["border"] = mk(0.3, 0.015, h);
			t["input"] = mk(0.32, 0.015, h);
			t["ring"] = mk(0.6, Math.max(p.C * 0.7, 0.08), h);

			t["sidebar"] = mk(0.215, 0.018, h);
			t["sidebar-foreground"] = mk(0.97, 0.008, h);
			t["sidebar-primary"] = t["primary"];
			t["sidebar-primary-foreground"] = t["primary-foreground"];
			t["sidebar-accent"] = mk(0.3, 0.03, h);
			t["sidebar-accent-foreground"] = mk(0.97, 0.008, h);
			t["sidebar-border"] = mk(0.3, 0.015, h);
			t["sidebar-ring"] = t["ring"];
		}

		// Five chart colors spread around the wheel from the primary hue.
		var chartL = isDark ? 0.68 : 0.6;
		var chartC = Math.max(p.C, 0.12);
		t["chart-1"] = mk(chartL, chartC, h);
		t["chart-2"] = mk(chartL, chartC * 0.95, h2);
		t["chart-3"] = mk(chartL, chartC * 0.9, (h + 180) % 360);
		t["chart-4"] = mk(chartL, chartC * 0.95, (h + 90) % 360);
		t["chart-5"] = mk(chartL, chartC, (h + 270) % 360);

		return t;
	}

	function generateBoth(primaryHex) {
		return { light: generate(primaryHex, "Light"), dark: generate(primaryHex, "Dark") };
	}

	window.theme_studio_color = {
		hexToOklch: hexToOklch,
		oklchToHex: oklchToHex,
		shades: shades,
		generate: generate,
		generateBoth: generateBoth,
		contrastRatio: contrastRatio,
		bestForeground: bestForeground,
		wcagLevel: wcagLevel,
	};
})();
