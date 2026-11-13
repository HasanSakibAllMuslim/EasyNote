# EasyNote code signing policy

**Status: preparation draft.** EasyNote has not been accepted by SignPath Foundation, no certificate is configured, and no signed release exists. Do not describe any current file as SignPath-signed. This policy becomes effective only after the project owner adopts it, assigns the named roles, and SignPath approves the project and policy.

## Project and scope

- Project: EasyNote Windows desktop application.
- Source repository: <https://github.com/HasanSakibAllMuslim/EasyNote>.
- Intended output: the Windows x64 EasyNote application executables and installer, built from this repository's reviewed source and build scripts.
- No third-party binary may be re-signed as though it were EasyNote's own work. Upstream components may be included under their licenses and the current Foundation conditions.

## Required public attribution

If and only if SignPath Foundation accepts EasyNote and a release is actually signed through the program, public materials must include this exact attribution:

> Free code signing provided by SignPath.io, certificate by SignPath Foundation

Until that condition is met, this sentence is a required future attribution and must not be presented as a claim about an existing binary.

## Roles and separation of duties

No individual role assignments are asserted in this draft. Before activation, the repository owner must record real GitHub identities and confirm their access and MFA status with the Foundation.

| Role | Responsibilities | Assignment |
| --- | --- | --- |
| Author | Maintains source and build scripts; proposes changes and prepares release candidates. | Unassigned; owner must name an actual person/account. |
| Reviewer | Independently reviews source/build changes and release provenance; cannot approve their own changes. | Unassigned; owner must name an actual person/account. |
| Approver | Makes the manual SignPath release approval after reviewing the candidate, provenance, and tests. | Unassigned; owner must name an actual person/account. |

If the available team cannot provide independent review and approval, resolve the required role setup with SignPath before applying or signing. Branch protection and GitHub review rules must be configured to enforce the adopted process; they are not represented as active today.

## Release controls

1. Release only from an explicitly reviewed release commit on a protected release branch.
2. Require review of application code, dependency/asset changes, workflow changes, and build scripts. Record reviewer identity and commit.
3. Build on the approved GitHub-hosted workflow from the exact source commit. Preserve workflow run URL, run ID, commit SHA, dependency lockfile hash, toolchain versions, artifact digest, and build logs.
4. Verify the output and test it before requesting signing. The SignPath request must be tied to the trusted GitHub build artifact and its origin metadata.
5. Require a human approver to review every signing request. Do not enable unattended automatic approval.
6. Verify the returned signature, timestamp, signer identity, and SHA-256 after signing. Publish only that verified output and its provenance.
7. Keep signing credentials out of source and logs. Use only SignPath-managed signing and GitHub secret storage for the API token; rotate/revoke credentials when access changes.
8. Retain the unsigned candidate, signed output, attestations, verification results, review record, and release notes for each release.
9. Publish a release only after the project has been accepted and all Foundation conditions are met. The download page must accurately describe the released functionality, data handling, and known limitations.

## Privacy and user data

See [Privacy](PRIVACY.md). Before release, the owner must verify that its description matches the actual shipped build, including any legacy interface copy and all network requests. Do not claim cloud storage or payment processing unless those features are implemented, tested, and covered by the notice.

## Review

Review this policy whenever the signing workflow, team, certificate/program terms, release format, or privacy behavior changes. The current SignPath Foundation terms take precedence over this draft.
