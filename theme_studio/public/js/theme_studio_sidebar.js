/* =========================================================================
   Theme Studio — Dual Sidebar (Workspace Rail + Panel)
   -------------------------------------------------------------------------
   Builds a Shadcn-styled dual sidebar for the Frappe v16 Desk:

       [ Workspace Rail ]  [ Sidebar Panel ]  [ Main Content ]
         small / icons        large / labels

   • The rail reads workspaces from `frappe.boot.desktop_icons` and lets you
     switch the active sidebar panel by clicking an icon.
   • A small rail (icons only) expands into a large rail (icons + labels);
     the state is remembered in localStorage.
   • Everything is plain DOM with `ts-*` class names. The look (colours,
     radius, borders) comes entirely from the `--ts-sidebar-*` design tokens
     in `shadcn_sidebar.css`, so the active Theme Studio theme is applied to
     the sidebar just like every other Desk surface.

   This only activates on Frappe v16's new desk shell (`.body-sidebar-container`).
   On older builds the markup simply never gets created, so nothing breaks.
   ========================================================================= */
(function () {
	"use strict";

	if (typeof frappe === "undefined") return;

	frappe.provide("theme_studio.dual_sidebar");

	var RAIL_STATE_KEY = "ts_rail_expanded";

	var ds = (theme_studio.dual_sidebar = {
		rail_built: false,
		_listeners_bound: false,

		/* The dual sidebar is part of the theme, so it only activates while a
		   Theme Studio theme is applied (boot loader sets data-theme-studio). */
		theme_active: function () {
			return document.documentElement.hasAttribute("data-theme-studio");
		},

		init: function () {
			// Only the v16 desk shell ships the dual-pane sidebar container.
			if (!document.querySelector(".body-sidebar-container")) return;
			if (!frappe.app || !frappe.app.sidebar) return;

			if (!this._listeners_bound) {
				this.listen_for_changes();
				this.watch_theme_toggle();
				this._listeners_bound = true;
			}

			if (!this.theme_active()) {
				this.teardown();
				return;
			}

			this.restore_rail_state();
			this.build_workspace_rail();
			this.toggle_rail_visibility();
		},

		/* Hide the rail and undo layout classes when theming is turned off. */
		teardown: function () {
			if (this.$rail) this.$rail.hide();
			if (this.$backdrop) this.$backdrop.removeClass("visible");
			$("body").removeClass("ts-dual-sidebar");
			$("body > .ts-rail-tooltip").removeClass("visible");
		},

		/* Re-run init whenever the boot loader toggles data-theme-studio so the
		   rail appears on Apply/Preview and disappears on Disable/Reset. */
		watch_theme_toggle: function () {
			var me = this;
			if (typeof MutationObserver === "undefined") return;
			new MutationObserver(function () {
				me.init();
			}).observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["data-theme-studio"],
			});
		},

		/* ===== Workspace rail ============================================ */

		build_workspace_rail: function () {
			if (this.rail_built) return;

			var workspaces = this.get_workspaces();
			if (!workspaces.length) return;

			var me = this;
			var icons_html = "";
			workspaces.forEach(function (ws) {
				var icon_content = me.get_icon_for_workspace(ws);
				var label = frappe.utils.escape_html(ws.label);
				icons_html +=
					'<div class="ts-rail-item" data-workspace="' + label + '"' +
					' role="button" tabindex="0" aria-label="' + label + '">' +
					'<div class="ts-rail-icon">' + icon_content + "</div>" +
					'<span class="ts-rail-label">' + label + "</span>" +
					'<span class="ts-rail-tooltip">' + label + "</span>" +
					"</div>";
			});

			var search_svg =
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
			var chevrons_svg =
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/></svg>';

			this.$rail = $(
				'<nav class="ts-workspace-rail" role="navigation" aria-label="' + __("Workspaces") + '">' +
					'<div class="ts-rail-search">' +
						'<div class="ts-rail-search-btn" role="button" tabindex="0" aria-label="' + __("Search workspaces") + '" title="' + __("Search workspaces") + '">' + search_svg + "</div>" +
						'<div class="ts-rail-search-box">' + search_svg +
							'<input type="text" placeholder="' + __("Search") + '" spellcheck="false" aria-label="' + __("Search workspaces") + '">' +
							'<span class="ts-rail-search-clear" role="button" tabindex="0" aria-label="' + __("Clear") + '" title="' + __("Clear") + '">&times;</span>' +
						"</div>" +
					"</div>" +
					'<div class="ts-rail-top">' + icons_html + "</div>" +
					'<div class="ts-rail-empty">' + __("No workspaces found") + "</div>" +
					'<div class="ts-rail-bottom">' +
						'<div class="ts-rail-toggle" role="button" tabindex="0" aria-label="' + __("Expand or collapse sidebar") + '" aria-expanded="false" title="' + __("Expand / collapse (Ctrl/Cmd + B)") + '">' + chevrons_svg + "</div>" +
					"</div>" +
					'<div class="ts-rail-resizer" aria-hidden="true"></div>' +
				"</nav>"
			);

			this.$backdrop = $('<div class="ts-rail-backdrop" aria-hidden="true"></div>');

			$(".body-sidebar-container").before(this.$rail);
			$("body").append(this.$backdrop);
			this.$backdrop.on("click", function () {
				me.set_rail_expanded(false);
			});

			this.$rail.find(".ts-rail-item").on("click", function () {
				me.switch_workspace($(this).data("workspace"));
			});

			// Keyboard: Enter/Space activates any role="button" element in the rail.
			this.$rail.on("keydown", '[role="button"]', function (e) {
				if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
					e.preventDefault();
					$(this).trigger("click");
				}
			});

			// Tooltips live on <body> so they escape the rail's overflow clip.
			this.$rail.find(".ts-rail-tooltip").each(function () {
				$(this).appendTo("body");
			});

			this.$rail
				.find(".ts-rail-item")
				.on("mouseenter", function () {
					if (document.body.classList.contains("ts-rail-expanded")) return;
					var label = $(this).data("workspace");
					var $tip = $("body > .ts-rail-tooltip").filter(function () {
						return $(this).text().trim() === label;
					});
					if (!$tip.length) return;
					var rect = this.getBoundingClientRect();
					$tip
						.css({
							top: rect.top + rect.height / 2 - $tip.outerHeight() / 2,
							left: rect.right + 10,
						})
						.addClass("visible");
				})
				.on("mouseleave", function () {
					$("body > .ts-rail-tooltip").removeClass("visible");
				});

			this.setup_rail_search();
			this.setup_rail_toggle();
			this.setup_rail_resizer();

			this.rail_built = true;
			this.update_rail_active();
		},

		/* ===== Expand / collapse + search ================================ */

		restore_rail_state: function () {
			var expanded = false;
			try {
				expanded = localStorage.getItem(RAIL_STATE_KEY) === "1";
			} catch (e) {
				/* localStorage unavailable — stay collapsed */
			}
			$("body").toggleClass("ts-rail-expanded", expanded);
		},

		set_rail_expanded: function (expanded) {
			$("body").toggleClass("ts-rail-expanded", !!expanded);
			try {
				localStorage.setItem(RAIL_STATE_KEY, expanded ? "1" : "0");
			} catch (e) {
				/* non-persistent, still works for the session */
			}
			$("body > .ts-rail-tooltip").removeClass("visible");
			if (this.$rail) {
				this.$rail
					.find(".ts-rail-toggle")
					.attr("aria-expanded", expanded ? "true" : "false");
			}
			if (!expanded && this.$rail) {
				this.$rail.find(".ts-rail-search-box input").val("");
				this.filter_rail("");
			}
		},

		setup_rail_toggle: function () {
			var me = this;
			this.$rail.find(".ts-rail-toggle").on("click", function () {
				me.set_rail_expanded(!$("body").hasClass("ts-rail-expanded"));
			});
		},

		setup_rail_search: function () {
			var me = this;
			var $input = this.$rail.find(".ts-rail-search-box input");

			this.$rail.find(".ts-rail-search-btn").on("click", function () {
				me.set_rail_expanded(true);
				setTimeout(function () {
					$input.trigger("focus");
				}, 220);
			});

			$input.on("input", function () {
				me.filter_rail($input.val());
			});

			$input.on("keydown", function (e) {
				if (e.key === "Escape") {
					$input.val("");
					me.filter_rail("");
					$input.trigger("blur");
				} else if (e.key === "Enter") {
					var $first = me.$rail.find(".ts-rail-item:not(.ts-rail-hidden)").first();
					if ($first.length) $first.trigger("click");
				}
			});

			this.$rail.find(".ts-rail-search-clear").on("click", function () {
				$input.val("");
				me.filter_rail("");
				$input.trigger("focus");
			});
		},

		filter_rail: function (query) {
			if (!this.$rail) return;
			var q = (query || "").toLowerCase().trim();
			var visible = 0;
			this.$rail.find(".ts-rail-item").each(function () {
				var ws = String($(this).data("workspace") || "").toLowerCase();
				var match = !q || ws.indexOf(q) !== -1;
				$(this).toggleClass("ts-rail-hidden", !match);
				if (match) visible++;
			});
			this.$rail.toggleClass("ts-filtering", !!q);
			this.$rail.find(".ts-rail-empty").toggleClass("visible", !!q && visible === 0);
		},

		setup_rail_resizer: function () {
			var me = this;
			var rail = this.$rail[0];
			var MIN = 60;
			var MAX = 220;

			this.$rail.find(".ts-rail-resizer").on("mousedown", function (e) {
				e.preventDefault();
				var start_x = e.clientX;
				var start_w = rail.getBoundingClientRect().width;
				$("body").addClass("ts-rail-resizing");

				function on_move(ev) {
					var w = Math.min(MAX, Math.max(MIN, start_w + (ev.clientX - start_x)));
					rail.style.width = w + "px";
					rail.style.minWidth = w + "px";
				}

				function on_up() {
					$(document).off("mousemove", on_move).off("mouseup", on_up);
					$("body").removeClass("ts-rail-resizing");
					var w = rail.getBoundingClientRect().width;
					rail.style.width = "";
					rail.style.minWidth = "";
					me.set_rail_expanded(w > (MIN + MAX) / 2);
				}

				$(document).on("mousemove", on_move).on("mouseup", on_up);
			});
		},

		/* ===== Workspace data ============================================ */

		get_workspaces: function () {
			var icons = frappe.boot.desktop_icons || [];
			var sidebar_items = frappe.boot.workspace_sidebar_item || {};
			return icons.filter(function (icon) {
				return (
					icon.hidden !== 1 &&
					icon.link_type === "Workspace Sidebar" &&
					sidebar_items[icon.label.toLowerCase()]
				);
			});
		},

		get_icon_for_workspace: function (ws) {
			var sidebar_data = (frappe.boot.workspace_sidebar_item || {})[ws.label.toLowerCase()];
			if (sidebar_data && sidebar_data.header_icon) {
				return frappe.utils.icon(sidebar_data.header_icon, "md", "", "", "", true);
			}
			var letter = ws.label.charAt(0).toUpperCase();
			return '<span class="ts-rail-initials">' + letter + "</span>";
		},

		switch_workspace: function (workspace_name) {
			if (!workspace_name || !frappe.app.sidebar) return;
			frappe.app.sidebar.setup(workspace_name);
			this.update_rail_active();
		},

		update_rail_active: function () {
			if (!frappe.app.sidebar) return;
			var current = (frappe.app.sidebar.sidebar_title || "").toLowerCase();
			$(".ts-rail-item").removeClass("active");
			$(".ts-rail-item").each(function () {
				var ws = $(this).data("workspace");
				if (ws && String(ws).toLowerCase() === current) {
					$(this).addClass("active");
				}
			});
		},

		toggle_rail_visibility: function () {
			if (!this.$rail) return;
			if (!this.theme_active()) {
				this.teardown();
				return;
			}
			var sidebar_visible = $(".body-sidebar-container").is(":visible");
			var page = frappe.container && frappe.container.page && frappe.container.page.page;
			var hide = page && page.hide_sidebar;

			if (sidebar_visible && !hide) {
				this.$rail.show();
				$("body").addClass("ts-dual-sidebar");
			} else {
				this.$rail.hide();
				$("body").removeClass("ts-dual-sidebar");
			}
		},

		listen_for_changes: function () {
			var me = this;

			// Ctrl/Cmd + B toggles the rail, matching common editor shortcuts.
			$(document).on("keydown.ts_rail", function (e) {
				if ((e.metaKey || e.ctrlKey) && (e.key === "b" || e.key === "B")) {
					if (!me.theme_active() || !me.rail_built) return;
					var tag = (e.target.tagName || "").toLowerCase();
					if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
					e.preventDefault();
					me.set_rail_expanded(!$("body").hasClass("ts-rail-expanded"));
				}
			});

			$(document).on("sidebar_setup", function () {
				if (!me.rail_built) me.init();
				setTimeout(function () {
					me.update_rail_active();
					me.toggle_rail_visibility();
				}, 50);
			});

			$(document).on("page-change", function () {
				setTimeout(function () {
					me.update_rail_active();
					me.toggle_rail_visibility();
				}, 100);
			});

			$(document).on("form-refresh", function () {
				setTimeout(function () {
					me.toggle_rail_visibility();
				}, 200);
			});
		},
	});

	$(document).ready(function () {
		if (!frappe.boot || !frappe.boot.setup_complete) return;
		frappe.after_ajax(function () {
			ds.init();
		});
	});
})();
