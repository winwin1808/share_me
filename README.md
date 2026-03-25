# Cursorful Desktop MVP

Electron MVP for a browser-first screen recorder with editable zooms, local project files, and offline exports.

## Features in this scaffold

- Browser/window source picker backed by Electron `desktopCapturer`
- Local recording metadata + project file persistence
- Auto-generated zoom segments from preview clicks
- Manual zoom editing and aspect-ratio export presets
- Offline export pipeline entrypoint with `ffmpeg`
- GitHub Actions for CI and macOS packaging

## Local development

```bash
npm install
npm run dev
```

## Build and package

```bash
npm run ci:build
npm run package:mac
```

## Signing and notarization

This repo defaults to unsigned local macOS builds. To enable signing later, provide these GitHub secrets:

- `APPLE_ID`
- `APPLE_APP_PASSWORD`
- `APPLE_TEAM_ID`
- `CSC_LINK`
- `CSC_KEY_PASSWORD`

Then update `build.mac.hardenedRuntime` and notarization hooks as needed.
