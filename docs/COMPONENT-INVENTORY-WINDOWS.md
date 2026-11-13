# EasyNote Windows component inventory

**Scope:** Source/package configuration at this branch plus a read-only inspection of the existing local Windows `dist` output. No installer was built. The existing local installer is stale and cannot be attributed to this branch, so this is not a complete verified bill of materials for a new release binary.

## Current repository build inputs

`package.json` targets Windows x64 NSIS and packages `index.html`, `manifest.webmanifest`, `css/**/*`, `js/**/*`, `assets/**/*`, `libs/**/*`, `electron/**/*`, `build/**/*`, and scripts. No production `dependencies` section exists. The lockfile has 265 third-party npm components, all used as the development/build toolchain. Electron 45.3.1 and electron-builder 26.18.1 are pinned by the lockfile; Electron itself supplies the desktop Chromium/V8 runtime.

| Component family | Version / contents in current source | License/provenance evidence | Inventory status |
| --- | --- | --- | --- |
| Electron / Chromium / V8 | Electron 45.3.1 per `package-lock.json`; Windows runtime is packaged by electron-builder | Electron license and Chromium credits are generated into an unpacked package (`LICENSE.electron.txt`, `LICENSES.chromium.html`). The credits include optional/platform-specific upstream notices. | Exact Windows-linked Chromium component list/build flags still need an SBOM from the exact release build. |
| Windows build toolchain | electron-builder 26.18.1; png-to-ico 3.0.2; complete transitive lock graph | Exact versions and lock metadata in `package-lock.json`; 265 components listed in [CycloneDX SBOM](easynote-package-lock.cdx.json). This SBOM includes build/dev dependencies, not just shipped runtime packages. | Complete npm lock graph inventoried; license expressions and the WTFPL build-only transitive package need Foundation interpretation. |
| PDF.js | 4.7.76; `libs/pdf.min.mjs`, worker, CMaps and standard fonts | Apache-2.0 `libs/PDFJS-LICENSE`; Adobe BSD CMaps notice; Foxit/PDFium BSD and Liberation OFL notices in `libs/pdfjs/`. | Bundled source files and notices present. |
| PDF-Lib | 1.17.1, `libs/pdf-lib.min.js` | MIT, `libs/PDF-LIB-LICENSE.md` | Bundled source and notice present. |
| Firebase JS SDK | Files identified as 11.0.2 in `libs/firebase-*.js`; Firebase config imports remote SDK 11.0.2 | Apache-2.0 listed in `THIRD_PARTY_NOTICES.md` | Included by broad globs but not imported by the active Electron app. Reconsider whether unused files should ship in a future reviewed packaging change. |
| Inter | Seven WOFF2 font files under `css/fonts/` | SIL OFL 1.1 in `css/fonts/OFL.txt` | Bundled with notice. |
| CSS / remote font artifact | `libs/css2` is included by `libs/**/*`; no active reference found | Origin/license mapping and whether stale Google Fonts CSS is necessary are undocumented. | Uncertain; file contains legacy remote-resource risk if later loaded. |
| Logos / artwork | `assets/apple-touch-icon.png`, `assets/avatar.jpg`, `assets/logo.svg`, `assets/user-avatar.svg`; `build/icon.ico`, `build/icon.png` | No per-asset author/provenance/license record found. | **Eligibility blocker:** owner must document authorship or compatible license and source for each asset. |
| App-generated Windows files | NSIS setup and uninstall executables, app executable, `elevate.exe`, runtime DLLs | Generated/included by Electron/electron-builder; preserve upstream notices and identify exact versions/licenses from the final unpacked package. | Exact versions and signature status must be captured from the release candidate. |

## Existing local installer inspection (stale; not a release candidate)

Read-only inspection found `E:\EasyNote\dist\EasyNote-Setup-1.0.0.exe` (SHA-256 `CC1BE38ECB1B5D211A9E714429C5D93F6D93BB68AADDA411753F275C3C8FC939`) and its `win-unpacked` directory. The corresponding `resources/app.asar` contains a legacy `libs/pdf.min.mjs` but does **not** contain the current branch's PDF.js worker, PDF-Lib bundle, CMaps, or standard-font folder. It also contains `build/PUT-YOUR-LOGO-HERE.txt`, which is not a current intended asset. This local package is not demonstrably built from the current branch/commit and is not used as the current source inventory.

The unpacked local runtime contains the Electron app executable, `resources/elevate.exe`, Chromium `.pak`/locale data, `ffmpeg.dll`, D3D/DX compiler files, ANGLE libraries, SwiftShader/Vulkan libraries, ICU data, and Electron/Chromium notices. That list is evidence for the local stale package only. Do not use it to claim the exact contents or versions of a future installer.

## SBOM coverage and release gate

[`easynote-package-lock.cdx.json`](easynote-package-lock.cdx.json) is CycloneDX 1.5 generated from `package-lock.json`. It records 265 npm dependency components, including build/development dependencies. It does **not** enumerate static assets, Electron/Chromium's full Windows runtime components, NSIS-generated files, or file hashes. The `metadata.component` is the EasyNote app with its declared MIT license; third-party component licenses remain individually listed in the SBOM/lockfile and notices.

Before any release, generate a Windows x64 SBOM from the exact unpacked release candidate (including Electron/Chromium, native DLLs, helper executables, static assets, versions, hashes, and license evidence), compare it with the lockfile SBOM, and verify all third-party notices and asset rights. Do not build or publish an installer solely to complete this draft inventory.
