# MD Preview Desktop

A Markdown preview desktop app with **history tracking**, built with Electron.

## Features

- ✍️ **Live Markdown Preview** — edit left, preview right, sync in real-time
- 🔥 **Syntax Highlighting** — via markdown-it + highlight.js
- 🗂️ **History Tracking** — track recently opened files, quickly reopen
- 🌙 **Dark / Light Theme** — toggleable, persisted
- 💾 **Save / Save As** — standard file operations
- 🛠 Cross-platform (Windows / macOS / Linux)

## Tech Stack

- **Electron** — desktop shell
- **markdown-it** — Markdown parsing & rendering
- **highlight.js** — code syntax highlighting
- **electron-store** — persistent history & preferences

## Getting Started

```bash
npm install
npm start
```

## Build

```bash
npm run build        # Windows installer (NSIS)
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Publish / Release

Configure GitHub token in CI, then:

```bash
npm run publish      # Electron-builder auto-publish to GitHub Releases
```

## License

MIT
