# EasyNote Windows code signing

## Current state

The current Actions workflow intentionally produces an unsigned NSIS installer. The isolated validation build also verified `NotSigned` for the final setup executable, `EasyNote.exe`, and `elevate.exe`. During packaging, Electron Builder logged that signing was skipped for its generated `__uninstaller.exe`. There is no SignPath application approval, project/policy configuration, certificate, or signing credential in this repository.

## Correct signing point

The locked Electron Builder 26.18.1 implementation (`app-builder-lib/out/targets/nsis/NsisTarget.js`) generates a standalone `__uninstaller.exe`, calls `packager.signIf(uninstallerPath)`, and then runs the final NSIS compile with that signed file as the uninstaller payload. After compilation it signs the outer installer. This is the lifecycle needed to prevent NSIS's temporary `Un_*.exe` copy from being unsigned. The existing project does not specify a custom NSIS script; Electron Builder logs that a custom script prevents its built-in uninstaller signing path.

Electron Builder 26's supported signer extension point is `win.signtoolOptions.sign`. Its callback receives each executable path and can delegate signing to an external signer. `win.signtoolOptions.signingHashAlgorithms` and `rfc3161TimeStampServer` control digest and timestamp behavior. Any implementation must fail closed when signing is requested but credentials, provider, timestamp, or signature verification fail.

## SignPath routes and limits

### SignPath Foundation GitHub Action

The SignPath GitHub integration accepts a GitHub workflow artifact and returns a signed artifact. Applied to the current single-file PE artifact, this signs the **outer NSIS setup file after the build**. That cannot retroactively sign the separately generated uninstaller embedded inside it. SignPath supports nested signing for documented composite formats, but the reviewed artifact-configuration documentation does not establish that an NSIS self-extracting installer is a supported deep-signing container. Do not assume this route fixes `Un_K.exe`.

The Foundation program requires project approval and eligibility. Its published conditions include an already released project and compatible open-source licensing for all included components. EasyNote's README currently says it has no published GitHub Release and has not been accepted; eligibility is therefore **not confirmed**. A maintainer must complete the application and component/license review.

### SignPath Code Signing Gateway / KSP

SignPath documents a Windows Key Storage Provider for `signtool.exe` as part of **Code Signing Gateway**. That route can in principle be called by Electron Builder's v26 custom signer hook while the generated uninstaller still exists, and again for the final installer. This is distinct from the Foundation GitHub artifact action. It requires the appropriate Gateway account/entitlement, an approved SignPath project/policy, provider installation on the runner, an API token, certificate identity, and timestamp configuration. None are available here, so no signing hook or secret-dependent workflow has been enabled or tested.

Before implementing this route, confirm with SignPath that the account supports KSP use from GitHub-hosted Actions and an approval policy compatible with the uninstaller-before-packaging request. If using the Foundation program instead, obtain explicit SignPath guidance for signing this NSIS lifecycle; the generic post-build installer action is insufficient for the uninstaller issue.

## Required release signing sequence

1. Build the app with Electron Builder's supported signer integration enabled and required signing enforced.
2. Sign and verify `EasyNote.exe` and any project-produced executable helpers selected by policy.
3. Let Electron Builder generate the standalone NSIS uninstaller; sign and verify that file before the NSIS setup compile embeds it.
4. Sign and verify the final setup executable after packaging.
5. Require Authenticode `Valid` status and inspect the RFC 3161 timestamp for every signed output. Never label a file signed based solely on a CI step's success message.
6. Test install/uninstall on Windows with Smart App Control enabled. Confirm Code Integrity records no block for the generated `Un_*.exe` helper and confirm application data is retained.

Use GitHub Actions **Secrets** for any API token; use repository variables for non-sensitive project/policy identifiers where appropriate. Do not request secrets in chat or commit a private key, PFX/P12, password, token, or signing certificate with private key material. The public certificate alone is not a private key, but does not make a signing workflow functional by itself.

## Human actions required

- Apply to SignPath Foundation and wait for approval, or select/enable an appropriate Code Signing Gateway service.
- Create the SignPath project, trusted-build policy, signing policy, artifact rules, and timestamp policy; confirm the intended signer identity.
- Configure required GitHub secrets/variables directly in repository settings. Never send their values in chat.
- Approve signing requests if the selected policy requires manual approval.
- Review and approve a pull request before any workflow changes are merged or a release is published.
