# Theme Studio

A Shadcn-inspired theme manager for the **Frappe Framework** Desk. Browse and
preview themes, switch the active one per user or site-wide, and craft your own
custom themes from a clean visual editor — all from a dedicated Desk page.

> This is an original app inspired by the idea of a Frappe SaaS theme manager.
> It does **not** reuse code from any proprietary project.

## Features

- **Dual sidebar (Frappe v16)** — a small icon **workspace rail** beside the large
  workspace **panel**, just like a modern SaaS desk. Click a rail icon to switch
  workspaces, expand/collapse the rail (with search, drag-to-resize and hover
  tooltips), and the whole thing is styled purely with the Shadcn `--ts-sidebar-*`
  tokens — so it re-skins with the active theme. Works across every Frappe v16 app.
  - **Keyboard & a11y** — rail items are focusable buttons (Enter/Space to switch),
    the toggle exposes `aria-expanded`, and **Ctrl/Cmd + B** expands/collapses the rail.
  - **Responsive** — on tablets the expanded rail floats as an overlay drawer with a
    backdrop; on phones it slims to an icon-only rail with a wider panel.
- **Theme gallery** — every theme rendered as a live swatch card, with a **search box**
  and **Light / Dark / All filter chips** to find a theme fast.
- **Import / Export** — export any theme to a `.json` file and import one back in as a
  new editable theme (toolbar *Import Theme* button and per-card *Export*).
- **Hover-to-preview** — hover a card to preview it on the actual Desk; click *Apply* to keep it.
- **Per-user or site-wide** — users pick their own theme; admins set the site default.
- **Theme editor** — tune all Shadcn design tokens (background, foreground, primary,
  secondary, muted, accent, destructive, border, input, ring), plus radius and font.
- **Live mock + live Desk preview** — see changes in a contained mock or on the whole Desk.
- **Built-in presets** — Shadcn Light, Shadcn Dark, Ocean Blue, Emerald, Rose, Midnight.
- **Boot-time application** — the active theme is applied before first paint via `boot_session`.

## Requirements

- A working [Frappe bench](https://frappeframework.com/docs/user/en/installation) (Frappe v15 or v16).
- Python 3.10+ and Node as required by your bench.

## Quick install (script)

From your **frappe-bench root** (the folder containing `apps/` and `sites/`):

```bash
# fetch from git, then install on a site:
./apps/theme_studio/install.sh your-site.localhost https://github.com/<your-org>/theme_studio

# or, if the app is already in apps/theme_studio:
./apps/theme_studio/install.sh your-site.localhost
```

The script fetches the app (if needed), registers it in the Python env, adds it to
`sites/apps.txt`, installs it on the site, builds assets, migrates, and clears the cache.
Then run `bench restart` and open `/app/theme-studio`.

## Installation (manual)

From your bench directory:

```bash
# 1. Fetch the app into the bench
bench get-app theme_studio https://github.com/<your-org>/theme_studio

# 2. Install it onto a site
bench --site your-site.localhost install-app theme_studio

# 3. Build assets and migrate
bench build --app theme_studio
bench --site your-site.localhost migrate

# 4. Clear cache and restart
bench --site your-site.localhost clear-cache
bench restart
```

If you are developing locally, you can symlink/clone the app into `apps/` and run
`bench setup requirements` before installing.

## Usage

1. Log in to the Desk as a **System Manager**.
2. Open **Theme Studio** (search the awesomebar for "Theme Studio" or go to `/app/theme-studio`).
3. **Browse** presets, **hover** to preview, click **Apply** to set your personal theme,
   or **Set Site Default** to apply it for everyone.
4. Click **New Theme** (or **Duplicate** a preset) to open the editor, adjust the tokens,
   then **Save Theme** / **Save & Apply**.
5. Toggle **Per-user themes** or **Disable theming** in the Workspace panel.

## How it works

| Piece | Responsibility |
| --- | --- |
| `Theme Studio Theme` (DocType) | Stores each theme's tokens, radius, font, appearance. |
| `Theme Studio Settings` (Single) | Site default theme + per-user / disable toggles. |
| `theme_studio/api.py` | Whitelisted endpoints + `boot_session` theme resolution. |
| `public/css/shadcn_desk.css` | Maps `--ts-*` tokens onto Frappe Desk variables. |
| `public/css/shadcn_sidebar.css` | Styles the v16 dual sidebar (rail + panel) from the `--ts-sidebar-*` tokens. |
| `public/js/theme_studio_sidebar.js` | Builds the workspace rail and its expand/collapse, search & resize behaviour. |
| `public/js/theme_studio_boot.js` | Applies tokens at boot; exposes the preview API. |
| `page/theme_studio` | The management UI (gallery, editor, live preview). |

Tokens are injected as CSS custom properties (`--ts-background`, `--ts-primary`, …) on
`<html>`, and `shadcn_desk.css` bridges them to Frappe's own variables, so the entire
Desk re-skins instantly without touching core.

## Uninstall

```bash
bench --site your-site.localhost uninstall-app theme_studio
```

## License

MIT — see [license.txt](./license.txt).
