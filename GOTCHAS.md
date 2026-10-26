# GOTCHAS

## TheTVDB

- The main process first reads the locally saved credentials (encrypted with Electron safeStorage), then falls back to `TVDB_API_KEY` in its environment or the ignored `app/.env` file; keys are not embedded in source.
- TheTVDB v4 requires `POST /login` with `{ "apikey": "..." }`, then bearer-token requests to the rest of the API.
- Search is driven by `/search`, which mixes entity types. The app filters that payload down to movies and series in `electron/tvdb.ts`.
- The search surface no longer depends on provider-side genre or rating metadata. If filters come back later, model them around TheTVDB’s current search parameters instead of reusing older assumptions.

## SQLite

- The app was renamed from Fulcrum to libmov. `userData` moved with the name, so `electron/main.ts` copies `library.sqlite` (and WAL/SHM files) from `<appData>/Fulcrum` when the new directory has no database. The appId changed too, so macOS treats libmov as a new app.

- The SQLite database lives in Electron `userData`, not in the repo.
- The provider migration moved local persistence to `library.sqlite`.
- The built-in watchlist is identified by the fixed id `watchlist`. Do not randomize or rename it without a migration.
- `media_cache` is a snapshot cache, not the source of truth for watchlist membership or watched state.
- If you want a title to appear in `Watch later`, write to both `media_cache` and `list_items`.
- If you want a title to appear in `Recently watched`, write to both `media_cache` and `watched_entries`.

## Renderer State

- The keyboard model depends on a single active media key in `ui-slice`. Do not reintroduce detached local selection state inside search rows.
- `⌘L` / `⌘D` are registered by whichever surface owns the target (palette, detail page, focused poster). The detail page disables its hotkeys while the palette is open so both never fire.
- `⌘W` is deliberately unused: Electron's default menu closes the window with it.
- `discovery-slice` carries a request version counter internally so stale search responses cannot overwrite newer ones.
- `detail-slice` owns the dedicated detail page. If you add more surfaces later, keep the origin-aware return logic intact so `Escape` can restore the right place.

## Testing

- The Playwright Electron tests launch the built app from `app/`. Run `bun run build` in `app/` before `bunx playwright test` or you will be testing stale renderer output.
- In an iCloud Drive checkout the framework symlinks inside `node_modules/electron/dist` get broken and Electron fails with `Library not loaded: Electron Framework`. Unzip the cached Electron build outside iCloud and point `LIBMOV_ELECTRON_PATH` at its `Contents/MacOS/Electron`.
- `better-sqlite3` must be built for Electron's ABI: `npx electron-builder install-app-deps`.

## Packaging

- `TARGET=app` on macOS is implemented as an electron-builder `dir` build plus a zip archive of the `.app` bundle.
- `make build` defaults to `TARGET=app` on macOS because that path is reliable here.
- `TARGET=binary` on Linux maps to `tar.gz`.
- `TARGET=exe` on Windows maps to the portable target. `TARGET=exe-setup` maps to NSIS.
- `app/brand/` is the source of truth for icons and the DMG background. To change them, re-render on macOS with `sips`, `iconutil` and `tiffutil -cathidpicheck` (1x 654×422 + 2x 1308×844); the DMG window size and icon positions in `electron-builder.yml` are tuned to that banner.
- DMG builds are configured and keep the custom background artwork, but local validation on this machine currently fails inside electron-builder/dmgbuild with `hdiutil: attach failed - no mountable file systems`. Keep the target, but treat it as an upstream macOS tooling risk until electron-builder or the host environment is friendlier.

## GitHub Actions

- The release workflow assumes GitHub-hosted arm runners are available with these labels:
  - Linux arm64: `ubuntu-24.04-arm`
  - Windows arm64: `windows-11-arm`
  - macOS x64: `macos-15-intel`
  - macOS arm64: `macos-latest`
- Build jobs run with `working-directory: app`, and artifacts upload from `app/release/`.
- On `workflow_dispatch`, the workflow creates the release tag and refuses to overwrite an existing tag before building.
- The workflow allows macOS DMG matrix jobs to fail without blocking the rest of the release because of the current `hdiutil` instability.
