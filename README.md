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

The desktop app bundles PDF.js, PDF-Lib, and the Inter font locally. Its active data layer stores notebooks and imported PDF bytes in IndexedDB; Firebase-related files remain in the repository for reference but are not imported by the current app entry point. Opening user-selected external links and using the payment links still requires internet access.

## Run from source

Requirements: Node.js LTS and npm.

```powershell
npm ci
npm start
```

## Windows installer

The project uses Electron and electron-builder to create a per-user Windows x64 NSIS installer. A local build is written to `dist/EasyNote-Setup-1.0.0.exe`; keep generated installers out of source history.

To build a new installer, run:

```powershell
npm ci
npm run dist
```

The `prepare:icon` build step prefers `build/logo.png` when present and otherwise uses the supplied `build/icon.png` to generate `build/icon.ico`. The Windows x64 installer includes the full Electron/Chromium runtime and the local PDF.js, PDF-Lib, and Inter assets.

The GitHub Actions workflow builds an unsigned Windows x64 installer and uploads it as the `EasyNote-Windows-x64-Unsigned` workflow artifact. It does not publish a GitHub Release or sign the installer.

The `.blockmap` is an Electron differential-update artifact; this app does not currently implement auto-update. When a release is approved, distribute the installer as a GitHub Release asset rather than adding it to source history.

## Code signing policy

EasyNote 1.0.0 is currently unsigned. No SignPath Foundation approval or signing certificate is in place, and there is no published GitHub Release yet. A public repository or CI artifact does not mean a binary is signed or endorsed. A signed release requires a verified source build, an approved signer and signing policy, manual signing approval, and published verification details.

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

