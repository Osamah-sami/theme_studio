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

const ALL_TOKEN_KEYS = TOKEN_GROUPS.reduce(
	(acc, g) => acc.concat(g.tokens.map((t) => t[0])),
	[]
);

class ThemeStudio {
	constructor(page) {
		this.page = page;
		this.themes = [];
		this.context = {};
		this.editing = null;
		this.previewOnDesk = false;

		this.$body = $('<div class="theme-studio-page">').appendTo(page.body);
		this.setup_actions();
		this.refresh();
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
		const $p = $(`
			<div class="ts-panel">
				<div class="ts-panel-head">
					<div class="ts-panel-title">${__("Themes")}</div>
					<span class="ts-badge">${this.themes.length} ${__("total")}</span>
				</div>
				<div class="ts-panel-sub">${__("Hover to preview on the Desk, click Apply to keep it.")}</div>
				<div class="ts-grid"></div>
			</div>
		`).appendTo(this.$left);
		const $grid = $p.find(".ts-grid");

		if (!this.themes.length) {
			$grid.replaceWith('<div class="ts-empty">' + __("No themes yet.") + "</div>");
			return;
		}

		this.themes.forEach((theme) => {
			const t = theme.tokens || {};
			const isActive = theme.name === activeName;
			const $card = $(`
				<div class="ts-card ${isActive ? "is-active" : ""}" data-name="${frappe.utils.escape_html(theme.name)}">
					<div class="ts-card-preview" style="background:${t.background};">
						<div class="ts-card-bar">
							<span class="ts-chip" style="background:${t.primary};color:${t["primary-foreground"]};">Aa</span>
							<span class="ts-pill" style="flex:1;background:${t.muted};"></span>
						</div>
						<div class="ts-card-bar">
							<span class="ts-dot" style="background:${t.primary};"></span>
							<span class="ts-dot" style="background:${t.secondary};"></span>
							<span class="ts-dot" style="background:${t.accent};"></span>
							<span class="ts-dot" style="background:${t.destructive};"></span>
							<span class="ts-pill" style="flex:1;height:8px;background:${t.border};"></span>
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

			if (!theme.is_preset && this.context.can_manage) {
				$('<button class="ts-btn ts-btn-danger ts-btn-sm">' + __("Delete") + "</button>")
					.appendTo($actions)
					.on("click", (e) => {
						e.stopPropagation();
						this.delete_theme(theme);
					});
			}

			// Hover preview on the actual desk.
			$card
				.on("mouseenter", () => window.theme_studio.preview(this.payload_of(theme)))
				.on("mouseleave", () => window.theme_studio.cancelPreview())
				.on("click", () => this.open_editor(theme));

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
				</div>
			</div>
		`).appendTo(this.$right);

		$p.find(".ts-f-appearance").val(e ? e.appearance : "Light");

		// token pickers
		const $tokens = $p.find(".ts-tokens");
		TOKEN_GROUPS.forEach((group) => {
			$('<div class="ts-group-title">' + __(group.title) + "</div>").appendTo($tokens);
			const $g = $('<div class="ts-token-grid">').appendTo($tokens);
			group.tokens.forEach(([key, label]) => {
				const val = (e && e.tokens && e.tokens[key]) || "#888888";
				const $tok = $(`
					<div class="ts-token">
						<input type="color" value="${val}" ${isPreset ? "disabled" : ""}/>
						<div class="ts-token-body">
							<span class="ts-token-name">${__(label)}</span>
							<input class="ts-token-hex" value="${val}" ${isPreset ? "disabled" : ""}/>
						</div>
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
			ALL_TOKEN_KEYS.forEach((k) => (tokens[k] = (seed && seed.tokens[k]) || "#888888"));
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
}
