# Release Checklist

Use this checklist before publishing `@xinonix/easi-js` or creating its release tag. Packaging and validation do not publish the package.

## 1) Code State

- [ ] Release commit is on `main`.
- [ ] Working tree is clean.
- [ ] `easi-js/package.json` version matches release target.
- [ ] Package-lock root metadata matches the package name, version, engines, and license.

## 2) Core Quality Gate

- [ ] Core lanes passed for the actual release commit on supported Node.js versions:
  - `Core Tests (Node 22.x)`
  - `Core Tests (Node 24.x)`
- [ ] No unresolved regressions in recently touched modules.

## 3) Package Gate

- [ ] Packaging lanes passed for the release commit:
  - `Package Validation (Node 22.x)`
  - `Package Validation (Node 24.x)`
- [ ] Run `npm ci` and `npm run package:check` on Node.js 22 and 24. The check installs the actual archive in a clean consumer, validates all public imports, and exercises synthetic DICOM read/write, selection, and FHIR workflows.
- [ ] Run `npm run docs:readme:check` on Node.js 22 and 24. Confirm the shipped README matches source, local links resolve, and all marked offline examples execute with the documented output. Review the separate browser and configured-peer examples against their intended environments.
- [ ] Run `npm run package:check -- --browser` with an isolated Chrome/Chromium browser. Confirm the packed browser consumer executes successfully and the browser bundle contains no Node builtin imports. Configure `EASI_BROWSER_BIN` when the executable is not in the default location.
- [ ] Run `npm run package:pack` and inspect the generated `.tgz` plus `.manifest.json` under `easi-js/artifacts/`.
- [ ] Archive includes the public runtime entries, README, changelog, `LICENSE`, `NOTICE`, and complete third-party license texts. Tests, sample/patient data, the Kitchen Sink, tools, coverage, development dependencies, and other build artifacts are excluded.
- [ ] Record the archive filename, package version, integrity hash, and validation results. Publish the validated archive rather than an unreviewed working-directory snapshot.

## 4) Functional Gate

- [ ] DIMSE socket lane passed:
  - `DIMSE Socket Tests`
- [ ] Orthanc interop lane passed:
  - `Orthanc DIMSE Interop Tests`
- [ ] Any expected skips/failures are documented with owner + follow-up issue.

## 5) Performance Gate

- [ ] Streaming benchmark lane ran:
  - `Streaming Benchmarks`
- [ ] No material unexplained regressions versus prior baseline.

## 6) Documentation and Licensing

- [ ] User-facing behavior changes are reflected in docs.
- [ ] New options/environment flags are documented.
- [ ] CI changes are reflected in `easi-js/doc/CI.md`.
- [ ] Public docs describe the license as source-available, with free community eligibility for qualifying individuals/research/nonprofits and organization groups strictly below USD 5 million in annual consolidated gross revenue. Other use requires commercial licensing subject to the evaluation/transition terms.
- [ ] Operative Community License, ownership/contributor rights, and preserved third-party terms are reviewed for publication. The incomplete commercial agreement template remains outside the archive.
- [ ] Commercial licensing contact `dvaccaro@xinonix.com` is confirmed and customer requests can receive an appropriate written agreement. No price, support commitment, or signed agreement is implied by installation.

## 7) Publication Readiness

- [ ] Changelog/release notes drafted.
- [ ] Known limitations and mitigations noted.
- [ ] npm organization/scope ownership and publishing rights for `@xinonix` are verified by the owner; local package creation does not reserve the name or establish registry access.
- [ ] Companion documentation/API contracts are synchronized and accessible to readers and the CI checkout. Account credentials and repository visibility are configured separately.
- [ ] Final sign-off recorded (owner/date).

Publication is a separate, explicitly authorized manual step. For a validated release candidate such as `1.0.0-rc.1`, use the `next` tag so the candidate does not become the default install:

```bash
npm publish artifacts/xinonix-easi-js-1.0.0-rc.1.tgz --access public --tag next
```

For a stable release, first update the package and lockfile version to `1.0.0`, change `publishConfig.tag` to `latest`, refresh its release notes, repeat the gates above, and create a new archive. Explicitly use `latest` for that validated stable archive; the current candidate metadata defaults to `next`:

```bash
npm publish artifacts/xinonix-easi-js-1.0.0.tgz --access public --tag latest
```

These future commands run from `easi-js` after ownership/access verification and publication authorization. The CI workflow uploads archives and never runs them.

## 8) Post-Release

- [ ] Create release tag and publish notes.
- [ ] Verify GitHub Actions completed for release commit.
- [ ] Verify registry version, distribution tag, and integrity match the approved archive.
- [ ] Install the published version into a clean consumer and confirm the documented imports and examples.
- [ ] Create follow-up issues for deferred items.
