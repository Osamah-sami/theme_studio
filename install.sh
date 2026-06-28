#!/usr/bin/env bash
#
# Theme Studio - one-shot installer for Frappe bench
# Usage:
#   ./install.sh <site-name> [app-source]
#
# Examples:
#   ./install.sh mysite.local
#   ./install.sh mysite.local https://github.com/<username>/theme_studio
#
set -euo pipefail

APP_NAME="theme_studio"
SITE="${1:-}"
APP_SOURCE="${2:-}"

c_green() { printf "\033[0;32m%s\033[0m\n" "$1"; }
c_red()   { printf "\033[0;31m%s\033[0m\n" "$1"; }
c_blue()  { printf "\033[0;34m%s\033[0m\n" "$1"; }

if [[ -z "$SITE" ]]; then
  c_red "Error: site name is required."
  echo "Usage: ./install.sh <site-name> [app-source]"
  exit 1
fi

# Must be run from the frappe-bench root.
if [[ ! -d "apps" || ! -d "sites" ]]; then
  c_red "Error: this script must be run from your frappe-bench root directory."
  echo "cd into your bench (the folder that contains 'apps/' and 'sites/') and run again."
  exit 1
fi

c_blue "==> Step 1/6: Fetching app"
if [[ -d "apps/${APP_NAME}" ]]; then
  c_green "    apps/${APP_NAME} already exists, skipping fetch."
elif [[ -n "$APP_SOURCE" ]]; then
  bench get-app "${APP_NAME}" "${APP_SOURCE}"
else
  c_red "Error: apps/${APP_NAME} not found and no app-source URL provided."
  echo "Either place the app in apps/${APP_NAME} or pass a git URL as the 2nd argument."
  exit 1
fi

c_blue "==> Step 2/6: Registering app in the Python environment"
./env/bin/pip install -e "apps/${APP_NAME}" >/dev/null 2>&1 || ./env/bin/pip install -e "apps/${APP_NAME}"

c_blue "==> Step 3/6: Ensuring app is listed in sites/apps.txt"
if ! grep -qx "${APP_NAME}" sites/apps.txt 2>/dev/null; then
  echo "${APP_NAME}" >> sites/apps.txt
  c_green "    added ${APP_NAME} to sites/apps.txt"
else
  c_green "    ${APP_NAME} already in sites/apps.txt"
fi

c_blue "==> Step 4/6: Installing app on site '${SITE}'"
bench --site "${SITE}" install-app "${APP_NAME}"

c_blue "==> Step 5/6: Building assets and migrating"
bench build --app "${APP_NAME}"
bench --site "${SITE}" migrate

c_blue "==> Step 6/6: Clearing cache"
bench --site "${SITE}" clear-cache

c_green "==> Done! Theme Studio is installed."
echo ""
echo "Next steps:"
echo "  1. Restart bench:   bench restart   (or restart your dev server)"
echo "  2. Open the Desk:   https://${SITE}/app/theme-studio"
echo ""
echo "Tip: the 6 default Shadcn-style themes were seeded automatically."
