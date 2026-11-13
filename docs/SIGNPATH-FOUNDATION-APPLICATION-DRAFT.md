# SignPath Foundation application — preparation draft

**Not submitted.** The answers below are working notes based on repository inspection, not owner attestations. Verify every answer and resolve the audit blockers before submitting the official form.

## Project details (draft)

- Project: EasyNote, offline-first Windows desktop notebook and PDF markup app.
- Repository: <https://github.com/HasanSakibAllMuslim/EasyNote>.
- License declared in root: MIT.
- Intended platform/artifact: Windows x64 Electron application distributed through an NSIS setup EXE.
- Current release URL: None found during audit. This is a confirmed eligibility blocker.
- Current download page: None found. `docs/DOWNLOAD-PAGE-DRAFT.md` is not published and must not be supplied as an existing page.
- Current signing: unsigned; no Foundation account/application/certificate is configured in this preparation.

## Questions that require truthful owner answers

1. Who owns and maintains every original source file, asset, icon, and build script? Attach provenance/permissions where authorship is not clear.
2. Is every component that ships with the installer OSI-licensed without commercial dual licensing? Provide a Windows-specific SBOM and explain build-only components and optional Chromium notices.
3. Has the exact NSIS installer already been publicly released? Supply its public download URL and version only after doing so.
4. Does the download page accurately describe all user-visible behavior and privacy/network use? Resolve the cloud/sign-in/payment wording mismatch first.
5. Who are the real Author, independent Reviewer, and Approver? Are all required accounts protected by MFA? Do not list unassigned or fictional people.
6. What review protections prevent self-approval and restrict signing to reviewed release commits?
7. Does SignPath Foundation approve an NSIS installer where only outer PE executables can be signed through the documented GitHub artifact integration, or is another installer format/workflow required to sign the uninstaller before embedding?

## Draft explanation

EasyNote is an Electron Windows application with local notebook storage and bundled PDF rendering/editing libraries. The project intends to make Windows releases verifiable through a trusted GitHub-hosted build and manually approved signing requests. The repository presently has no public release, no published download page, and unresolved component/artwork provenance questions; therefore it is not ready for submission. The project will apply only after these issues are resolved and the actual team and release process are documented.

## Official application route

Use the current [SignPath Foundation application page](https://signpath.org/apply.html) after the owner has completed the eligibility work. This draft has not been sent to SignPath.
