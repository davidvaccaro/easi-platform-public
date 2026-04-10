# CI/CD (GitHub Actions)

This project uses GitHub Actions to run automated quality checks for `easi-js`.

Workflow file:

- `.github/workflows/ci.yml`

## Lanes

The workflow is intentionally split into separate lanes (jobs) so fast deterministic checks are always on, while heavier environment-dependent checks run on schedule or manual trigger.

### 1) Core Tests

- Job name: `Core Tests`
- Trigger: `pull_request`, `push`, `workflow_dispatch`
- Command:
  - `npm test -- --runInBand`
- Purpose:
  - Required correctness gate for normal development/PRs.
  - Runs unit + deterministic integration tests.

### 2) DIMSE Socket Tests

- Job name: `DIMSE Socket Tests`
- Trigger: `schedule`, `workflow_dispatch` (`run_dimse_sockets=true`)
- Command:
  - `npm run test:dimse-sockets`
- Purpose:
  - Runs network/socket DIMSE integration tests.
  - Separated from core to avoid environment-related CI noise.

### 3) Orthanc DIMSE Interop Tests

- Job name: `Orthanc DIMSE Interop Tests`
- Trigger: `schedule`, `workflow_dispatch` (`run_orthanc_interop=true`)
- Command:
  - `npm run test:orthanc-dimse-all`
- Purpose:
  - End-to-end DIMSE validation against Orthanc.
  - Uses an Orthanc service container and seeds sample DICOM&reg; files from `data/dicoms`.

### 4) Streaming Benchmarks

- Job name: `Streaming Benchmarks`
- Trigger: `schedule`, `workflow_dispatch` (`run_benchmarks=true`)
- Command:
  - `npm run bench:streaming`
- Purpose:
  - Performance trend visibility.
  - Not a correctness gate.

## Required vs Optional Checks

Recommended branch protection for `main`:

- Require:
  - `Core Tests`
- Optional (non-blocking):
  - `DIMSE Socket Tests`
  - `Orthanc DIMSE Interop Tests`
  - `Streaming Benchmarks`

This keeps PR feedback fast and stable while preserving deep functional coverage in dedicated lanes.

## Manual Runs

In GitHub:

1. Open `Actions`.
2. Select `EASI JS CI`.
3. Click `Run workflow`.
4. Toggle any optional lanes:
   - `run_dimse_sockets`
   - `run_orthanc_interop`
   - `run_benchmarks`

## Artifacts

The workflow uploads artifacts for inspection:

- `easi-js-core-coverage` from `easi-js/coverage/lcov-report`
- `easi-js-benchmarks` from `easi-js/test/output/benchmarks`

## Notes

- DIMSE/Orthanc tests are intentionally gated in test code via environment variables.
- This allows `npm test` to stay deterministic in constrained CI environments.

## Governance

Supporting process assets:

- PR advisory checklist: `.github/pull_request_template.md`
- Release gate checklist: `easi-js/doc/RELEASE_CHECKLIST.md`
