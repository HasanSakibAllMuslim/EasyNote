# EasyNote for Windows — download page draft

**Not a published release page.** There is no public EasyNote installer release at this time. Do not add download buttons or imply code signing until an actual release has been published and verified.

## About EasyNote

EasyNote is an offline-first Windows desktop notebook for blank boards and local PDF markup. The inspected source implements board backgrounds, page organization, pen drawing, highlighting, shapes, text, PDF page navigation and zoom, IndexedDB persistence, and PDF export. These features were source-inspected, not all manually tested in this audit. Confirm behavior against the exact release candidate before publication.

## Data and connectivity

Notebook pages and imported PDFs are stored locally in the app's IndexedDB database. The inspected desktop data layer does not currently provide cloud synchronization, Google sign-in, or real subscription/payment verification. Its payment verifier currently returns success without checking an external provider. Legacy interface wording suggests some of those features; resolve the mismatch before publishing a download page. User-opened external links require an internet connection and open in the system browser. See the [feature implementation audit](FEATURE-IMPLEMENTATION-AUDIT.md).

The installer is configured to keep app data when EasyNote is uninstalled. Back up important notebooks before changing Windows profiles or manually removing application data.

## Download and verification

No release asset, version, SHA-256, or signed installer is available on this draft page. When a release is approved, list the exact version, supported Windows architecture, verified download link, SHA-256, signature publisher/timestamp status, release notes, and known issues. Link to [Privacy](../PRIVACY.md), [MIT License](../LICENSE), and [third-party notices](../THIRD_PARTY_NOTICES.md).

## SignPath attribution

Add the exact attribution `Free code signing provided by SignPath.io, certificate by SignPath Foundation` only after Foundation acceptance and only for a release actually signed under that program.
