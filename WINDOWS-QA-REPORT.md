# EasyNote Windows QA repor

**Date:** 2026-11-13
**Scope:** isolated Windows x64 packaging/preflight run from `codex/release-engineering`. No installer was manually launched for interactive install/uninstall testing and no signing was performed. Electron Builder internally launches its newly generated setup executable to extract the NSIS uninstaller; on Node 22, Smart App Control blocked that step.

## Results

| Check | Status | Evidence / limitation |
|---|---|---|
| Electron lock version | PASS | `package-lock.json` resolves Electron `45.3.1`. |
| Electron Builder version | PASS | Lockfile resolves `26.18.1`. |
| Clean dependency install | PASS | `npm ci` completed in the separate clone. npm 11 noted an optional install script not approved for execution; builder subsequently completed its Windows packaging tasks. |
| Dependency audit | PASS | Fresh `npm audit --audit-level=moderate`: 0 findings after locking minimatch `11.0.8`. |
| Static release preflight | PASS | 5/5 tests passed for local PDF dependencies/assets, CSP and main-process settings, packaging architecture and uninstall data-preservation setting. |
| Windows x64 NSIS build | PASS in GitHub Actions | [Run 43440817760](https://github.com/HasanSakibAllMuslim/EasyNote/actions/runs/43440817760) passed on hosted Windows Server 2025 with Node 22.23.4/npm 10.9.9. `npm ci`, audit, preflight checks, x64 packaging and unsigned verification passed. A separate Node 26.13 local build also completed. Local Node 22 attempts were blocked by this PC's Smart App Control when Electron Builder launched its generated unsigned setup executable to extract the uninstaller; this is confirmed by local Code Integrity 3077/3033 events. No installed `Un_K.exe` was run. The original `dist` was not used. |
| Test installer signature | FAIL for signed-release requirement | `NotSigned`; SHA-256 `07647DB6D603016B8732D15539F2B19152836CB94C242C38FEED4065E09B34C4`. Unsigned result was expected without credentials. |
| Packaged EasyNote.exe | FAIL for signed-release requirement | `NotSigned`; it was not executed. |
| Packaged elevate.exe | FAIL for signed-release requirement | `NotSigned`; it was not executed. |
| Generated NSIS uninstaller | FAIL for signed-release requirement | Build log explicitly says no signing certificate was configured and signing was skipped for `EasyNote-Setup-1.0.0.__uninstaller.exe`; Builder removes this intermediate after embedding. |
| GitHub Actions installer artifact | PASS as unsigned CI artifact | `EasyNote-Setup-1.0.0.exe`, 124,078,270 bytes; artifact API digest `sha256:f1c05b672d9ee7d944c5d781c9f0d3f6e39b156d7bf00f03f76419b242b26f75`; expires 2026-11-27. Not a release and not suitable as a signed installer. |
| App launch / notebook behavior | NOT TESTED | No application execution or interactive QA was performed. |
| PDF.js real worker rendering / editing / export | NOT TESTED | Static local asset checks only; no PDF was opened. |
| Offline runtime / IndexedDB persistence | NOT TESTED | No network-blocked application session was run. |
| Smart App Control install/uninstall acceptance | NOT TESTED | No signed build exists; blocked `Un_K.exe` was not executed. |
| DLL signing inventory | NOT TESTED | The executable files at the output root and `win-unpacked` were checked; a complete DLL signature inventory was not performed. |

## Manual Windows procedure

Use a disposable Windows 11 x64 test account or VM with Smart App Control **On**. Do not change Defender, SmartScreen, Firewall, or SAC settings. Use a copy of a non-sensitive multi-page PDF and retain an independent backup of test notes.

1. Before installation, verify the downloaded installer hash against the release notes and run `Get-AuthenticodeSignature`. Require `Valid`, the expected publisher, and a valid timestamp for a signing candidate. Do not use an unsigned candidate to test the blocked uninstall path.
2. Install with normal Windows prompts. Launch EasyNote and confirm its publisher in Windows file properties.
3. Create a notebook and note, edit and save it, close EasyNote normally, relaunch, and confirm persistence.
4. Import the multi-page PDF. Check each page renders; navigate first/middle/last pages; use zoom in/out and Fit.
5. Test mouse drawing, text, highlight, shapes, eraser, undo and redo. Save/export, then open the exported PDF again and inspect page count, annotations, text, fonts and images.
6. Disable networking using the Windows test VM's network adapter controls (do not alter security settings). Repeat launch, notebook read/write, local font rendering, PDF open/render/edit/export. Check DevTools for worker errors, CSP violations, missing local resources, renderer exceptions, and unexpected requests. Restore network only after saving test results.
7. Close EasyNote. Use Windows Settings → Apps → Installed apps → EasyNote → Uninstall. Confirm no Code Integrity/SAC warning appears and the app is removed. Confirm the user's EasyNote application data remains available according to the configured policy.
8. Record Windows version, installer SHA-256, signer subject, timestamp status, exact test PDF page count, observed errors, and PASS/FAIL for every feature in the release checklist.

Do not declare release readiness until each manual feature and signed uninstall test has a real result. For detailed gates, see [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md).
