# Third-party notices

EasyNote's MIT license applies to EasyNote's original code and documentation. It does not replace licenses for third-party components.

| Component | Version / location | License and attribution |
| --- | --- | --- |
| Firebase JavaScript SDK | Firebase 11.0.2 files in `libs/firebase-*.js` | Apache-2.0, Google LLC. The SDK files are retained in this repository but are not imported by the active offline app entry point. [Upstream license](https://github.com/firebase/firebase-js-sdk/blob/master/LICENSE) |
| PDF.js | 4.7.76, `libs/pdf.min.mjs`, `libs/pdf.worker.min.mjs`, `libs/pdfjs/` | Apache-2.0, Mozilla Foundation. See `libs/PDFJS-LICENSE`. [Upstream license](https://github.com/mozilla/pdf.js/blob/master/LICENSE) |
| PDF-Lib | 1.17.1, `libs/pdf-lib.min.js` | MIT, Andrew Dillon. See `libs/PDF-LIB-LICENSE.md`. [Upstream license](https://github.com/Hopding/pdf-lib/blob/master/LICENSE.md) |
| Inter font | WOFF2 files in `css/fonts/`, stylesheet `css/inter.css` | SIL Open Font License 1.1, The Inter Project Authors. See `css/fonts/OFL.txt`. [Upstream license](https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt) |
| PDF.js CMaps | `libs/pdfjs/cmaps/` | Adobe BSD-style license; see `libs/pdfjs/cmaps/LICENSE`. Retain the notice with redistributed maps. |
| PDF.js standard fonts | `libs/pdfjs/standard_fonts/` | Includes Foxit/PDFium BSD and Liberation OFL notices; see `LICENSE_FOXIT` and `LICENSE_LIBERATION` in that directory. |

The Windows Electron package also contains Electron and Chromium runtime notices supplied by Electron Builder (including `LICENSE.electron.txt` and `LICENSES.chromium.html` in an unpacked build). The generated Chromium credits include components that may be optional or specific to other platforms; the credits alone do not prove which code is compiled into the Windows build. Generate and review a Windows-specific software bill of materials for each release.

Build-time npm dependencies and their license metadata are recorded in `package-lock.json`; they are not automatically runtime components, but should be included in a complete provenance/license review. The lockfile contains some license expressions and a transitive `truncate-utf8-bytes` package declared WTFPL. Ask SignPath to clarify whether its “all components” eligibility condition applies to build-only tools in this case.

The full provenance/license status of all logo, icon, and other files under `assets/` and `build/` is not currently documented. Add an attribution or compatible license/provenance record for each such asset before an eligibility claim. This notice is not a substitute for a release-specific SBOM or legal review.

`libs/css2` is included by the current packaging glob but has no active reference or documented provenance in the inspected app. Review whether it should remain in a future packaging revision, and record its upstream license before distribution. Do not assume unreferenced means safely removable without checking all use cases.

See the [Windows component inventory and CycloneDX package-lock SBOM](docs/COMPONENT-INVENTORY-WINDOWS.md). The SBOM covers npm packages, not all binaries/assets in the installer. Before applying to SignPath Foundation, document asset provenance and confirm every distributed component meets the Foundation's current terms.
