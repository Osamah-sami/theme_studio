import frappe
from frappe.model.document import Document


class ThemeStudioSettings(Document):
	def on_update(self):
		# Bust the cached resolved-theme payloads so every session picks up the change.
		frappe.cache().delete_keys("theme_studio:resolved:*")
