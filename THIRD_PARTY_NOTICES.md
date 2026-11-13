# Third-party notices

EasyNote's MIT license applies to EasyNote's original code and documentation. It does not replace licenses for third-party components.

| Component | Version / location | License and attribution |
| --- | --- | --- |
| Firebase JavaScript SDK | Firebase 11.0.2 files in `libs/firebase-*.js` | Apache-2.0, Google LLC. The SDK files are retained in this repository but are not imported by the active offline app entry point. [Upstream license](https://github.com/firebase/firebase-js-sdk/blob/master/LICENSE) |
| PDF.js | 4.7.76, `libs/pdf.min.mjs` | Apache-2.0, Mozilla Foundation. The bundled file includes its license notice. [Upstream license](https://github.com/mozilla/pdf.js/blob/master/LICENSE) |
| PDF-Lib | 1.17.1, loaded from jsDelivr at runtime | MIT, Andrew Dillon. [Upstream license](https://github.com/Hopding/pdf-lib/blob/master/LICENSE.md) |
| Inter font | Google Fonts CSS in `libs/css2`; font files are requested from Google Fonts | SIL Open Font License 1.1, The Inter Project Authors. [Upstream license](https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt) |

The Windows Electron package also contains Electron and Chromium runtime notices supplied by Electron Builder (including `LICENSE.electron.txt` and `LICENSES.chromium.html` in an unpacked build). Build-time npm dependencies and their license metadata are recorded in `package-lock.json`.

Before applying to the SignPath Foundation, review the full dependency and asset inventory and ensure every component included in a signed distribution meets the Foundation's current terms.
