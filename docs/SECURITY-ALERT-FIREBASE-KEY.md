# GitHub Google API key alert review

**Review snapshot:** 2026-11-13. Credential values are intentionally omitted.

## Finding and classification

- Alert location: `js/firebase-config.js`, line 5, in flagged commit `6ef708c19724696f02612f9fb4e137aeec1602f1`.
- The value is assigned to the standard Firebase web configuration property `apiKey`, beside Firebase `authDomain`, `projectId`, `storageBucket`, and web-app `appId` fields. It has the normal Google API key shape. Source context classifies it as a **Firebase Web API key**, not a Gemini Developer API key, service-account credential, OAuth client secret, or private key.
- Firebase says its service API keys identify the project/app and are not authorization; access control comes from IAM, Firebase Security Rules and App Check. Therefore the alert is a **public Firebase key detection, not by itself proof of a confidential secret leak**. This conclusion depends on the key being a Firebase-provisioned key restricted to Firebase APIs. The project’s Google Cloud API restrictions and quotas cannot be inspected from this repository and must be checked by the project owner.
- No key value is reproduced in this report or repository documentation.

Official guidance: [Firebase API keys](https://firebase.google.com/docs/projects/api-keys), [Firebase security checklist](https://firebase.google.com/support/guides/security-checklist), and [Google Cloud API key best practices](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices).

## How the repository uses it

The config module initializes a Firebase app and imports the Firebase 11.0.2 SDK from `gstatic`. However, no active Electron entry-point module imports `js/firebase-config.js`, and `js/store.js` is an IndexedDB/offline stub rather than Firebase Auth/Firestore code. Firebase-related local modules and this configuration are retained by the broad `js/**/*` and `libs/**/*` packaging globs, but are unused by the current app entry point. If the config module were loaded, its SDK imports would require internet access.

The repository has no `firebase.json`, `.firebaserc`, Firestore rules, Realtime Database rules, or Storage rules. No active Firestore, Realtime Database, or Storage operation was found in the Electron app. Actual console-side rules, enabled APIs, usage, quotas, and key restrictions are **not verifiable from this repository**.

## Repository and history scan

A value-safe high-confidence scan of tracked content and reachable Git history, plus the exact flagged commit, found the Firebase `apiKey` occurrence in this config context. It found no service-account private-key block, AWS access-key pattern, GitHub personal access token pattern, Slack token pattern, or Stripe secret-key pattern. Pattern scans cannot guarantee detection of every credential format; GitHub Advanced Security and a dedicated secret scanner remain useful.

## Required owner checks (no changes made)

In Google Cloud Console, select the project associated with this Firebase config and inspect **APIs & Services → Credentials**:

1. Confirm this is the Firebase Web app’s `Browser key`/Firebase-provisioned key, not a Gemini Developer API key or a general-purpose Google Cloud key.
2. Confirm API restrictions allow only the Firebase-related APIs genuinely required by the Firebase app. Do not include Generative Language API/Gemini on a publicly included Firebase key. If Authentication is intentionally used, Firebase documents Identity Toolkit and Secure Token API requirements; this Electron build currently does not use Auth. Do not add unrelated APIs.
3. Review key usage, quotas, billing alerts, and suspicious requests. Firebase recommends tightening Identity Toolkit quotas when password-based Authentication is used.
4. Review Firebase Authentication providers, Firestore rules, Realtime Database rules, and Storage rules in Firebase Console. No rule files were found here, so this audit cannot attest to their safety.
5. If the key is a Firebase web key with correct restrictions, rotation is not required solely because it is public in source. If the console shows it is a Gemini key, unrestricted general-purpose key, or associated with unexpected billable APIs, treat that as a genuine exposure and follow the owner-controlled rotation plan below.

## Conditional rotation plan for a genuinely sensitive key

Do not revoke the existing key first. The project owner should create a replacement credential with least-privilege API restrictions, update the actual consuming service/configuration, test it, monitor successful use, then revoke the old credential and inspect billing/audit logs. If it is a Gemini Developer API key in client code, move the call behind a trusted server and use a server-side credential; replacing it with another public client-side key is not a fix. This repository’s desktop app has no such active Gemini integration, so no code rotation was performed.

## Severity

**Low / informational for confidentiality if confirmed as a correctly restricted Firebase Web API key.** Potentially **High** if console inspection shows the value is a Gemini key or an unrestricted key usable for billable/non-Firebase APIs. Separate from this alert, the app contains a **High release-integrity issue**: its payment verifier always succeeds locally; see the feature audit. No key was rotated, revoked, disabled, or deleted.
