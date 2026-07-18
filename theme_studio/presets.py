"""Built-in Shadcn-inspired theme presets.

Each preset maps directly to the `Theme Studio Theme` DocType fields.
Colors are hex so they render in Frappe's Color field picker.
"""

PRESETS = [
	{
		"theme_name": "Shadcn Light",
		"appearance": "Light",
		"font_family": "Inter",
		"radius": "0.5rem",
		"background": "#ffffff",
		"foreground": "#09090b",
		"card": "#ffffff",
		"card_foreground": "#09090b",
		"popover": "#ffffff",
		"popover_foreground": "#09090b",
		"primary": "#18181b",
		"primary_foreground": "#fafafa",
		"secondary": "#f4f4f5",
		"secondary_foreground": "#18181b",
		"muted": "#f4f4f5",
		"muted_foreground": "#71717a",
		"accent": "#f4f4f5",
		"accent_foreground": "#18181b",
		"destructive": "#ef4444",
		"destructive_foreground": "#fafafa",
		"border": "#e4e4e7",
		"input": "#e4e4e7",
		"ring": "#a1a1aa",
	},
	{
		"theme_name": "Shadcn Dark",
		"appearance": "Dark",
		"font_family": "Inter",
		"radius": "0.5rem",
		"background": "#09090b",
		"foreground": "#fafafa",
		"card": "#0c0c0f",
		"card_foreground": "#fafafa",
		"popover": "#0c0c0f",
		"popover_foreground": "#fafafa",
		"primary": "#fafafa",
		"primary_foreground": "#18181b",
		"secondary": "#27272a",
		"secondary_foreground": "#fafafa",
		"muted": "#27272a",
		"muted_foreground": "#a1a1aa",
		"accent": "#27272a",
		"accent_foreground": "#fafafa",
		"destructive": "#dc2626",
		"destructive_foreground": "#fafafa",
		"border": "#27272a",
		"input": "#27272a",
		"ring": "#d4d4d8",
	},
	{
		"theme_name": "Ocean Blue",
		"appearance": "Light",
		"font_family": "Inter",
		"radius": "0.625rem",
		"background": "#ffffff",
		"foreground": "#0f172a",
		"card": "#ffffff",
		"card_foreground": "#0f172a",
		"popover": "#ffffff",
		"popover_foreground": "#0f172a",
		"primary": "#2563eb",
		"primary_foreground": "#f8fafc",
		"secondary": "#f1f5f9",
		"secondary_foreground": "#0f172a",
		"muted": "#f1f5f9",
		"muted_foreground": "#64748b",
		"accent": "#eff6ff",
		"accent_foreground": "#1d4ed8",
		"destructive": "#ef4444",
		"destructive_foreground": "#f8fafc",
		"border": "#e2e8f0",
		"input": "#e2e8f0",
		"ring": "#2563eb",
	},
	{
		"theme_name": "Emerald",
		"appearance": "Light",
		"font_family": "Inter",
		"radius": "0.5rem",
		"background": "#ffffff",
		"foreground": "#052e23",
		"card": "#ffffff",
		"card_foreground": "#052e23",
		"popover": "#ffffff",
		"popover_foreground": "#052e23",
		"primary": "#059669",
		"primary_foreground": "#f0fdf4",
		"secondary": "#f0fdf4",
		"secondary_foreground": "#065f46",
		"muted": "#f1f5f4",
		"muted_foreground": "#5f7268",
		"accent": "#ecfdf5",
		"accent_foreground": "#065f46",
		"destructive": "#ef4444",
		"destructive_foreground": "#f0fdf4",
		"border": "#dceae3",
		"input": "#dceae3",
		"ring": "#059669",
	},
	{
		"theme_name": "Rose",
		"appearance": "Light",
		"font_family": "Inter",
		"radius": "0.75rem",
		"background": "#ffffff",
		"foreground": "#1c0a0f",
		"card": "#ffffff",
		"card_foreground": "#1c0a0f",
		"popover": "#ffffff",
		"popover_foreground": "#1c0a0f",
		"primary": "#e11d48",
		"primary_foreground": "#fff1f2",
		"secondary": "#fff1f2",
		"secondary_foreground": "#9f1239",
		"muted": "#f6f1f2",
		"muted_foreground": "#7c6266",
		"accent": "#ffe4e6",
		"accent_foreground": "#9f1239",
		"destructive": "#dc2626",
		"destructive_foreground": "#fff1f2",
		"border": "#f0dadd",
		"input": "#f0dadd",
		"ring": "#e11d48",
	},
	{
		"theme_name": "Midnight",
		"appearance": "Dark",
		"font_family": "Inter",
		"radius": "0.625rem",
		"background": "#020817",
		"foreground": "#e2e8f0",
		"card": "#0b1220",
		"card_foreground": "#e2e8f0",
		"popover": "#0b1220",
		"popover_foreground": "#e2e8f0",
		"primary": "#3b82f6",
		"primary_foreground": "#020817",
		"secondary": "#1e293b",
		"secondary_foreground": "#e2e8f0",
		"muted": "#1e293b",
		"muted_foreground": "#94a3b8",
		"accent": "#172554",
		"accent_foreground": "#bfdbfe",
		"destructive": "#ef4444",
		"destructive_foreground": "#f8fafc",
		"border": "#1e293b",
		"input": "#1e293b",
		"ring": "#3b82f6",
	},
]


def install_presets():
	"""Create or refresh the built-in presets. Safe to run repeatedly."""
	import frappe

	for preset in PRESETS:
		name = preset["theme_name"]
		if frappe.db.exists("Theme Studio Theme", name):
			doc = frappe.get_doc("Theme Studio Theme", name)
		else:
			doc = frappe.new_doc("Theme Studio Theme")
		doc.update(preset)
		doc.is_preset = 1
		doc.flags.ignore_permissions = True
		doc.save()

	# Set a sensible site default the first time around.
	settings = frappe.get_single("Theme Studio Settings")
	if not settings.default_theme:
		settings.default_theme = "Shadcn Light"
		settings.flags.ignore_permissions = True
		settings.save()

	frappe.db.commit()
