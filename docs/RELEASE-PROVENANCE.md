# Release provenance and reproducible build procedure

**Preparation document.** No signed release exists and no bit-for-bit reproducible build claim is made.

## Current build recipe

The project uses `package-lock.json`, Node/npm, Electron 45.3.1 and electron-builder 26.18.1 (see the lockfile for exact versions). On a clean Windows x64 GitHub-hosted runner, the normal unsigned workflow installs locked dependencies and runs the existing Windows NSIS build. The unsigned workflow remains the only build path currently implemented for EasyNote; this document does not change it.

For local reproduction from a clean checkout:

```powershell
git checkout <reviewed-commit>
npm ci
npm run dist
```

The expected installer path is `dist/EasyNote-Setup-1.0.0.exe`. Use a clean Windows x64 environment and record Node, npm, OS image, workflow/action revisions, commit SHA, lockfile SHA-256, build logs and output SHA-256. Do not overwrite an existing user installer; use a fresh checkout/worktree and separate output location for investigations.

## Provenance record required per release

Record and retain:

- repository URL, protected release ref, full commit SHA, review identities and approval record;
- GitHub Actions workflow URL/run ID, workflow source revision, runner image, Node/npm versions and pinned action SHAs;
- `package-lock.json` digest and generated SBOM mapping packaged files to versions/licenses;
- unsigned candidate name, size, SHA-256, and build log;
- test evidence for the exact candidate, including install, update/uninstall data behavior, offline use and signature verification;
- SignPath signing request/approval identifiers, returned artifact digest, certificate chain, signature timestamp and post-sign verification when signing is eventually enabled;
- release page and published asset digest.

## Reproducibility status and limitations

The current CI workflow demonstrates that a Windows x64 installer can be built, but a successful build is not proof of deterministic byte-for-byte output. No independent clean-room comparison or reproducibility attestation is established here. Electron/Chromium packaging, timestamps, generated resources, runner image drift and action revisions can affect output. Before making a reproducible-build claim, define the expected normalization, build the same reviewed commit in independent clean environments, compare outputs, and document any nondeterministic fields. SignPath's trusted GitHub origin metadata is provenance evidence; it does not by itself establish deterministic reproducibility.

## Signing boundary

The SignPath Foundation GitHub workflow expects the built artifact to be uploaded before the signing request and verifies GitHub origin metadata. For OSS, all preceding jobs must use GitHub-hosted agents. Do not pass credentials in command lines or persist private keys in this repository. A signed artifact must be labeled and published only after signature, timestamp, digest, and provenance checks pass.
