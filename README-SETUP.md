# EasyNote Windows Installer (Electron)

This project wraps the existing EasyNote Offline app in Electron and builds a Windows NSIS installer. The original app files are retained.

## 1. Windows app logo

No extra logo file is required for a clean checkout. The build prefers `build\logo.png` when present and otherwise uses the supplied `build\icon.png`. Keep `build\icon.png` and `build\icon.ico` in place.

During the build, the selected PNG is converted into `build\icon.ico`. That ICO is used for the Windows application and installer icons. The in-window logo and profile avatar use the supplied EasyNote artwork.

## 2. Build on Windows 10/11

1. Install Node.js (LTS), if it is not already installed.
2. Extract the ZIP.
3. Open PowerShell in the project folder (the folder containing `package.json`).
4. Run:

```powershell
npm ci
npm run dist
```

The installer will be created at:

```text
dist\EasyNote-Setup-1.0.0.exe
```

If you want to test the icon conversion separately, run `npm run prepare:icon`. It should create `build\icon.ico`.

## Installer behavior

- Installs per Windows user by default.
- Lets the user choose the installation directory.
- Creates Desktop and Start Menu shortcuts.
- Adds an Uninstall entry in Windows Settings / Control Panel.
- Does not require Google Chrome; Electron ships its own Chromium runtime.
- Keeps the app's IndexedDB origin stable (`easynote://app`) so locally stored notebooks remain available between launches.
- Does not delete app data when the app is uninstalled.

## Notes about the supplied project

- The supplied `js/store.js` is the active local/offline data layer. It uses IndexedDB and provides an automatic local user; the Firebase files in `js/` and `libs/` are not imported by the active `js/main.js` entry point.
- PDF.js 4.7.76, its worker and supporting CMaps/fonts, PDF-Lib 1.17.1, and the Inter font are bundled locally. Core app use and PDF tools do not require internet access. User-opened external links require a connection.
- Keep `index.html`, `js/`, `css/`, `assets/`, `libs/`, and the `easynote` custom protocol unchanged. Changing the protocol creates a new browser storage origin and can make existing local notebooks appear missing.
