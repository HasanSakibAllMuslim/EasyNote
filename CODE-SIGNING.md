# EasyNote Windows code signing

## Current state

The current Actions workflow intentionally produces an unsigned NSIS installer. The isolated validation build also verified `NotSigned` for the final setup executable, `EasyNote.exe`, and `elevate.exe`. During packaging, Electron Builder logged that signing was skipped for its generated `__uninstaller.exe`. There is no SignPath application approval, project/policy configuration, certificate, or signing credential in this repository.

## Correct signing point

The locked Electron Builder 26.18.1 implementation (`app-builder-lib/out/targets/nsis/NsisTarget.js`) generates a standalone `__uninstaller.exe`, calls `packager.signIf(uninstallerPath)`, and then runs the final NSIS compile with that signed file as the uninstaller payload. After compilation it signs the outer installer. This is the lifecycle needed to prevent NSIS's temporary `Un_*.exe` copy from being unsigned. The existing project does not specify a custom NSIS script; Electron Builder logs that a custom script prevents its built-in uninstaller signing path.

Electron Builder 26's supported signer extension point is `win.signtoolOptions.sign`. Its callback receives each executable path and can delegate signing to an external signer. `win.signtoolOptions.signingHashAlgorithms` and `rfc3161TimeStampServer` control digest and timestamp behavior. Any implementation must fail closed when signing is requested but credentials, provider, timestamp, or signature verification fail.

## SignPath routes and limits

### SignPath Foundation GitHub Action

The SignPath GitHub integration accepts a GitHub workflow artifact and returns a signed artifact. Applied to the current single-file PE artifact, this signs the **outer NSIS setup file after the build**. That cannot retroactively sign the separately generated uninstaller embedded inside it. SignPath supports nested signing for documented composite formats, but the reviewed artifact-configuration documentation does not establish that an NSIS self-extracting installer is a supported deep-signing container. Do not assume this route fixes `Un_K.exe`.

The Foundation program requires project approval and eligibility. Its published conditions require an already released project, active maintenance, an OSI-approved license for all components, no proprietary components, documented functionality, and manual approval for each release. EasyNote currently has no GitHub Release, so it does not yet meet the published released-form condition. Eligibility is **not currently met/confirmed**; a maintainer must publish the intended form and complete the application and component/license review. If the Foundation provides the certificate, the publisher identity is SignPath Foundation. The Foundation subscription is free; no paid price applies to it.

### SignPath Code Signing Gateway / KSP

SignPath documents the Windows Key Storage Provider (KSP) as a **Code Signing Gateway** crypto provider. The private key remains on SignPath's HSM; Windows SignTool uses the provider and requires an API token, organization/project/policy identifiers, and a public `.cer` file. SignPath documents the SignTool KSP parameters and places timestamp correctness on the caller. Gateway has no public price found in SignPath's documentation; request a quote and confirm KSP/CI entitlement with SignPath. Commercial certificates can be created from a CSR generated in SignPath (key held on its HSM) and issued by a trusted CA, or an existing RSA PFX can be imported; SignPath recommends HSM-generated key material over PFX import. A self-signed/test certificate is not trusted by Windows.

This repository now has an **opt-in local/runner integration**, not an enabled signing pipeline:

- `npm run dist:signpath` uses the Electron Builder **26.18.1** `win.signtoolOptions.sign` callback, not the v27 `win.sign` schema.
- The callback uses SignPath KSP + SignTool, adds SHA-256 Authenticode and RFC 3161 timestamp arguments, then runs SignTool verification. Electron Builder invokes the callback for its generated NSIS uninstaller before it embeds it, and for the final setup executable. Thus it covers both required signing moments when real Gateway credentials/provider are present.
- It fails closed when Windows, required provider configuration, SHA-256, signing or signature verification is unavailable. The existing `npm run dist` and GitHub unsigned workflow are unchanged.
- The integration has only been tested with mocked SignTool commands and configuration checks. No real SignPath request, signature, timestamp, KSP installation or signed installer has been tested.

Before enabling this route in GitHub Actions, confirm with SignPath that the account/plan allows KSP use on GitHub-hosted Windows Actions runners and that its policies accept the Electron Builder NSIS lifecycle. The SignPath GitHub connector's artifact-based action is GitHub Actions-compatible and verifies GitHub workflow origin, but signs an uploaded artifact after the build; that alone cannot sign the pre-embedded NSIS uninstaller. If using the Foundation program instead, obtain explicit SignPath guidance for signing this NSIS lifecycle; do not assume the generic artifact action handles it.

Public pricing: SignPath publishes the Foundation subscription as free, but I found no official public commercial Gateway price. Ask SignPath for a current quote. The separate publicly documented costs of a commercial certificate authority may vary by CA, certificate type, and identity-validation requirements; obtain a quote from the selected trusted CA.

## Required release signing sequence

1. Build the app with Electron Builder's supported signer integration enabled and required signing enforced.
2. Sign and verify `EasyNote.exe` and any project-produced executable helpers selected by policy.
3. Let Electron Builder generate the standalone NSIS uninstaller; sign and verify that file before the NSIS setup compile embeds it.
4. Sign and verify the final setup executable after packaging.
5. Require Authenticode `Valid` status and inspect the RFC 3161 timestamp for every signed output. Never label a file signed based solely on a CI step's success message.
6. Test install/uninstall on Windows with Smart App Control enabled. Confirm Code Integrity records no block for the generated `Un_*.exe` helper and confirm application data is retained.

Use GitHub Actions **Secrets** for `SIGNPATH_API_TOKEN`; use repository variables for `SIGNPATH_ORGANIZATION_ID`, `SIGNPATH_PROJECT_SLUG`, `SIGNPATH_SIGNING_POLICY_SLUG`, `SIGNPATH_CERTIFICATE_FILE` (a runner path, not certificate contents), and optionally `SIGNPATH_TIMESTAMP_URL`. SignPath's KSP also needs `SIGNPATH_CONFIG_FILE` or its documented environment configuration and the installed Windows KSP. Do not request secrets in chat or commit a private key, PFX/P12, password, token, or signing certificate with private key material. The public certificate alone is not a private key, but does not make a signing workflow functional by itself.

## Human actions required

- Apply to SignPath Foundation and wait for approval, or select/enable an appropriate Code Signing Gateway service.
- For Gateway, ask SignPath for written confirmation of Gateway/KSP subscription pricing and GitHub-hosted Windows Actions support. Decide the publisher identity and obtain a trusted commercial certificate, ideally by generating the CSR inside SignPath and submitting it to the CA; import only the issued public certificate into SignPath.
- Create the SignPath project and signing policy, configure KSP and policy approval requirements, and confirm timestamping, SHA-256 and certificate selection.
- Configure the required GitHub secret and variables directly in repository settings. Install/configure the SignPath KSP on the Windows runner in a reviewed workflow change; then add a protected manual signing job that uses `npm run dist:signpath`, checks signatures on app executable, embedded uninstaller and final installer, and retains audit evidence. Never send secret values in chat.
- Approve signing requests if the selected policy requires manual approval.
- Review and approve a pull request before any workflow changes are merged or a release is published.
