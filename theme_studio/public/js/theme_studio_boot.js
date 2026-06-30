/* =========================================================================
   Theme Studio — boot loader
   Applies the resolved theme tokens to <html> as early as possible and exposes
   a small API (window.theme_studio) used by the Theme Studio desk page for
   live preview, applying, and resetting themes.
   ========================================================================= */
(function () {
	"use strict";

	var ROOT = document.documentElement;
	var SPECIAL = { radius: "--ts-radius", "font-family": "--ts-font-family" };

	function tokenVar(key) {
		return SPECIAL[key] || "--ts-" + key;
	}

	function clearTokens() {
		var style = ROOT.style;
		for (var i = style.length - 1; i >= 0; i--) {
			var prop = style[i];
			if (prop.indexOf("--ts-") === 0) {
				style.removeProperty(prop);
			}
		}
		ROOT.removeAttribute("data-theme-studio");
	}

	function applyTokens(tokens, appearance) {
		if (!tokens) return;
		Object.keys(tokens).forEach(function (key) {
			ROOT.style.setProperty(tokenVar(key), tokens[key]);
		});
		var mode = (appearance || "Light").toLowerCase();
		ROOT.setAttribute("data-theme-studio", mode);
		// Cooperate with Frappe's own light/dark switch where present.
		ROOT.setAttribute("data-theme", mode);
		if (window.frappe && frappe.ui && typeof frappe.ui.set_theme === "function") {
			try {
				frappe.ui.set_theme(mode);
			} catch (e) {
				/* older builds may not expose this */
			}
		}
	}

	function applyPayload(payload) {
		if (!payload || payload.disabled) {
			clearTokens();
			return;
		}
		applyTokens(payload.tokens, payload.appearance);
		theme_studio.current = payload;
	}

	var theme_studio = (window.theme_studio = window.theme_studio || {});
	theme_studio.current = null;
	theme_studio._previewBackup = null;

	/** Apply a fully-resolved theme payload (from the server). */
	theme_studio.apply = applyPayload;

	/** Live preview: apply tokens without persisting. Pass null to restore.
	 *  Used by the Theme Studio page to preview a theme on hover. */
	theme_studio.preview = function (payload) {
		if (!theme_studio._previewBackup) {
			theme_studio._previewBackup = theme_studio.current;
		}
		if (payload) {
			applyTokens(payload.tokens, payload.appearance);
		} else {
			theme_studio.cancelPreview();
		}
	};

	/** Apply a theme on hover and commit it on click. This is the "apply on
	 *  press" behaviour: hovering a theme card previews it on the desk, and
	 *  clicking the card (or its Apply button) persists it. */
	theme_studio.hoverApply = function (payload) {
		theme_studio.preview(payload);
	};

	theme_studio.cancelPreview = function () {
		clearTokens();
		if (theme_studio._previewBackup) {
			applyPayload(theme_studio._previewBackup);
		}
		theme_studio._previewBackup = null;
	};

	/** Persist a theme for the current user (or site) then apply it. */
	theme_studio.setTheme = function (themeName, scope) {
		return frappe
			.call("theme_studio.api.apply_theme", {
				theme_name: themeName,
				scope: scope || "user",
			})
			.then(function (r) {
				theme_studio._previewBackup = null;
				applyPayload(r.message);
				return r.message;
			});
	};

	// Apply the booted theme immediately (before first meaningful paint).
	if (window.frappe && frappe.boot && frappe.boot.theme_studio) {
		applyPayload(frappe.boot.theme_studio);
	}

	// Re-apply after a full desk boot in case boot order varied.
	if (window.frappe && frappe.router) {
		$(document).on("startup", function () {
			if (window.frappe && frappe.boot && frappe.boot.theme_studio) {
				applyPayload(frappe.boot.theme_studio);
			}
		});
	}
})();
