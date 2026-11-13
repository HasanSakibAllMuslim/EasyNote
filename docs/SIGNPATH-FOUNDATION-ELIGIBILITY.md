# SignPath Foundation eligibility audit

**Audit snapshot:** 2026-11-13. This is a repository review, not an eligibility decision by SignPath. Foundation terms reserve the final decision to SignPath.

## Outcome

**Not eligible to apply as a ready-to-sign released project today; clarification is also required for the complete component inventory, asset rights, and project maintenance/ownership.** The strongest confirmed blockers are the absence of a public release in the form intended for signing and the absence of a sufficiently accurate download page describing all functionality. The Foundation requires both. Its terms also require an OSI-approved license for all components, no proprietary code, active maintenance, project ownership by the signing team, and signing only binaries built from source/build scripts maintained by that team.

## Repository and release evidence

- The public repository is <https://github.com/HasanSakibAllMuslim/EasyNote>, with `main` at `00f11ea7e3c4f406182421f959711ce0a248ad23` at audit time. The Foundation preparation branch is a draft branch, not a release.
- `LICENSE` is MIT and `package.json` declares MIT. This is evidence for the project's declared license, not proof that every artwork, bundled library, generated runtime, build tool, or upstream file is covered by MIT.
- The GitHub Releases API returned an empty list. There is no public release in the installer form intended for signing and no public downloadable release page.
- The successful CI output inspected was a short-lived unsigned GitHub Actions workflow artifact, not a public release. A CI artifact is not evidence that the app has been publicly released in the form SignPath would sign.
- `README.md` describes several core features, but there is no dedicated current download page and some visible application copy promises cloud save, Google sign-in, subscription, and payment verification that the active desktop data layer does not implement. A future download page must describe actual released behavior and known limitations accurately.
- Recent history and CI show active work, but the public repository's short history alone does not establish sustained active maintenance. The repository owner must confirm the maintainers, ownership of all code/build scripts, and ability to maintain releases.

## License and component audit

The declared application license is MIT. The known direct bundled runtime components include:

| Component | Evidence / declared license | Eligibility note |
| --- | --- | --- |
| PDF.js 4.7.76 | `libs/PDFJS-LICENSE`, Apache-2.0 | OSI-approved. Confirm notices and bundled support files are complete. |
| PDF-Lib 1.17.1 | `libs/PDF-LIB-LICENSE.md`, MIT | OSI-approved. |
| Firebase JS SDK 11.0.2 files | Third-party notice states Apache-2.0; retained but not imported by active entry point | Confirm all retained files and license texts; distinguish inclusion in installer from active use. |
| Inter fonts | `css/fonts/OFL.txt`, OFL-1.1 | OSI-approved; retain notices. |
| PDF.js CMaps / standard font data | Bundled data contains Adobe BSD, Liberation OFL, and Foxit/PDFium BSD notices in the package inspected | Keep the component-specific notices with the distribution and verify version/file mapping. |
| Electron / Chromium | Electron-generated `LICENSE.electron.txt` and `LICENSES.chromium.html` in unpacked package | Large upstream dependency tree; supplied Chromium credits are not a per-build SBOM and may list platform/optional components. Produce a Windows-specific inventory and verify license applicability. |
| npm build dependencies | `package-lock.json` contains 270 package records; predominantly MIT/ISC/BSD/Apache, with BlueOak, Python-2.0, 0BSD, license expressions and WTFPL entries | Build-time packages are not necessarily shipped as app code, but every file in the final artifact and applicable Foundation interpretation must be checked. `truncate-utf8-bytes` is transitively used by electron-builder and marked WTFPL; obtain SignPath clarification if it is treated as a project component. |
| Artwork, icon, and other assets | No complete provenance/license record found for all `assets/` and `build/` artwork | Blocker until authorship or compatible open license is documented for every included asset. |

This is a source and packaging inventory, not a legal determination that every transitive dependency is compatible. The Foundation's “all components” language makes an SBOM/file-level audit and clarification prudent, especially for Electron/Chromium, generated font/map data, non-OSI-looking build-tool license expressions, and asset provenance. The Chromium credits include optional or platform-specific notices; their presence alone does not prove those components are linked into the shipped Windows binaries. Conversely, the notice file alone does not prove the final package's complete component set.

## Ownership, maintenance, and process

The public repository is owned by a personal GitHub account. The repo and commit history show one author identity, but they do not prove that person owns or is authorized to sign every source file, artwork item, upstream modification, and build script. No independently assigned reviewer/approver or enforced branch protection was verified. MFA status cannot be inferred from public repository pages. Before applying, document the actual team, source/artwork provenance, review process, and MFA status; do not represent proposed roles as already assigned.

## Functionality / privacy discrepancy

The active desktop store uses local IndexedDB and contains offline stubs for account/payment-related functions. Yet the UI includes copy describing cloud save, Google sign-in, and paid tiers. This discrepancy affects the accuracy of a download page and privacy policy and should be resolved before release/application. This audit does not change application behavior.

## Official requirements and integration boundary

- [Foundation eligibility and certificate conditions](https://signpath.org/terms.html): OSI license for all components, no proprietary code, active maintenance, released in the form to be signed, functionality documented on the download page; ownership/maintenance responsibility, only own binaries, MFA, role and privacy-policy conditions, and manual approvals.
- [Application information](https://signpath.org/apply.html): use the official application route only after blockers are resolved. This preparation did not submit an application.
- [SignPath GitHub trusted build integration](https://docs.signpath.io/trusted-build-systems/github): the artifact must be uploaded to GitHub Actions first; SignPath checks GitHub workflow origin metadata, and OSS workflow jobs leading to signing must use GitHub-hosted agents.
- [Artifact formats](https://docs.signpath.io/artifact-configuration/reference): PE files such as EXE/DLL are Authenticode-signable; MSI/CAB/AppX/MSIX are listed as supported composite formats. NSIS is not listed as a deep-signable composite format.
- [Artifact configuration](https://docs.signpath.io/artifact-configuration/syntax): configurations support nested signing for documented archive/container formats. This does not document an Electron Builder callback or NSIS uninstaller pre-signing facility.
- [Windows KSP](https://docs.signpath.io/crypto-providers/windows): KSP has an MSI unattended installation and `certutil -csplist` verification procedure, but it is a crypto-provider route; the SignPath docs identify it for Code Signing Gateway, not as the Foundation GitHub Action workflow.

## Next evidence needed

1. Publish and document the exact intended installer/release, after resolving user-facing functionality and privacy descriptions.
2. Create a Windows x64 SBOM and map every distributed file to its upstream/version/license; include generated Chromium/Electron and data assets.
3. Document ownership/provenance or compatible licenses for all assets, source and build scripts; ask SignPath about any questionable build-only license if needed.
4. Establish actual Author, independent Reviewer, and Approver identities and required MFA; configure repository review protections.
5. Ask SignPath in writing whether the existing NSIS output format and required uninstaller coverage can be accepted under Foundation's artifact model.
6. Apply only after these items have human verification. No application was submitted by this preparation.

## Step 18 audit update

The Google API key alert is classified separately in [Security alert review](SECURITY-ALERT-FIREBASE-KEY.md): the source context is a Firebase Web API key, which Firebase documents as project identification rather than authorization. The owner still needs to verify Cloud Console restrictions, quotas, and Firebase rules. A [CycloneDX package-lock SBOM and Windows inventory](COMPONENT-INVENTORY-WINDOWS.md) are now present, but the SBOM does not enumerate all actual Windows runtime binaries or assets, and the existing local installer was found stale relative to this source branch. Therefore complete release artifact licensing evidence remains outstanding.

The active source audit also confirms that cloud save, Google sign-in, and actual payment verification are not implemented in the offline store. The legacy UI claims must be resolved before release and before the Foundation download-page condition can be met.
