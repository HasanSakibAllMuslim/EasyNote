# EasyNote

<p align="center">
  <img src="build/icon.png" alt="EasyNote logo" width="112" />
</p>

<p align="center">
  <strong>A focused digital board for lessons, diagrams, and PDF markup.</strong><br />
  Draw, highlight, organize pages, and keep notebooks on your device.
</p>

---

## What it does

- Create blank boards with blackboard, whiteboard, grid, and lined backgrounds.
- Open PDFs and annotate their pages with ink, highlights, shapes, text, and diagrams.
- Organize, duplicate, reorder, and remove notebook pages.
- Export a notebook as a PDF.
- Use a pen, touch display, mouse, or smartboard in the desktop app.

## Data and network use

Notebook content and imported PDF bytes are stored in the app's local IndexedDB database. The desktop app uses the stable `easynote://app` origin so its local notebooks remain available between launches. The installer is configured to leave app data in place when EasyNote is uninstalled.

The current app loads PDF.js and PDF-Lib from jsDelivr and the Inter font from Google Fonts. Those features therefore make network requests and may be unavailable offline. The active offline data layer does not upload notebooks to Firebase; Firebase-related files in the repository are not imported by the current app entry point.

## Run from source

Requirements: Node.js LTS and npm.

```powershell
npm ci
npm start
```

## Windows installer

The project uses Electron and electron-builder to create a per-user Windows x64 NSIS installer. The existing release artifact is `dist/EasyNote-Setup-1.0.0.exe`.

To build a new installer, run:

```powershell
npm ci
npm run dist
```

The current `prepare:icon` build step expects a square PNG at `build/logo.png` and generates `build/icon.ico` from it. The checked-in `build/icon.ico` is the Windows icon used by the existing packaged app; a rebuild will need the PNG input expected by the script.

The existing installer is 103,236,212 bytes (about 98.5 MiB). That exceeds GitHub's browser upload limit and the Contents API's 100 MB limit, although it is just below GitHub's 100 MiB hard limit for Git pushes. Keep this binary out of source history and distribute it as a GitHub Release asset. The `.blockmap` is an Electron differential-update artifact; this app does not currently implement auto-update.

## Code signing policy

EasyNote 1.0.0 is currently unsigned. No SignPath Foundation approval or signing certificate is in place. A public repository alone does not mean a binary is signed or endorsed. This section must be updated with the approved signer, signing process, and team roles before publishing a signed release.

## License status

EasyNote's original code and project documentation are released under the [MIT License](LICENSE). Third-party components retain their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). EasyNote's name and branding are not granted as trademarks by the MIT License.

The SignPath Foundation's free open-source program has additional requirements beyond a public repository and an OSI-approved license. EasyNote has not been accepted into that program.

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html`, `css/` | App interface and styling |
| `js/` | Notebook, editor, rendering, and local storage code |
| `electron/` | Electron main process and local app protocol |
| `assets/`, `build/` | App artwork and Windows icon resources |
| `libs/` | Bundled browser-side libraries and supporting files |
| `scripts/` | Build helper scripts |


