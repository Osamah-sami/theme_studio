from theme_studio.presets import install_presets


def execute():
	"""Idempotently (re)create the built-in presets on migrate."""
	install_presets()
