# EasyNote release engineering progress

**Snapshot date:** 2026-11-13
**Starting commit:** `00f11ea7e3c4f406182421f959711ce0a248ad23`
**Working branch:** `codex/release-engineering`
**Release state:** NOT READY — unsigned build; protected Windows uninstall and interactive QA are not yet validated.

## Completed in this working branch

- Updated Electron Builder from locked `26.18.0` to `26.18.1`; Electron remains locked at `45.3.1`.
- Added a root npm override pinning all resolved `minimatch` copies to patched `11.0.8`. A clean `npm ci`, fresh `npm audit`, static checks, and Windows x64 NSIS build passed with this dependency tree.
- Added five built-in Node release preflight tests for locked versions, local PDF resources, logos/icons, CSP and Electron security settings, and x64 NSIS/data-preservation configuration.
- Updated the Windows Actions build to run the preflight tests and dependency audit, and to verify that its unsigned artifact really is unsigned before upload.
- Added release, signing, progress, and Windows QA documents. No frontend, application logic, backend, IndexedDB schema, installed app, or existing installer was changed.

## Build evidence

- `npm ci`: PASS; 270 packages installed, 0 audit findings. npm 11 warned that the optional `electron-winstaller` install script was not covered by its install-script approval list; the Windows x64 build nevertheless completed successfully.
- `npm audit --audit-level=moderate`: PASS; 0 vulnerabilities.
- `npm run test:release`: PASS; 5/5.
- Windows x64 NSIS build: PASS once under installed Node 26.13, in a separate directory outside the repository and without signing credentials. This was a dependency/configuration build check, not a signed release build.
- Test installer: `E:\EasyNote-validation-output\EasyNote-Setup-1.0.0.exe`, 124,078,272 bytes, SHA-256 `07647DB6D603016B8732D15539F2B19152836CB94C242C38FEED4065E09B34C4`.
- The test installer, `win-unpacked\EasyNote.exe`, `win-unpacked\resources\elevate.exe`, and generated NSIS uninstaller were reported/verified unsigned. The original `E:\EasyNote\dist` installer was not touched.
- Later builds under Node 22.12.0 and 22.23.5 failed when Smart App Control blocked Electron Builder's attempt to launch the generated unsigned setup executable while extracting the NSIS uninstaller. Code Integrity events 3077/3033 name those temporary validation-output setup files. No security settings were changed, and the previously installed blocked `Un_K.exe` was not executed. GitHub-hosted runner behavior remains unverified.

## Remaining release blockers

1. Choose and obtain an approved signing route. The repository has no SignPath approval, project, signing policy, certificate, or API credentials. Never put signing secrets or private keys in the repository.
2. Ensure the trusted signing service is invoked by electron-builder for the standalone NSIS uninstaller **before** it is embedded. A post-build signature request for the outer installer alone does not fix `Un_K.exe`.
3. Run the complete manual checklist on Windows with Smart App Control enabled, especially install, uninstall, data retention, PDF editing/export, and offline behavior.
4. Review the dependency override in the proposed pull request. The locked Windows packaging path passed, but this does not prove every code path in all transitive consumers is compatible with minimatch 11.

See [CODE-SIGNING.md](CODE-SIGNING.md), [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md), and [WINDOWS-QA-REPORT.md](WINDOWS-QA-REPORT.md).
