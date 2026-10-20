# Hibu Hanzi Widget (desktop)

Frameless, always-on-top widget that cycles through Hán tự. The page itself is `../widget.html`
(`../src/widget/`); this folder is only the Electron shell around it.

- Drag the card to move it (the position is remembered).
- Double-click: next character.
- Right-click: settings (source, HSK levels, interval, size) and Thoát.

## Run

```bash
npm install
npm start          # builds ../widget.html into ./renderer, then opens the widget
npm run dev        # loads http://localhost:5173/widget.html; run `npm run dev` in FE first
npm run dist       # packages installers into ./dist (.deb and AppImage on Linux)
```

On Linux the app runs through XWayland (`--ozone-platform=x11`, passed on the command line): Wayland does not let apps keep a
window on top or move it themselves.

## Release

Installers are built by `.github/workflows/desktop-release.yml` on Windows, macOS and Linux and
attached to a GitHub Release. To publish a new version:

1. Bump `version` in `desktop/package.json` (e.g. `0.2.0`).
2. Commit, then push a matching tag: `git tag v0.2.0 && git push origin v0.2.0`.

The web app links to `releases/latest/download/<file>`, so the "Tải app" button always serves the
newest build. The installers are not code-signed: Windows shows a SmartScreen warning
("More info → Run anyway") and macOS needs right-click → Open the first time.
