from theme_studio.presets import install_presets


def after_install():
    """Install built-in presets. Safe to run on Frappe v16+.

    Theme Studio only re-skins colours, borders, radii and shadows — it never
    overrides Frappe's component geometry, so it installs cleanly on v16
    without affecting Frappe's own properties.
    """
    install_presets()
