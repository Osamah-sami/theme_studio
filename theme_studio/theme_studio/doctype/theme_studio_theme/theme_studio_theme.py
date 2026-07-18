import json

import frappe
from frappe import _
from frappe.model.document import Document

# CSS custom property name -> DocType fieldname.
TOKEN_FIELD_MAP = {
	"background": "background",
	"foreground": "foreground",
	"card": "card",
	"card-foreground": "card_foreground",
	"popover": "popover",
	"popover-foreground": "popover_foreground",
	"primary": "primary",
	"primary-foreground": "primary_foreground",
	"secondary": "secondary",
	"secondary-foreground": "secondary_foreground",
	"muted": "muted",
	"muted-foreground": "muted_foreground",
	"accent": "accent",
	"accent-foreground": "accent_foreground",
	"destructive": "destructive",
	"destructive-foreground": "destructive_foreground",
	"border": "border",
	"input": "input",
	"ring": "ring",
}


class ThemeStudioTheme(Document):
	def validate(self):
		self._validate_extra_tokens()

	def _validate_extra_tokens(self):
		if not self.tokens_json:
			return
		try:
			parsed = json.loads(self.tokens_json)
		except (ValueError, TypeError):
			frappe.throw(_("Extra Tokens must be valid JSON."))
		if not isinstance(parsed, dict):
			frappe.throw(_("Extra Tokens JSON must be an object of token: value pairs."))

	def on_trash(self):
		if self.is_preset:
			frappe.throw(_("Preset themes cannot be deleted."))

	def get_tokens(self) -> dict:
		"""Return a flat dict of CSS custom properties for this theme."""
		tokens = {}
		for css_name, fieldname in TOKEN_FIELD_MAP.items():
			value = self.get(fieldname)
			if value:
				tokens[css_name] = value

		tokens["radius"] = self.radius or "0.5rem"
		if self.font_family:
			tokens["font-family"] = self.font_family

		if self.tokens_json:
			try:
				extra = json.loads(self.tokens_json)
				if isinstance(extra, dict):
					tokens.update({str(k): str(v) for k, v in extra.items()})
			except (ValueError, TypeError):
				pass

		return tokens

	def as_payload(self) -> dict:
		"""Serialise the theme for the front-end Theme Studio."""
		return {
			"name": self.name,
			"theme_name": self.theme_name,
			"appearance": self.appearance,
			"is_preset": bool(self.is_preset),
			"font_family": self.font_family,
			"radius": self.radius,
			"tokens": self.get_tokens(),
		}
