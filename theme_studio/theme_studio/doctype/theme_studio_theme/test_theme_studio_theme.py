import json

import frappe
from frappe.tests.utils import FrappeTestCase


class TestThemeStudioTheme(FrappeTestCase):
	def tearDown(self):
		frappe.db.rollback()

	def _new_theme(self, **kwargs):
		doc = frappe.new_doc("Theme Studio Theme")
		doc.theme_name = kwargs.pop("theme_name", "Test Theme")
		doc.appearance = kwargs.pop("appearance", "Light")
		for key, value in kwargs.items():
			doc.set(key, value)
		return doc

	def test_get_tokens_maps_fields_to_css_names(self):
		doc = self._new_theme(
			primary="#2563eb",
			primary_foreground="#ffffff",
			card_foreground="#111111",
			radius="0.75rem",
			font_family="Inter",
		)
		tokens = doc.get_tokens()
		# Field with an underscore is exposed as a hyphenated CSS custom property.
		self.assertEqual(tokens["primary"], "#2563eb")
		self.assertEqual(tokens["primary-foreground"], "#ffffff")
		self.assertEqual(tokens["card-foreground"], "#111111")
		self.assertEqual(tokens["radius"], "0.75rem")
		self.assertEqual(tokens["font-family"], "Inter")

	def test_get_tokens_merges_extra_json(self):
		doc = self._new_theme(
			primary="#2563eb",
			tokens_json=json.dumps({"sidebar": "#fafafa", "chart-1": "#2563eb"}),
		)
		tokens = doc.get_tokens()
		self.assertEqual(tokens["sidebar"], "#fafafa")
		self.assertEqual(tokens["chart-1"], "#2563eb")

	def test_invalid_extra_tokens_rejected(self):
		doc = self._new_theme(tokens_json="{ not valid json ")
		self.assertRaises(frappe.ValidationError, doc.insert, ignore_permissions=True)

	def test_extra_tokens_must_be_object(self):
		doc = self._new_theme(tokens_json=json.dumps(["not", "an", "object"]))
		self.assertRaises(frappe.ValidationError, doc.insert, ignore_permissions=True)

	def test_radius_defaults_when_blank(self):
		doc = self._new_theme(radius=None)
		self.assertEqual(doc.get_tokens()["radius"], "0.5rem")

	def test_as_payload_shape(self):
		doc = self._new_theme(primary="#2563eb")
		payload = doc.as_payload()
		for key in ("theme_name", "appearance", "is_preset", "tokens"):
			self.assertIn(key, payload)
		self.assertIsInstance(payload["tokens"], dict)
		self.assertIsInstance(payload["is_preset"], bool)
