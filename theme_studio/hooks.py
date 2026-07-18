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
app_include_css = [
	"/assets/theme_studio/css/shadcn_desk.css",
	"/assets/theme_studio/css/shadcn_sidebar.css",
]
app_include_js = [
	"/assets/theme_studio/js/theme_studio_color_engine.js",
	"/assets/theme_studio/js/theme_studio_boot.js",
	"/assets/theme_studio/js/theme_studio_sidebar.js",
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
