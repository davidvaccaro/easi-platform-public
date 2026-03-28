# Release Checklist

Use this checklist before creating a release tag for `easi-js`.

## 1) Code State

- [ ] Release commit is on `main`.
- [ ] Working tree is clean.
- [ ] `easi-js/package.json` version matches release target.

## 2) Core Quality Gate

- [ ] Core lane passed on latest `main`:
  - `Core Tests`
- [ ] No unresolved regressions in recently touched modules.

## 3) Functional Gate

- [ ] DIMSE socket lane passed:
  - `DIMSE Socket Tests`
- [ ] Orthanc interop lane passed:
  - `Orthanc DIMSE Interop Tests`
- [ ] Any expected skips/failures are documented with owner + follow-up issue.

## 4) Performance Gate

- [ ] Streaming benchmark lane ran:
  - `Streaming Benchmarks`
- [ ] No material unexplained regressions versus prior baseline.

## 5) Documentation

- [ ] User-facing behavior changes are reflected in docs.
- [ ] New options/environment flags are documented.
- [ ] CI changes are reflected in `easi-js/doc/CI.md`.

## 6) Release Readiness

- [ ] Changelog/release notes drafted.
- [ ] Known limitations and mitigations noted.
- [ ] Final sign-off recorded (owner/date).

## 7) Post-Release

- [ ] Create release tag and publish notes.
- [ ] Verify GitHub Actions completed for release commit.
- [ ] Create follow-up issues for deferred items.
