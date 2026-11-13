# EasyNote privacy notice — draft for owner review

**Draft based on source inspection; not legal advice and not yet approved for publication.** Verify this notice against the exact release build before using it as the public privacy policy.

## Data stored on this device

The desktop app's active notebook store uses IndexedDB on the local EasyNote application origin. It stores notebook/page data and imported PDF bytes locally. The current Electron configuration uses a stable `easynote://app` origin. The installer is configured to retain app data when the app is uninstalled; uninstalling EasyNote therefore should not be described as deleting notebooks. Users should make their own backups before removing profile data.

## Network use

Source inspection of the active desktop entry point and store found no active cloud synchronization or Firebase authentication integration. Firebase-related source files remain in the repository but are not imported by the current active entry point. The interface has legacy claims about cloud saving, Google sign-in, subscriptions, and payment verification that do not match the offline store implementation. The current payment verifier returns success without checking a provider, so no actual payment or entitlement should be inferred from the UI. These claims must be corrected or the functionality implemented and independently reviewed before a public release.

The app contains user-triggered external links, including community and payment URLs. Opening them invokes an external browser and requires internet access. This notice has not yet established every destination's current privacy practices or the data those sites collect. Review the actual linked sites and disclose them before release. The in-app payment flow is a placeholder and must not be used to sell a paid plan until server-side payment verification and entitlement handling exist.

## Local files and permissions

PDF import and export operate on files selected by the user. Confirm the exact file-access behavior and supported formats using the release build. Do not send documents to an online service unless a future, reviewed implementation explicitly does so and this notice is updated.

## Children, analytics, contact, and retention

The current inspected desktop code does not establish an analytics or telemetry service, a support contact, an account system, or cloud retention controls. The project owner must decide whether these statements are accurate for the complete package, supply a contact method, and add any applicable jurisdiction-specific terms before publication.

## Owner checklist before adoption

- Inspect runtime traffic from a clean release build and confirm no hidden telemetry or remote resources.
- Reconcile all visible UI promises with implementation, especially cloud, sign-in, upgrade, subscription, and payment wording.
- Identify external destinations and link their own privacy notices.
- Provide a maintainer contact and data-rights request process if required.
- Obtain qualified privacy/legal review for the intended distribution regions.

For the credential alert classification and repository evidence, see [Security alert review](docs/SECURITY-ALERT-FIREBASE-KEY.md) and the [feature implementation audit](docs/FEATURE-IMPLEMENTATION-AUDIT.md).
