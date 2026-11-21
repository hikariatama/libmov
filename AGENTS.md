# Working on libmov

## Build and check

- The Electron/React/TypeScript app is in `app/`; `landing/` is a static site. Use Node.js 24 and Bun 1.4.2 with the frozen `app/bun.lock`.
- From `app/`, run `bun install --frozen-lockfile`, `bun run check`, then `bun run build`. Unit tests use synthetic keys and temporary storage.
- Electron browser tests require the current renderer/main build and matching native `better-sqlite3` ABI. Use an isolated library and mocked provider where possible; a live catalog check requires separately provided credentials.
- In File Provider storage, framework links may be unavailable. Build in a local copy and set `LIBMOV_ELECTRON_PATH` to an isolated Electron executable when needed; do not repair another running installation.
- The root Makefile delegates packaging. macOS `app` creates a directory build and ZIP; DMG is an explicit target. Linux `binary` means tar.gz; Windows `exe` is portable and `exe-setup` is NSIS.
- Keep `app/brand/` as the source of packaging artwork and preserve the tuned DMG geometry. Generated artwork belongs under ignored build paths. Verify each produced target; configured DMG support alone does not establish successful packaging.
- CI builds from `app/` and collects `app/release/`. Keep pinned actions, checksums and the draft publisher's existing-tag/published-release guards.

## Data and security

- Catalog requests and credentials stay in the Electron main process behind the typed preload bridge. The renderer must never receive a stored API key or contact the provider directly.
- Prefer saved credentials encrypted with Electron safeStorage; environment/ignored `app/.env` is a developer fallback. Never commit a key, PIN, bearer token or generated catalog response containing private data.
- Preserve TheTVDB v4 login, bearer authentication, movie/series filtering and the current discovery contract. Do not infer unsupported genre/rating filters from old provider behavior.
- SQLite lives in userData. Preserve existing profile/database compatibility and first-launch migration; do not rename identifiers or remove a migration without a data-migration decision.
- Keep the fixed `watchlist` identifier. Membership and watched state come from `list_items`/`watched_entries`, not `media_cache`; mutations must also keep the cached media snapshot consistent.
- Preserve the single active media key, request-version guards, origin-aware detail return and restored search/scroll state. Bootstrap and debounced search must not overwrite one another.
- Keep one owner for keyboard actions. Disable detail hotkeys while the palette owns them; preserve the window-close shortcut and native modifier labels.
- The static landing must match the current application controls and preserve poster/resource attribution.

## Repository and releases

- Keep current development rules here; do not add a `docs/` archive, old deployment diaries or a history of project names.
- Preserve licenses, third-party notices, source artwork and required attribution. Keep private settings, credentials, databases, browser data, diagnostics, dependencies and build output out of Git.
- Keep one commit per existing version and matching version tags. Repository maintenance does not create a new product version. Do not invent a version for an unversioned project.
- Rewriting history, importing pre-rewrite/checkpoint refs, publishing, pushing, deploying and installing require owner authorization. A local change does not authorize any of the others.
- Use isolated fixtures and report source checks, builds and live behavior separately. Never use saved accounts, private media or production services as development fixtures.
