<img src="https://github.com/user-attachments/assets/daf073c3-fff1-4b49-91fd-5dd91b2b3a6e" width="200" alt="libmov" />

![vibecoded](https://img.shields.io/badge/vibecoded-545454)
[![open-source](https://img.shields.io/badge/open--source-545454)](LICENSE)
[![release](https://img.shields.io/badge/release-tag--v0.0.1-d33a54)](https://github.com/hikariatama/libmov/releases/tag/v0.0.1)
[![CI](https://github.com/hikariatama/libmov/actions/workflows/ci.yml/badge.svg)](https://github.com/hikariatama/libmov/actions/workflows/ci.yml)
[![AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-545454)](LICENSE)

> A desktop watchlist and watched log for movies and series. Search TheTVDB, browse Discover and keep your library in local SQLite.

<img src="https://github.com/user-attachments/assets/683657fc-8354-4841-bd28-0d5c404e4fa1" width="100%" alt="libmov watchlist" />

## Download

<table>
  <thead><tr><th>Platform</th><th>Download</th></tr></thead>
  <tbody>
    <tr><td>macOS · Apple Silicon</td><td><a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-mac-arm64.dmg"><img alt="DMG Apple Silicon" src="https://img.shields.io/badge/DMG-Apple%20Silicon-d33a54" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-mac-arm64.zip"><img alt="ZIP Apple Silicon" src="https://img.shields.io/badge/ZIP-Apple%20Silicon-545454" /></a></td></tr>
    <tr><td>macOS · Intel</td><td><a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-mac-x64.dmg"><img alt="DMG Intel" src="https://img.shields.io/badge/DMG-Intel-d33a54" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-mac-x64.zip"><img alt="ZIP Intel" src="https://img.shields.io/badge/ZIP-Intel-545454" /></a></td></tr>
    <tr><td>Windows · x64</td><td><a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-win-x64-setup.exe"><img alt="Setup x64" src="https://img.shields.io/badge/Setup-x64-d33a54" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-win-x64.exe"><img alt="Portable x64" src="https://img.shields.io/badge/Portable-x64-545454" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-win-x64.msi"><img alt="MSI x64" src="https://img.shields.io/badge/MSI-x64-545454" /></a></td></tr>
    <tr><td>Windows · ARM64</td><td><a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-win-arm64-setup.exe"><img alt="Setup ARM64" src="https://img.shields.io/badge/Setup-ARM64-d33a54" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-win-arm64.exe"><img alt="Portable ARM64" src="https://img.shields.io/badge/Portable-ARM64-545454" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-win-arm64.msi"><img alt="MSI ARM64" src="https://img.shields.io/badge/MSI-ARM64-545454" /></a></td></tr>
    <tr><td>Linux · x64</td><td><a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-linux-x86_64.AppImage"><img alt="AppImage x64" src="https://img.shields.io/badge/AppImage-x64-d33a54" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-linux-x86_64.deb"><img alt="DEB x64" src="https://img.shields.io/badge/DEB-x64-545454" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-linux-x86_64.rpm"><img alt="RPM x64" src="https://img.shields.io/badge/RPM-x64-545454" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-linux-x86_64.tar.gz"><img alt="TAR.GZ x64" src="https://img.shields.io/badge/TAR.GZ-x64-545454" /></a></td></tr>
    <tr><td>Linux · ARM64</td><td><a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-linux-arm64.AppImage"><img alt="AppImage ARM64" src="https://img.shields.io/badge/AppImage-ARM64-d33a54" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-linux-arm64.deb"><img alt="DEB ARM64" src="https://img.shields.io/badge/DEB-ARM64-545454" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-linux-arm64.rpm"><img alt="RPM ARM64" src="https://img.shields.io/badge/RPM-ARM64-545454" /></a> <a href="https://github.com/hikariatama/libmov/releases/download/v0.0.1/libmov-linux-arm64.tar.gz"><img alt="TAR.GZ ARM64" src="https://img.shields.io/badge/TAR.GZ-ARM64-545454" /></a></td></tr>
  </tbody>
</table>

CI replaces the draft for this version on rebuild. Before publication, maintainers can download it from [Releases](https://github.com/hikariatama/libmov/releases). Checksums: `SHA256SUMS.txt`.


## Prerequisites

- Node.js 24 and Bun 1.4.2.
- Your own TheTVDB API key for catalog search and Discover. Add it on the first-launch setup screen.

## Development

```sh
cd app
bun install --frozen-lockfile
bun run dev
```

The setup screen checks your key with TheTVDB and saves it using system encryption. Subscriber PINs are supported when required. Developers can also use `TVDB_API_KEY` in the environment or an ignored `app/.env` file. Watchlist and watched data stay local.

## Checks

```sh
cd app
bun run check
bun run build
```

The optional `bunx playwright test` suite uses a temporary library and requires a configured live catalog.

## Packaging

```sh
make build
make build PLATFORM=mac ARCH=arm64 TARGET=dmg
```

Artifacts are written to `app/release/`. See [project structure](project.md), [build and API notes](GOTCHAS.md) and [third-party licenses](THIRD_PARTY.md).
