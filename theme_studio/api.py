import json

import frappe
from frappe import _

USER_THEME_KEY = "theme_studio_theme"


# ---------------------------------------------------------------------------
# Boot
# ---------------------------------------------------------------------------
def boot_session(bootinfo):
	"""Attach the resolved theme to bootinfo so it applies before first paint."""
	try:
		bootinfo["theme_studio"] = resolve_theme()
	except Exception:
		# Never block the desk from booting because of a theme error.
		frappe.log_error(frappe.get_traceback(), "Theme Studio boot failed")
		bootinfo["theme_studio"] = {"disabled": True}


def resolve_theme() -> dict:
	"""Return the theme payload that should apply to the current user."""
	settings = frappe.get_cached_doc("Theme Studio Settings")

	if settings.disable_theme:
		return {"disabled": True}

	theme_name = None
	if settings.enable_user_themes:
		theme_name = frappe.defaults.get_user_default(USER_THEME_KEY)

	if not theme_name:
		theme_name = settings.default_theme

	if not theme_name or not frappe.db.exists("Theme Studio Theme", theme_name):
		return {"disabled": True}

	doc = frappe.get_cached_doc("Theme Studio Theme", theme_name)
	payload = doc.as_payload()
	payload["disabled"] = False
	return payload


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------
@frappe.whitelist()
def get_themes() -> list:
	"""All themes available to the studio, presets first."""
	names = frappe.get_all(
		"Theme Studio Theme",
		fields=["name"],
		order_by="is_preset desc, appearance asc, theme_name asc",
		pluck="name",
	)
	return [frappe.get_cached_doc("Theme Studio Theme", n).as_payload() for n in names]


@frappe.whitelist()
def get_active_theme() -> dict:
	"""The currently resolved theme plus context for the studio UI."""
	settings = frappe.get_cached_doc("Theme Studio Settings")
	active = resolve_theme()
	return {
		"active": active,
		"default_theme": settings.default_theme,
		"enable_user_themes": bool(settings.enable_user_themes),
		"disable_theme": bool(settings.disable_theme),
		"can_manage": "System Manager" in frappe.get_roles(),
		"user_theme": frappe.defaults.get_user_default(USER_THEME_KEY),
	}


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------
@frappe.whitelist()
def apply_theme(theme_name: str, scope: str = "user") -> dict:
	"""Apply a theme. scope='user' sets it for the current user, 'site' for everyone."""
	if not frappe.db.exists("Theme Studio Theme", theme_name):
		frappe.throw(_("Theme {0} does not exist.").format(theme_name))

	settings = frappe.get_cached_doc("Theme Studio Settings")

	if scope == "site":
		frappe.only_for("System Manager")
		settings.default_theme = theme_name
		settings.disable_theme = 0
		settings.save(ignore_permissions=True)
	else:
		if not settings.enable_user_themes:
			frappe.throw(_("Per-user themes are disabled by your administrator."))
		frappe.defaults.set_user_default(USER_THEME_KEY, theme_name)

	frappe.cache().delete_keys("theme_studio:resolved:*")
	return resolve_theme()


@frappe.whitelist()
def reset_user_theme() -> dict:
	"""Clear the current user's personal theme and fall back to the site default."""
	frappe.defaults.clear_user_default(USER_THEME_KEY)
	return resolve_theme()


@frappe.whitelist()
def save_theme(theme: str) -> dict:
	"""Create or update a custom theme from the studio. `theme` is a JSON string."""
	frappe.only_for("System Manager")
	data = theme if isinstance(theme, dict) else json.loads(theme)

	name = data.get("name")
	color_fields = [
		"background", "foreground", "card", "card_foreground", "popover",
		"popover_foreground", "primary", "primary_foreground", "secondary",
		"secondary_foreground", "muted", "muted_foreground", "accent",
		"accent_foreground", "destructive", "destructive_foreground",
		"border", "input", "ring",
	]

	if name and frappe.db.exists("Theme Studio Theme", name):
		doc = frappe.get_doc("Theme Studio Theme", name)
		if doc.is_preset:
			frappe.throw(_("Presets are read-only. Duplicate it to make changes."))
	else:
		doc = frappe.new_doc("Theme Studio Theme")
		doc.theme_name = data.get("theme_name") or name or _("Custom Theme")

	doc.appearance = data.get("appearance") or "Light"
	doc.font_family = data.get("font_family") or "Inter"
	doc.radius = data.get("radius") or "0.5rem"

	tokens = data.get("tokens") or {}
	for field in color_fields:
		css_key = field.replace("_", "-")
		if css_key in tokens:
			doc.set(field, tokens[css_key])

	extra = data.get("tokens_json")
	if extra:
		doc.tokens_json = extra if isinstance(extra, str) else json.dumps(extra, indent=2)

	doc.save(ignore_permissions=True)
	frappe.cache().delete_keys("theme_studio:resolved:*")
	return doc.as_payload()


@frappe.whitelist()
def duplicate_theme(theme_name: str, new_name: str) -> dict:
	"""Clone any theme (including presets) into a new editable theme."""
	frappe.only_for("System Manager")
	if not frappe.db.exists("Theme Studio Theme", theme_name):
		frappe.throw(_("Theme {0} does not exist.").format(theme_name))

	source = frappe.get_doc("Theme Studio Theme", theme_name)
	clone = frappe.copy_doc(source)
	clone.theme_name = new_name
	clone.is_preset = 0
	clone.insert(ignore_permissions=True)
	return clone.as_payload()


@frappe.whitelist()
def delete_theme(theme_name: str) -> None:
	frappe.only_for("System Manager")
	doc = frappe.get_doc("Theme Studio Theme", theme_name)
	if doc.is_preset:
		frappe.throw(_("Preset themes cannot be deleted."))
	frappe.delete_doc("Theme Studio Theme", theme_name, ignore_permissions=True)
	frappe.cache().delete_keys("theme_studio:resolved:*")
