# libmov Project

## Repository Layout

- `app/` holds the Electron app. Every path below is relative to it unless it starts with `.github/` or `landing/`.
- `landing/` is a static page (`index.html`, `style.css`, `main.js`, plus the shared shell in `site.css`) with no build step. It carries the libmov branding and a scripted demo with real TheTVDB posters from `landing/posters/`. The demo mirrors the redesigned app (top bar tabs, poster grid, command palette, detail page, toaster) and replays ⌘K search → ⌘L Watchlist → ⌘D watched → ↵ detail → esc → the Watched tab; keep its markup and `style.css` in step with `app/src/components/` and the palette in `app/src/index.css`.
- The root `Makefile` delegates `dev` and `build` to `app/Makefile` and serves the landing with `make landing`.

## Stack

- Electron for the desktop shell.
- React 19 + Vite for the renderer.
- Tailwind v4 for styling.
- Zustand with slices for app state.
- better-sqlite3 in the Electron main process for local persistence.
- TheTVDB as the external catalog provider.
- electron-builder for packaging.

## Architecture

- `electron/main.ts` owns the app lifecycle and browser window.
- `electron/preload.ts` exposes a narrow typed IPC bridge to the renderer.
- `electron/database.ts` keeps all local list and watched state in SQLite under the Electron user data directory.
- `electron/tvdb.ts` is the only remote catalog client. It authenticates with TheTVDB, runs merged movie/series search, and maps both summary and extended detail payloads into the app’s local model.
- `src/store` contains the sliced Zustand store:
  - `discovery-slice` for bootstrap, remote search state, request versioning, and infinite paging for the search palette. Bootstrap has its own version counter so a debounced search never discards it, and it never resets what the user already typed.
  - `detail-slice` for in-app routing between `library` and `detail`, detail fetch state, and origin-aware return behavior back to the search palette or the library.
  - `library-slice` for local SQLite-backed list and watched mutations, plus `toggleWatchlist` / `toggleWatched`, which also raise a toast.
  - `movie-library-slice` for the paged Discover catalog and its persisted scroll position.
  - `ui-slice` for the active library tab, the active search result, search visibility/focus, and the toast.
- `src/components/catalog-setup.tsx` replaces library navigation when no key is configured. It checks credentials through IPC, supports optional subscriber PINs, and opens the library after saving. `electron/catalog-credentials.ts` persists encrypted credentials under userData; no key is returned by bootstrap.
- `src/components/top-bar.tsx` is the window chrome: logo, the Watchlist / Watched / Discover tabs, and the search trigger. On macOS it sits under the inset traffic lights and is a drag region.
- `src/components/library-view.tsx` renders the three tabs. Watchlist and Watched read local SQLite state only; Discover pages through TheTVDB.
- `src/components/poster-grid.tsx` is the one virtualized, responsive poster grid used by every tab, with 2D arrow-key focus movement and hover quick actions. Column math lives in `src/hooks/use-grid-layout.ts`.
- `src/components/command-palette.tsx` is the only remote search surface: a centered palette with a virtualized result list and a preview pane.
- `src/components/detail-page.tsx` renders the dedicated movie/series page from extended TheTVDB data.
- Shortcut labels and the platform modifier live in `src/lib/shortcuts.ts`; `src/components/keys.tsx` renders them.

## UI Direction

- Dark only. Ink-black surfaces and the clapper red from the app icon (`--primary`), Geist + Geist Mono.
- Three tabs in the top bar: `Watchlist`, `Watched`, `Discover`. The tabs are the navigation; there is no sidebar.
- Search is a command palette over the current surface, not a browse grid.
- The detail page is a separate surface with a backdrop hero, not a popover or drawer.
- Posters carry title and year·type captions; status shows as small corner badges (red bookmark = Watchlist, white check = Watched).
- Every toggle confirms with a short toast.

## Interaction Model

- `⌘K` (Ctrl+K elsewhere) toggles the search palette; `/` opens it.
- `1` / `2` / `3` switch to Watchlist / Watched / Discover.
- In the palette: `↑` / `↓` move the active result, `↵` opens it, `esc` closes.
- `⌘L` toggles Watchlist and `⌘D` toggles Watched on the active result, the focused poster, or the open detail page.
- Poster grids are tabbable buttons with arrow-key movement in both directions; `↵` opens detail.
- `esc` or `⌘[` on the detail page returns to the surface that opened it, restoring the palette and its query when it came from search.

## Data Model

- `lists` stores built-in and user-created lists.
- `media_cache` stores the latest local snapshot for any saved title.
- `list_items` connects cached media to lists.
- `watched_entries` stores watched state separately so titles can stay watched even if they are removed from a list.
- The built-in watchlist uses the fixed list id and slug `watchlist`.
- `snapshot()` also materializes `recentlyWatched`, ordered by `watched_at DESC`, so the home screen does not derive that rail in the renderer.

## Build And Release

- `make dev` runs the Electron development flow.
- `make build` delegates to `scripts/build-package.ts`.
- Supported packaging aliases:
  - mac: `app`, `dmg`
  - linux: `appimage`, `deb`, `rpm`, `binary`
  - windows: `exe`, `exe-setup`, `msi`
- Brand artwork is pre-rendered under `app/brand/` (icon PNGs, `icon.icns`, retina `dmg-background.tiff`). `scripts/generate-artwork.ts` copies it into `build/` and writes `icon.ico`, so release runners need no image tooling.
- `.github/workflows/release.yml` builds every supported platform/arch/target combination and uploads the results to a draft GitHub release.
- macOS defaults to `app` because that path is stable in this workspace. DMG remains available as an explicit target.

## Operational Notes

- The main process first reads the locally saved credentials (encrypted with Electron safeStorage), then falls back to `TVDB_API_KEY` in its environment or the ignored `app/.env` file.
- `electron/main.ts` sets the app name to `libmov` so dev Electron and packaged builds resolve the same `userData` directory, and copies `library.sqlite` from the legacy `Fulcrum` directory on first launch.
- The renderer never talks to the catalog provider directly.
- The Playwright Electron suite assumes the built `dist` and `dist-electron` outputs are current.
- `GOTCHAS.md` contains the provider and packaging caveats that should be checked before altering this architecture.
