# Release Checklist

Use this checklist before publishing `@xinonix/easi-js` or creating its release tag. Packaging and validation do not publish the package.

Current release target: **`1.0.0`**, dated October 9, 2026. Publish the validated stable archive under `latest`; the existing `1.0.0-rc.1` remains the historical `next` candidate. Checkboxes describe checks to record for the actual release commit and archive, rather than a claim that publication is already complete.

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
- [ ] `npm run source:check` passes. A clean checkout runs unit and deterministic integration tests without original imaging data or `ext/tools` binaries; local ignored assets are excluded.

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

- [ ] Performance smoke passed for the release commit:
  - `EASI JS Performance Smoke`
- [ ] Streaming benchmark lane passed for the release commit:
  - `Streaming Benchmarks` (dispatch `EASI JS CI` with `run_benchmarks=true` when an ordinary push skips this lane).
- [ ] Review any separate peer comparison results used as release evidence. The scheduled/manual peer comparison lane is optional; record its baseline or run rather than treating an ordinary push skip as a failure.
- [ ] No material unexplained regressions versus prior baseline.

## 6) Documentation and Licensing

- [ ] User-facing behavior changes are reflected in docs.
- [ ] New options/environment flags are documented.
- [ ] CI changes are reflected in `easi-js/doc/CI.md`.
- [ ] Public docs describe the license as source-available, with free community eligibility for qualifying individuals/research/nonprofits and organization groups strictly below USD 5 million in annual consolidated gross revenue. Other use requires commercial licensing subject to the evaluation/transition terms.
- [ ] Operative Community License, ownership/contributor rights, and preserved third-party terms are reviewed for publication. The incomplete commercial agreement template remains outside the archive.
- [ ] Repository-root `LICENSE` and npm package `easi-js/LICENSE` contain identical Community License terms; update both copies together when changing the license.
- [ ] Commercial licensing contact `dvaccaro@xinonix.com` is confirmed and customer requests can receive an appropriate written agreement. No price, support commitment, or signed agreement is implied by installation.

## 7) Publication Readiness

- [ ] Changelog/release notes drafted.
- [ ] Known limitations and mitigations noted.
- [ ] npm organization/scope ownership and publishing rights for `@xinonix` are verified by the owner; local package creation does not reserve the name or establish registry access.
- [ ] Bundled API contracts match the runtime, and source tests pass in a checkout without the private documentation companion. Synchronize canonical documentation/contracts when maintained; publish reader-facing documentation separately.
- [ ] Before making the source repository public, inspect every published branch and tag for historical original imaging assets and external binaries. Current-tree removal and the npm allowlist do not clear Git history. Keep any original corpus and pre-rewrite Git bundle local.
- [ ] Final sign-off recorded (owner/date).

Publication is a separate, explicitly authorized manual step. The owner authorized the `1.0.0` launch on October 9, 2026. Use `latest` for the stable release and `next` for future prereleases. The first publication of `1.0.0-rc.1` also received npm's automatic `latest` tag; npm refused its removal. Publishing stable `1.0.0` under `latest` replaces that default while leaving `next` on the historical candidate unless explicitly moved later. Verify the actual registry tags after publication.

Run these commands from `easi-js` after completing the gates for the stable version, including `publishConfig.tag: "latest"` and matching lockfile metadata. Use the leading `./` when publishing the exact validated archive:

```bash
npm run package:pack
npm publish ./artifacts/xinonix-easi-js-1.0.0.tgz --access public --tag latest
npm view @xinonix/easi-js@1.0.0 version dist.integrity dist.tarball
npm dist-tag ls @xinonix/easi-js
```

Compare registry integrity with the `.manifest.json` produced alongside the archive. In a fresh consumer directory, install the published stable version and execute its documented offline imports/examples:

```bash
npm install @xinonix/easi-js@1.0.0
```

Future prereleases use an incremented prerelease version, a newly validated archive, and an explicit `--tag next`. CI uploads validation archives and never publishes to npm.

Published versions are immutable: changes after `1.0.0` require a new version and a newly validated archive. A successful npm submission can still await registry scanning; verify registry availability, tags, integrity, and a clean installation before announcing a release.

## 8) Post-Release

- [ ] Create the matching `v1.0.0` Git tag on the release commit and publish GitHub release notes in `davidvaccaro/easi-platform-public`.
- [ ] Verify GitHub Actions completed for release commit.
- [ ] Verify registry version, distribution tag, and integrity match the approved archive.
- [ ] Install the published version into a clean consumer and confirm the documented imports and examples.
- [ ] Create follow-up issues for deferred items.
