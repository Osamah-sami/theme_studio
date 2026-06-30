import json

import frappe
from frappe.tests.utils import FrappeTestCase

from theme_studio import api


class TestThemeStudioApi(FrappeTestCase):
	def setUp(self):
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.db.rollback()

	def _theme_payload(self, name="API Test Theme", **overrides):
		data = {
			"theme_name": name,
			"appearance": "Light",
			"font_family": "Inter",
			"radius": "0.5rem",
			"tokens": {
				"primary": "#2563eb",
				"primary-foreground": "#ffffff",
				"background": "#ffffff",
				"foreground": "#09090b",
				# Extras: should land in tokens_json, not on dedicated fields.
				"sidebar": "#fafafa",
				"chart-1": "#2563eb",
			},
		}
		data.update(overrides)
		return data

	def test_save_theme_persists_core_and_extra_tokens(self):
		saved = api.save_theme(json.dumps(self._theme_payload()))
		doc = frappe.get_doc("Theme Studio Theme", saved["name"])
		self.assertEqual(doc.primary, "#2563eb")
		self.assertEqual(doc.primary_foreground, "#ffffff")
		# Extras round-trip through the JSON field and reappear in the payload.
		extras = json.loads(doc.tokens_json)
		self.assertEqual(extras["sidebar"], "#fafafa")
		self.assertEqual(extras["chart-1"], "#2563eb")
		self.assertEqual(saved["tokens"]["chart-1"], "#2563eb")

	def test_save_theme_updates_existing(self):
		first = api.save_theme(json.dumps(self._theme_payload()))
		updated = api.save_theme(
			json.dumps(
				self._theme_payload(name="API Test Theme", **{"name": first["name"]})
			)
		)
		self.assertEqual(first["name"], updated["name"])
		count = frappe.db.count("Theme Studio Theme", {"theme_name": "API Test Theme"})
		self.assertEqual(count, 1)

	def test_import_theme_creates_new(self):
		payload = self._theme_payload(name="Imported Palette")
		saved = api.import_theme(json.dumps(payload))
		self.assertTrue(frappe.db.exists("Theme Studio Theme", saved["name"]))
		self.assertFalse(saved["is_preset"])

	def test_import_theme_never_overwrites(self):
		payload = self._theme_payload(name="Clash Theme")
		first = api.import_theme(json.dumps(payload))
		second = api.import_theme(json.dumps(payload))
		self.assertNotEqual(first["name"], second["name"])
		self.assertEqual(second["theme_name"], "Clash Theme 2")

	def test_import_theme_requires_tokens(self):
		bad = {"theme_name": "No Tokens", "tokens": {}}
		self.assertRaises(frappe.ValidationError, api.import_theme, json.dumps(bad))

	def test_get_themes_returns_payloads(self):
		api.save_theme(json.dumps(self._theme_payload()))
		themes = api.get_themes()
		self.assertTrue(any(t["theme_name"] == "API Test Theme" for t in themes))
		self.assertTrue(all("tokens" in t for t in themes))
