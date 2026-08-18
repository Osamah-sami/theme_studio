app_name = "theme_studio"
app_title = "Theme Studio"
app_publisher = "Theme Studio"
app_description = "A Shadcn-inspired theme manager for the Frappe Desk — preview, switch, and craft custom themes."
app_email = "hello@example.com"
app_license = "MIT"
app_version = "0.1.0"

# Apps
# ------------------

# required_apps = []

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# Bump ASSET_VER after every CSS/JS change so the browser re-fetches the files
# instead of serving the cached (12h) copies — same approach as saas_theme.
ASSET_VER = "83"
app_include_css = [
	f"/assets/theme_studio/css/shadcn_desk.css?v={ASSET_VER}",
	f"/assets/theme_studio/css/shadcn_sidebar.css?v={ASSET_VER}",
]
app_include_js = [
	f"/assets/theme_studio/js/theme_studio_color_engine.js?v={ASSET_VER}",
	f"/assets/theme_studio/js/theme_studio_boot.js?v={ASSET_VER}",
	f"/assets/theme_studio/js/theme_studio_sidebar.js?v={ASSET_VER}",
]

# include js, css files in header of web template
# web_include_css = "/assets/theme_studio/css/theme_studio.css"
# web_include_js = "/assets/theme_studio/js/theme_studio.js"

# Boot session
# ------------------
# Inject the active theme tokens into `frappe.boot` so the theme can be applied
# before the first paint without an extra round-trip.
boot_session = "theme_studio.api.boot_session"

# Installation
# ------------------
after_install = "theme_studio.install.after_install"

# Website context / fixtures could be added here as the app grows.
