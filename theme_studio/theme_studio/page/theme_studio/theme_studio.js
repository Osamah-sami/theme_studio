frappe.pages["theme-studio"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Theme Studio"),
		single_column: true,
	});
	wrapper.theme_studio = new ThemeStudio(page);
};

const TOKEN_GROUPS = [
	{
		title: "Base",
		tokens: [
			["background", "Background"],
			["foreground", "Foreground"],
			["card", "Card"],
			["card-foreground", "Card Text"],
			["popover", "Popover"],
			["popover-foreground", "Popover Text"],
		],
	},
	{
		title: "Brand",
		tokens: [
			["primary", "Primary"],
			["primary-foreground", "Primary Text"],
			["secondary", "Secondary"],
			["secondary-foreground", "Secondary Text"],
			["muted", "Muted"],
			["muted-foreground", "Muted Text"],
		],
	},
	{
		title: "Support",
		tokens: [
			["accent", "Accent"],
			["accent-foreground", "Accent Text"],
			["destructive", "Destructive"],
			["destructive-foreground", "Destructive Text"],
			["border", "Border"],
			["input", "Input"],
			["ring", "Ring"],
		],
	},
];

// Core tokens map 1:1 to DocType fields. The extended groups below are saved
// as "extra tokens" JSON, so they must stay OUT of ALL_TOKEN_KEYS.
const ALL_TOKEN_KEYS = TOKEN_GROUPS.reduce(
	(acc, g) => acc.concat(g.tokens.map((t) => t[0])),
	[]
);

// Sidebar + chart tokens (shadcn_sidecar). Editable but persisted as extras.
const EXTENDED_GROUPS = [
	{
		title: "Sidebar",
		tokens: [
			["sidebar", "Sidebar"],
			["sidebar-foreground", "Sidebar Text"],
			["sidebar-primary", "Sidebar Primary"],
			["sidebar-primary-foreground", "Sidebar Primary Text"],
			["sidebar-accent", "Sidebar Accent"],
			["sidebar-accent-foreground", "Sidebar Accent Text"],
			["sidebar-border", "Sidebar Border"],
			["sidebar-ring", "Sidebar Ring"],
		],
	},
	{
		title: "Charts",
		tokens: [
			["chart-1", "Chart 1"],
			["chart-2", "Chart 2"],
			["chart-3", "Chart 3"],
			["chart-4", "Chart 4"],
			["chart-5", "Chart 5"],
		],
	},
];

const EXTENDED_TOKEN_KEYS = EXTENDED_GROUPS.reduce(
	(acc, g) => acc.concat(g.tokens.map((t) => t[0])),
	[]
);

// Foreground token -> the background token it sits on, for live contrast checks.
const CONTRAST_PAIRS = {
	foreground: "background",
	"card-foreground": "card",
	"popover-foreground": "popover",
	"primary-foreground": "primary",
	"secondary-foreground": "secondary",
	"muted-foreground": "muted",
	"accent-foreground": "accent",
	"destructive-foreground": "destructive",
	"sidebar-foreground": "sidebar",
	"sidebar-primary-foreground": "sidebar-primary",
	"sidebar-accent-foreground": "sidebar-accent",
};

class ThemeStudio {
	constructor(page) {
		this.page = page;
		this.themes = [];
		this.context = {};
		this.editing = null;
		this.previewOnDesk = false;
		this.gallery_query = "";
		this.gallery_filter = "all"; // all | Light | Dark | preset | custom
		this.show_extended = false;

		this.$body = $('<div class="theme-studio-page">').appendTo(page.body);
		this.setup_actions();
		this.refresh();
	}

	/** Sanitize a hex color for safe use in inline style attributes.
	 *  Returns a fallback if the value is not a valid 3- or 6-digit hex. */
	safe_color(v) {
		if (typeof v !== "string") return "#888888";
		var h = v.trim().replace(/^#/, "");
		if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
		return /^[0-9a-f]{6}$/i.test(h) ? "#" + h : "#888888";
	}

	setup_actions() {
		this.page.set_primary_action(
			__("New Theme"),
			() => this.open_editor(null),
			"add"
		);
		this.page.add_inner_button(__("Reset My Theme"), () => {
			frappe
				.call("theme_studio.api.reset_user_theme")
				.then((r) => {
					window.theme_studio.apply(r.message);
					frappe.show_alert({ message: __("Reverted to the site default."), indicator: "blue" });
					this.refresh();
				});
		});
		this.page.add_inner_button(__("Import Theme"), () => this.import_theme());
	}

	async refresh() {
		this.$body.html('<div class="ts-spinner">' + __("Loading themes…") + "</div>");
		const [themes, context] = await Promise.all([
			frappe.xcall("theme_studio.api.get_themes"),
			frappe.xcall("theme_studio.api.get_active_theme"),
		]);
		this.themes = themes || [];
		this.context = context || {};
		if (!this.editing) {
			const active = this.context.active && !this.context.active.disabled
				? this.themes.find((t) => t.name === this.context.active.name)
				: null;
			this.editing = this.clone_for_edit(active || this.themes[0]);
		}
		this.render();
	}

	render() {
		this.$body.empty();
		const $layout = $('<div class="ts-layout">').appendTo(this.$body);
		this.$left = $('<div>').appendTo($layout);
		this.$right = $('<div>').appendTo($layout);
		this.render_settings();
		this.render_gallery();
		this.render_editor();
	}

	/* ----------------------------------------------------------------- */
	/* Settings panel                                                    */
	/* ----------------------------------------------------------------- */
	render_settings() {
		const c = this.context;
		const $p = $(`
			<div class="ts-panel">
				<div class="ts-panel-head">
					<div class="ts-panel-title">${__("Workspace")}</div>
				</div>
				<div class="ts-panel-sub">${__("Control how themes apply across this site.")}</div>
				<div class="ts-toolbar">
					<label class="ts-btn" style="display:flex;gap:7px;align-items:center;">
						<input type="checkbox" class="ts-set-user" ${c.enable_user_themes ? "checked" : ""}/>
						${__("Per-user themes")}
					</label>
					<label class="ts-btn" style="display:flex;gap:7px;align-items:center;">
						<input type="checkbox" class="ts-set-disable" ${c.disable_theme ? "checked" : ""}/>
						${__("Disable theming")}
					</label>
				</div>
			</div>
		`).appendTo(this.$left);

		$p.find(".ts-set-user").on("change", (e) =>
			this.save_setting("enable_user_themes", e.target.checked ? 1 : 0)
		);
		$p.find(".ts-set-disable").on("change", (e) =>
			this.save_setting("disable_theme", e.target.checked ? 1 : 0)
		);
	}

	save_setting(field, value) {
		frappe.db
			.set_value("Theme Studio Settings", "Theme Studio Settings", field, value)
			.then(() => frappe.xcall("theme_studio.api.get_active_theme"))
			.then((ctx) => {
				this.context = ctx;
				window.theme_studio.apply(ctx.active);
				frappe.show_alert({ message: __("Settings updated."), indicator: "green" });
			});
	}

	/* ----------------------------------------------------------------- */
	/* Gallery                                                           */
	/* ----------------------------------------------------------------- */
	render_gallery() {
		const activeName = this.context.active && this.context.active.name;
		const FILTERS = [
			["all", __("All")],
			["Light", __("Light")],
			["Dark", __("Dark")],
			["preset", __("Presets")],
			["custom", __("Custom")],
		];
		const $p = $(`
			<div class="ts-panel">
				<div class="ts-panel-head">
					<div class="ts-panel-title">${__("Themes")}</div>
					<span class="ts-badge">${this.themes.length} ${__("total")}</span>
				</div>
				<div class="ts-panel-sub">${__("Hover to preview on the Desk, click Apply to keep it.")}</div>
				<div class="ts-gallery-controls">
					<input class="ts-input ts-search" type="search"
						placeholder="${__("Search themes…")}" value="${frappe.utils.escape_html(this.gallery_query)}"/>
					<div class="ts-filter-chips">
						${FILTERS.map(
							([val, label]) =>
								`<button class="ts-chip-btn ${this.gallery_filter === val ? "is-on" : ""}" data-filter="${val}">${label}</button>`
						).join("")}
					</div>
				</div>
				<div class="ts-grid"></div>
			</div>
		`).appendTo(this.$left);
		const $grid = $p.find(".ts-grid");

		$p.find(".ts-search").on("input", (e) => {
			this.gallery_query = e.target.value;
			this.render_gallery_cards($grid, activeName);
		});
		$p.find(".ts-chip-btn").on("click", (e) => {
			this.gallery_filter = e.currentTarget.dataset.filter;
			$p.find(".ts-chip-btn").removeClass("is-on");
			$(e.currentTarget).addClass("is-on");
			this.render_gallery_cards($grid, activeName);
		});

		this.render_gallery_cards($grid, activeName);
	}

	filtered_themes() {
		const q = (this.gallery_query || "").trim().toLowerCase();
		const f = this.gallery_filter;
		return this.themes.filter((theme) => {
			if (q && (theme.theme_name || "").toLowerCase().indexOf(q) === -1) return false;
			if (f === "Light" || f === "Dark") return theme.appearance === f;
			if (f === "preset") return !!theme.is_preset;
			if (f === "custom") return !theme.is_preset;
			return true;
		});
	}

	render_gallery_cards($grid, activeName) {
		$grid.empty();
		const themes = this.filtered_themes();

		if (!this.themes.length) {
			$grid.html('<div class="ts-empty">' + __("No themes yet.") + "</div>");
			return;
		}
		if (!themes.length) {
			$grid.html('<div class="ts-empty">' + __("No themes match your filters.") + "</div>");
			return;
		}

		themes.forEach((theme) => {
			const t = theme.tokens || {};
			const isActive = theme.name === activeName;
			const bg = this.safe_color(t.background);
			const primary = this.safe_color(t.primary);
			const primaryFg = this.safe_color(t["primary-foreground"]);
			const muted = this.safe_color(t.muted);
			const secondary = this.safe_color(t.secondary);
			const accent = this.safe_color(t.accent);
			const destructive = this.safe_color(t.destructive);
			const border = this.safe_color(t.border);
			const $card = $(`
				<div class="ts-card ${isActive ? "is-active" : ""}" data-name="${frappe.utils.escape_html(theme.name)}">
					<div class="ts-card-preview" style="background:${bg};">
						<div class="ts-card-bar">
							<span class="ts-chip" style="background:${primary};color:${primaryFg};">Aa</span>
							<span class="ts-pill" style="flex:1;background:${muted};"></span>
						</div>
						<div class="ts-card-bar">
							<span class="ts-dot" style="background:${primary};"></span>
							<span class="ts-dot" style="background:${secondary};"></span>
							<span class="ts-dot" style="background:${accent};"></span>
							<span class="ts-dot" style="background:${destructive};"></span>
							<span class="ts-pill" style="flex:1;height:8px;background:${border};"></span>
						</div>
					</div>
					<div class="ts-card-meta">
						<span class="ts-card-name">${frappe.utils.escape_html(theme.theme_name)}
							${isActive ? '<span class="ts-active-tag">• ' + __("Active") + "</span>" : ""}
						</span>
						<span class="ts-badge">${theme.appearance}${theme.is_preset ? " · " + __("Preset") : ""}</span>
					</div>
					<div class="ts-card-actions"></div>
				</div>
			`);

			const $actions = $card.find(".ts-card-actions");
			$('<button class="ts-btn ts-btn-primary ts-btn-sm">' + __("Apply") + "</button>")
				.appendTo($actions)
				.on("click", (e) => {
					e.stopPropagation();
					this.apply_theme(theme, "user");
				});

			if (this.context.can_manage) {
				$('<button class="ts-btn ts-btn-sm">' + __("Set Site Default") + "</button>")
					.appendTo($actions)
					.on("click", (e) => {
						e.stopPropagation();
						this.apply_theme(theme, "site");
					});
			}

			$('<button class="ts-btn ts-btn-sm">' + (theme.is_preset ? __("Duplicate") : __("Edit")) + "</button>")
				.appendTo($actions)
				.on("click", (e) => {
					e.stopPropagation();
					theme.is_preset ? this.duplicate_theme(theme) : this.open_editor(theme);
				});

			$('<button class="ts-btn ts-btn-sm">' + __("Export") + "</button>")
				.appendTo($actions)
				.on("click", (e) => {
					e.stopPropagation();
					this.export_theme(theme);
				});

			if (!theme.is_preset && this.context.can_manage) {
				$('<button class="ts-btn ts-btn-danger ts-btn-sm">' + __("Delete") + "</button>")
					.appendTo($actions)
					.on("click", (e) => {
						e.stopPropagation();
						this.delete_theme(theme);
					});
			}

			// Hover previews the theme on the desk; click applies it permanently.
			$card
				.on("mouseenter", () => window.theme_studio.preview(this.payload_of(theme)))
				.on("mouseleave", () => window.theme_studio.cancelPreview())
				.on("click", () => {
					// A click on the card body (not a button) applies the theme
					// immediately — the theme takes effect on hover and is
					// committed on click, matching the "apply on press" request.
					this.apply_theme(theme, "user");
				});

			$grid.append($card);
		});
	}

	/* ----------------------------------------------------------------- */
	/* Editor                                                            */
	/* ----------------------------------------------------------------- */
	render_editor() {
		const e = this.editing;
		const isPreset = e && e.is_preset;
		const title = e && e.name ? e.theme_name : __("New Theme");

		const $p = $(`
			<div class="ts-panel">
				<div class="ts-panel-head">
					<div class="ts-panel-title">${__("Editor")} · ${frappe.utils.escape_html(title)}</div>
					<label class="ts-badge" style="cursor:pointer;display:flex;gap:6px;align-items:center;">
						<input type="checkbox" class="ts-preview-toggle" ${this.previewOnDesk ? "checked" : ""}/>
						${__("Live preview on Desk")}
					</label>
				</div>
				<div class="ts-panel-sub">
					${isPreset
						? __("This is a read-only preset. Duplicate it to make changes.")
						: __("Tune the tokens below. The mock and (optionally) the Desk update live.")}
				</div>
				<div class="ts-row">
					<div class="ts-field">
						<label class="ts-label">${__("Theme Name")}</label>
						<input class="ts-input ts-f-name" value="${frappe.utils.escape_html(e ? e.theme_name : "")}" ${isPreset ? "disabled" : ""}/>
					</div>
					<div class="ts-field">
						<label class="ts-label">${__("Appearance")}</label>
						<select class="ts-input ts-f-appearance" ${isPreset ? "disabled" : ""}>
							<option value="Light">${__("Light")}</option>
							<option value="Dark">${__("Dark")}</option>
						</select>
					</div>
				</div>
				<div class="ts-row">
					<div class="ts-field">
						<label class="ts-label">${__("Font Family")}</label>
						<input class="ts-input ts-f-font" value="${frappe.utils.escape_html(e ? e.font_family || "" : "")}" ${isPreset ? "disabled" : ""}/>
					</div>
					<div class="ts-field">
						<label class="ts-label">${__("Radius")}</label>
						<input class="ts-input ts-f-radius" value="${frappe.utils.escape_html(e ? e.radius || "" : "")}" ${isPreset ? "disabled" : ""}/>
					</div>
				</div>
				<div class="ts-smart ${isPreset ? "is-disabled" : ""}">
					<div class="ts-smart-head">
						<div>
							<div class="ts-group-title" style="margin:0;">${__("Smart Generate")}</div>
							<div class="ts-smart-sub">${__("Pick one primary color — we build the whole palette in OKLCH.")}</div>
						</div>
					</div>
					<div class="ts-smart-row">
						<label class="ts-smart-swatch" title="${__("Primary color")}">
							<input type="color" class="ts-gen-primary" value="${frappe.utils.escape_html(e ? e.primary_seed || "#18181b" : "#18181b")}" ${isPreset ? "disabled" : ""}/>
						</label>
						<input class="ts-input ts-gen-hex" value="${frappe.utils.escape_html(e ? e.primary_seed || "#18181b" : "#18181b")}" ${isPreset ? "disabled" : ""}/>
						<button class="ts-btn ts-btn-primary ts-gen-btn" ${isPreset ? "disabled" : ""}>${__("Generate Palette")}</button>
						<button class="ts-btn ts-gendark-btn" ${isPreset ? "disabled" : ""}>${__("Save Matching Dark")}</button>
					</div>
				</div>
				<div class="ts-tokens"></div>
				<div class="ts-toolbar" style="margin-top:18px;">
					${isPreset
						? '<button class="ts-btn ts-btn-primary ts-dup-btn">' + __("Duplicate to Edit") + "</button>"
						: '<button class="ts-btn ts-btn-primary ts-save-btn">' + __("Save Theme") + "</button>"}
					${!isPreset ? '<button class="ts-btn ts-saveapply-btn">' + __("Save & Apply") + "</button>" : ""}
					<button class="ts-btn ts-revert-btn">${__("Reset Fields")}</button>
					<button class="ts-btn ts-copycss-btn">${__("Copy CSS")}</button>
					<button class="ts-btn ts-exportcur-btn">${__("Export JSON")}</button>
				</div>
			</div>
		`).appendTo(this.$right);

		$p.find(".ts-f-appearance").val(e ? e.appearance : "Light");

		// token pickers
		const $tokens = $p.find(".ts-tokens");
		TOKEN_GROUPS.forEach((group) => this.render_token_group($tokens, group, isPreset));

		// Collapsible extended group (sidebar + chart tokens, saved as extras).
		const $extWrap = $('<div class="ts-ext-wrap">').appendTo($tokens);
		const $extToggle = $(
			'<button class="ts-ext-toggle">' +
				(this.show_extended ? "▾ " : "▸ ") +
				__("Sidebar & Chart Colors") +
				"</button>"
		).appendTo($extWrap);
		const $extBody = $('<div class="ts-ext-body">').appendTo($extWrap);
		if (!this.show_extended) $extBody.hide();
		EXTENDED_GROUPS.forEach((group) => this.render_token_group($extBody, group, isPreset));
		$extToggle.on("click", () => {
			this.show_extended = !this.show_extended;
			$extBody.toggle(this.show_extended);
			$extToggle.text((this.show_extended ? "▾ " : "▸ ") + __("Sidebar & Chart Colors"));
		});

		// the live mock
		this.$mock = $('<div style="margin-top:18px;">').appendTo($p);
		this.render_mock();

		// field bindings
		$p.find(".ts-f-name").on("input", (ev) => (this.editing.theme_name = ev.target.value));
		$p.find(".ts-f-appearance").on("change", (ev) => {
			this.editing.appearance = ev.target.value;
			this.refresh_live();
		});
		$p.find(".ts-f-font").on("input", (ev) => {
			this.editing.font_family = ev.target.value;
			this.refresh_live();
		});
		$p.find(".ts-f-radius").on("input", (ev) => {
			this.editing.radius = ev.target.value;
			this.refresh_live();
		});
		$p.find(".ts-preview-toggle").on("change", (ev) => {
			this.previewOnDesk = ev.target.checked;
			this.previewOnDesk
				? window.theme_studio.preview(this.payload_of(this.editing))
				: window.theme_studio.cancelPreview();
		});

		// Smart Generate bindings.
		const $genColor = $p.find(".ts-gen-primary");
		const $genHex = $p.find(".ts-gen-hex");
		$genColor.on("input", () => {
			$genHex.val($genColor.val());
			this.editing.primary_seed = $genColor.val();
		});
		$genHex.on("change", () => {
			const v = $genHex.val().trim();
			if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
				$genColor.val(v);
				this.editing.primary_seed = v;
			}
		});
		$p.find(".ts-gen-btn").on("click", () => this.generate_palette());
		$p.find(".ts-gendark-btn").on("click", () => this.generate_dark_theme());

		$p.find(".ts-save-btn").on("click", () => this.save_theme(false));
		$p.find(".ts-saveapply-btn").on("click", () => this.save_theme(true));
		$p.find(".ts-dup-btn").on("click", () => this.duplicate_theme(this.editing));
		$p.find(".ts-revert-btn").on("click", () => {
			const original = this.themes.find((t) => t.name === this.editing.name);
			this.editing = this.clone_for_edit(original);
			this.render();
		});
		$p.find(".ts-copycss-btn").on("click", () => this.copy_css(this.editing));
		$p.find(".ts-exportcur-btn").on("click", () => this.export_theme(this.editing));
	}

	/** Render one labelled grid of color tokens with live contrast badges. */
	render_token_group($parent, group, isPreset) {
		$('<div class="ts-group-title">' + __(group.title) + "</div>").appendTo($parent);
		const $g = $('<div class="ts-token-grid">').appendTo($parent);
		group.tokens.forEach(([key, label]) => {
			const val = (this.editing && this.editing.tokens && this.editing.tokens[key]) || "#888888";
			const $tok = $(`
				<div class="ts-token" data-token="${key}">
					<input type="color" value="${val}" ${isPreset ? "disabled" : ""}/>
					<div class="ts-token-body">
						<span class="ts-token-name">${__(label)}</span>
						<input class="ts-token-hex" value="${val}" ${isPreset ? "disabled" : ""}/>
					</div>
					<span class="ts-contrast" data-for="${key}"></span>
				</div>
			`);
			const $color = $tok.find('input[type="color"]');
			const $hex = $tok.find(".ts-token-hex");
			$color.on("input", () => {
				$hex.val($color.val());
				this.on_token_change(key, $color.val());
			});
			$hex.on("change", () => {
				const v = $hex.val().trim();
				if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
					$color.val(v);
					this.on_token_change(key, v);
				}
			});
			$g.append($tok);
		});
		this.update_contrast_badges($parent);
	}

	/** Update WCAG contrast badges for any foreground tokens shown in $scope. */
	update_contrast_badges($scope) {
		const engine = window.theme_studio_color;
		const tokens = (this.editing && this.editing.tokens) || {};
		const $root = $scope || this.$right;
		$root.find(".ts-contrast").each((_, el) => {
			const $b = $(el);
			const fgKey = $b.data("for");
			const bgKey = CONTRAST_PAIRS[fgKey];
			if (!engine || !bgKey || !tokens[fgKey] || !tokens[bgKey]) {
				$b.hide();
				return;
			}
			const ratio = engine.contrastRatio(tokens[fgKey], tokens[bgKey]);
			const level = engine.wcagLevel(ratio, false);
			$b.show()
				.attr("class", "ts-contrast ts-contrast-" + level.toLowerCase())
				.attr("title", __("Contrast vs {0}: {1}:1 ({2})", [bgKey, ratio.toFixed(2), level]))
				.text(level === "Fail" ? "✕ " + ratio.toFixed(1) : level + " " + ratio.toFixed(1));
		});
	}

	render_mock() {
		const t = this.editing ? this.editing.tokens : {};
		const e = this.editing || {};
		const v = (k, fb) => t[k] || fb;
		const style = [
			["--mk-background", v("background", "#fff")],
			["--mk-foreground", v("foreground", "#09090b")],
			["--mk-card", v("card", "#fff")],
			["--mk-card-fg", v("card-foreground", "#09090b")],
			["--mk-primary", v("primary", "#18181b")],
			["--mk-primary-fg", v("primary-foreground", "#fafafa")],
			["--mk-secondary", v("secondary", "#f4f4f5")],
			["--mk-secondary-fg", v("secondary-foreground", "#18181b")],
			["--mk-muted", v("muted", "#f4f4f5")],
			["--mk-muted-fg", v("muted-foreground", "#71717a")],
			["--mk-accent", v("accent", "#f4f4f5")],
			["--mk-accent-fg", v("accent-foreground", "#18181b")],
			["--mk-destructive", v("destructive", "#ef4444")],
			["--mk-destructive-fg", v("destructive-foreground", "#fafafa")],
			["--mk-border", v("border", "#e4e4e7")],
			["--mk-input", v("input", "#e4e4e7")],
			["--mk-ring", v("ring", "#a1a1aa")],
			["--mk-radius", e.radius || "0.5rem"],
			["--mk-font", e.font_family || "Inter"],
		]
			.map(([k, val]) => `${k}:${val}`)
			.join(";");

		this.$mock.html(`
			<div class="ts-group-title">${__("Live Preview")}</div>
			<div class="ts-mock" style="${style}">
				<div class="ts-mock-top">
					<strong style="font-size:13px;">${__("Dashboard")}</strong>
					<span class="ts-mock-badge">${__("Active")}</span>
				</div>
				<div class="ts-mock-body">
					<div class="ts-mock-side">
						<div class="ts-mock-nav active">${__("Overview")}</div>
						<div class="ts-mock-nav">${__("Reports")}</div>
						<div class="ts-mock-nav">${__("Settings")}</div>
					</div>
					<div class="ts-mock-main">
						<div class="ts-mock-card">
							<div style="font-weight:600;font-size:13px;margin-bottom:4px;">${__("Welcome back")}</div>
							<div class="ts-mock-muted">${__("Here is what is happening today.")}</div>
						</div>
						<div class="ts-mock-row">
							<button class="ts-mock-btn primary">${__("Primary")}</button>
							<button class="ts-mock-btn secondary">${__("Secondary")}</button>
							<button class="ts-mock-btn outline">${__("Outline")}</button>
							<button class="ts-mock-btn destructive">${__("Delete")}</button>
						</div>
						<input class="ts-mock-input ts-mock-ring" placeholder="${__("Focused input…")}"/>
					</div>
				</div>
			</div>
		`);
	}

	/* ----------------------------------------------------------------- */
	/* Behaviour                                                         */
	/* ----------------------------------------------------------------- */
	on_token_change(key, value) {
		this.editing.tokens[key] = value;
		this.update_contrast_badges();
		this.refresh_live();
	}

	/** Build a complete token set from the chosen primary color (OKLCH). */
	generate_palette() {
		const engine = window.theme_studio_color;
		if (!engine) {
			frappe.msgprint(__("Color engine is not loaded yet — please reload the page."));
			return;
		}
		const primary = (this.editing.primary_seed || "#18181b").trim();
		if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(primary)) {
			frappe.msgprint(__("Please enter a valid primary color (e.g. #2563eb)."));
			return;
		}
		const generated = engine.generate(primary, this.editing.appearance || "Light");
		// Replace every token (core + sidebar-* + chart-*) with the generated set.
		this.editing.tokens = Object.assign({}, this.editing.tokens, generated);
		this.editing.primary_seed = primary;
		frappe.show_alert({
			message: __("Generated a {0} palette from {1}.", [
				(this.editing.appearance || "Light").toLowerCase(),
				primary,
			]),
			indicator: "green",
		});
		// Re-render so the token grid reflects the new values, then live-preview.
		this.render();
		if (this.previewOnDesk) {
			window.theme_studio.preview(this.payload_of(this.editing));
		}
	}

	/** Create and persist a matching dark theme from the same primary color. */
	generate_dark_theme() {
		const engine = window.theme_studio_color;
		if (!engine) {
			frappe.msgprint(__("Color engine is not loaded yet — please reload the page."));
			return;
		}
		const primary = (this.editing.primary_seed || "#18181b").trim();
		if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(primary)) {
			frappe.msgprint(__("Please enter a valid primary color first."));
			return;
		}
		const baseName = (this.editing.theme_name || __("Custom Theme")).replace(/\s*Dark$/i, "").trim();
		const tokens = engine.generate(primary, "Dark");
		const extras = {};
		Object.keys(tokens).forEach((k) => {
			if (ALL_TOKEN_KEYS.indexOf(k) === -1) extras[k] = tokens[k];
		});
		const darkTheme = {
			name: null,
			theme_name: baseName + " Dark",
			appearance: "Dark",
			font_family: this.editing.font_family || "Inter",
			radius: this.editing.radius || "0.5rem",
			is_preset: 0,
			tokens,
			tokens_json: Object.keys(extras).length ? JSON.stringify(extras, null, 2) : "",
		};
		frappe
			.xcall("theme_studio.api.save_theme", { theme: JSON.stringify(darkTheme) })
			.then((saved) => {
				frappe.show_alert({
					message: __("Saved matching dark theme “{0}”.", [saved.theme_name]),
					indicator: "green",
				});
				this.refresh();
			});
	}

	refresh_live() {
		this.render_mock();
		if (this.previewOnDesk) {
			window.theme_studio.preview(this.payload_of(this.editing));
		}
	}

	open_editor(theme) {
		this.editing = this.clone_for_edit(theme);
		this.render();
		this.$right[0].scrollIntoView({ behavior: "smooth", block: "start" });
	}

	clone_for_edit(theme) {
		if (!theme) {
			// New theme seeded from a clean light base.
			const seed = this.themes.find((t) => t.name === "Shadcn Light") || this.themes[0];
			const tokens = {};
			ALL_TOKEN_KEYS.concat(EXTENDED_TOKEN_KEYS).forEach(
				(k) => (tokens[k] = (seed && seed.tokens[k]) || "#888888")
			);
			return {
				name: null,
				theme_name: "",
				appearance: "Light",
				font_family: (seed && seed.font_family) || "Inter",
				radius: (seed && seed.radius) || "0.5rem",
				is_preset: 0,
				primary_seed: tokens["primary"] || "#18181b",
				tokens,
			};
		}
		const tokens = {};
		// Core tokens (always shown in the grid).
		ALL_TOKEN_KEYS.forEach((k) => (tokens[k] = (theme.tokens && theme.tokens[k]) || "#888888"));
		// Preserve any generated extras (sidebar-*, chart-*, …) so previews and
		// re-saves keep them intact.
		if (theme.tokens) {
			Object.keys(theme.tokens).forEach((k) => {
				if (ALL_TOKEN_KEYS.indexOf(k) === -1 && k !== "radius" && k !== "font-family") {
					tokens[k] = theme.tokens[k];
				}
			});
		}
		return {
			name: theme.name,
			theme_name: theme.theme_name,
			appearance: theme.appearance,
			font_family: theme.font_family,
			radius: theme.radius,
			is_preset: theme.is_preset,
			primary_seed: tokens["primary"] || "#18181b",
			tokens,
		};
	}

	payload_of(theme) {
		const tokens = Object.assign({}, theme.tokens);
		tokens["radius"] = theme.radius || "0.5rem";
		if (theme.font_family) tokens["font-family"] = theme.font_family;
		return { appearance: theme.appearance, tokens, disabled: false };
	}

	apply_theme(theme, scope) {
		window.theme_studio
			.setTheme(theme.name, scope)
			.then(() => {
				frappe.show_alert({
					message: scope === "site" ? __("Set as site default.") : __("Theme applied."),
					indicator: "green",
				});
				this.context.active = this.payload_of(theme);
				this.context.active.name = theme.name;
				this.previewOnDesk = false;
				this.render();
			});
	}

	save_theme(andApply) {
		const e = this.editing;
		if (!e.theme_name || !e.theme_name.trim()) {
			frappe.msgprint(__("Please enter a theme name."));
			return;
		}
		// Persist generated extras (sidebar-*, chart-*, …) via the JSON field.
		const extras = {};
		Object.keys(e.tokens || {}).forEach((k) => {
			if (ALL_TOKEN_KEYS.indexOf(k) === -1 && k !== "radius" && k !== "font-family") {
				extras[k] = e.tokens[k];
			}
		});
		const payload = Object.assign({}, e, {
			tokens_json: Object.keys(extras).length ? JSON.stringify(extras, null, 2) : "",
		});
		frappe
			.xcall("theme_studio.api.save_theme", { theme: JSON.stringify(payload) })
			.then((saved) => {
				frappe.show_alert({ message: __("Saved “{0}”.", [saved.theme_name]), indicator: "green" });
				this.editing = this.clone_for_edit(saved);
				if (andApply) {
					return window.theme_studio.setTheme(saved.name, "user").then(() => saved);
				}
				return saved;
			})
			.then(() => this.refresh());
	}

	duplicate_theme(theme) {
		frappe.prompt(
			{
				fieldname: "new_name",
				label: __("New theme name"),
				fieldtype: "Data",
				reqd: 1,
				default: theme.theme_name + " Copy",
			},
			(values) => {
				frappe
					.xcall("theme_studio.api.duplicate_theme", {
						theme_name: theme.name,
						new_name: values.new_name,
					})
					.then((clone) => {
						frappe.show_alert({ message: __("Theme duplicated."), indicator: "green" });
						this.editing = this.clone_for_edit(clone);
						this.refresh();
					});
			},
			__("Duplicate Theme"),
			__("Create")
		);
	}

	delete_theme(theme) {
		frappe.confirm(__("Delete the theme “{0}”?", [theme.theme_name]), () => {
			frappe
				.xcall("theme_studio.api.delete_theme", { theme_name: theme.name })
				.then(() => {
					frappe.show_alert({ message: __("Theme deleted."), indicator: "red" });
					if (this.editing && this.editing.name === theme.name) this.editing = null;
					this.refresh();
				});
		});
	}

	/* ----------------------------------------------------------------- */
	/* Export / Import / Copy CSS                                        */
	/* ----------------------------------------------------------------- */

	/** A portable, version-tagged representation of a theme. */
	export_payload(theme) {
		const tokens = Object.assign({}, theme.tokens || {});
		tokens["radius"] = theme.radius || tokens["radius"] || "0.5rem";
		if (theme.font_family) tokens["font-family"] = theme.font_family;
		return {
			$schema: "theme-studio/theme",
			version: 1,
			theme_name: theme.theme_name || theme.name || "Custom Theme",
			appearance: theme.appearance || "Light",
			font_family: theme.font_family || "Inter",
			radius: theme.radius || "0.5rem",
			tokens,
		};
	}

	/** Trigger a JSON file download for a theme. */
	export_theme(theme) {
		const data = this.export_payload(theme);
		const json = JSON.stringify(data, null, 2);
		const slug = (data.theme_name || "theme")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "");
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = (slug || "theme") + ".theme.json";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		frappe.show_alert({ message: __("Exported “{0}”.", [data.theme_name]), indicator: "green" });
	}

	/** Copy the theme tokens as a ready-to-paste CSS :root block. */
	copy_css(theme) {
		const data = this.export_payload(theme);
		const lines = Object.keys(data.tokens)
			.sort()
			.map((k) => "  --" + k + ": " + data.tokens[k] + ";");
		const selector = data.appearance === "Dark" ? ".dark, :root" : ":root";
		const css = "/* " + data.theme_name + " */\n" + selector + " {\n" + lines.join("\n") + "\n}\n";
		frappe.utils.copy_to_clipboard(css);
		frappe.show_alert({ message: __("Copied CSS variables to clipboard."), indicator: "green" });
	}

	/** Import a theme from a .json file and persist it as a new custom theme. */
	import_theme() {
		if (!this.context.can_manage) {
			frappe.msgprint(__("Only System Managers can import themes."));
			return;
		}
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "application/json,.json";
		input.addEventListener("change", () => {
			const file = input.files && input.files[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = () => {
				let parsed;
				try {
					parsed = JSON.parse(reader.result);
				} catch (err) {
					frappe.msgprint(__("That file is not valid JSON."));
					return;
				}
				frappe
					.xcall("theme_studio.api.import_theme", { theme: JSON.stringify(parsed) })
					.then((saved) => {
						frappe.show_alert({
							message: __("Imported “{0}”.", [saved.theme_name]),
							indicator: "green",
						});
						this.editing = this.clone_for_edit(saved);
						this.refresh();
					});
			};
			reader.readAsText(file);
		});
		input.click();
	}
}
