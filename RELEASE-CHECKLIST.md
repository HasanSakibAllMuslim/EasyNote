# EasyNote Windows release checklist

Status meanings: **PASS** = executed and verified; **FAIL** = executed and failed; **NOT TESTED** = not executed; **BLOCKED BY HUMAN ACTION** = needs an account, approval, credential, or hands-on Windows QA.

## Source and build

- [x] Electron remains `45.3.1`; lockfile verified.
- [x] Electron Builder `26.18.1` and minimatch override are locked.
- [x] Clean `npm ci` completed in the isolated working clone.
- [x] Fresh `npm audit --audit-level=moderate`: 0 findings.
- [x] Release preflight tests: 5/5.
- [x] Windows x64 NSIS test build completed outside the original `dist` directory.
- [ ] Re-run CI using the final reviewed branch on GitHub-hosted Windows.
- [ ] Review and approve the minimatch major-version override.

## Signing and Smart App Control

- [ ] Sign the EasyNote application executable and applicable project-produced executable helpers.
- [ ] Sign the standalone generated NSIS uninstaller before it is embedded.
- [ ] Sign the final NSIS setup executable after packaging.
- [ ] Verify Authenticode signatures and RFC 3161 timestamps on every required executable.
- [ ] Install and uninstall the signed build on Windows with Smart App Control enabled; confirm there is no `Un_*.exe` block.
- [ ] Confirm all redistributed third-party components satisfy the selected signing program's terms.
- [ ] Human SignPath account/project/policy approval and credentials are configured securely in GitHub.

## Manual application QA

- [ ] Install and launch on supported Windows x64.
- [ ] Create/edit a blank notebook; close and reopen; confirm notes persist.
- [ ] Import a real multi-page PDF; test rendering, worker, navigation, zoom and fit.
- [ ] Test drawing, text, highlights, shapes, eraser, undo and redo.
- [ ] Export an edited PDF; re-import it and inspect pages/annotations.
- [ ] Repeat notebook/PDF tests with network disabled; review console and CSP errors.
- [ ] Uninstall; verify application removal and that user data remains available according to policy.

No GitHub Release may be published until the signing and manual QA checklists have passed and a human has approved the release.
