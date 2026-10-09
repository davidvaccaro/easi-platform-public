# CI/CD (GitHub Actions)

This project uses GitHub Actions to run automated quality checks for `easi-js`.

Workflow file:

- `.github/workflows/ci.yml`

## Lanes

Core, packaging, DIMSE socket, and independent-peer checks run on normal development changes. Core and packaging each test supported Node.js versions 22 and 24. Socket, peer, and benchmark jobs use Node.js 24. Benchmarks remain scheduled or manually enabled.

### 1) Core Tests

- Job names: `Core Tests (Node 22.x)` and `Core Tests (Node 24.x)`
- Trigger: `pull_request`, `push`, `workflow_dispatch`
- Command:
  - `npm test -- --runInBand`
- Purpose:
  - Required correctness gate for normal development/PRs.
  - Runs unit + deterministic integration tests.
  - Includes API contract synchronization coverage via `test/contracts/ApiContractSync.test.js`.

### 2) Package Validation

- Job names: `Package Validation (Node 22.x)` and `Package Validation (Node 24.x)`
- Trigger: `pull_request`, `push`, `workflow_dispatch`
- Commands:
  - `npm ci`
  - `npm run package:check`
  - `npm run docs:readme:check`
  - `npm run package:pack`
- Purpose:
  - Validate the actual npm archive inventory and public export targets.
  - Install that archive into a clean Node consumer and exercise public imports plus synthetic DICOM read/write, selection, and FHIR workflows.
  - Bundle the clean browser consumer, reject Node builtin imports, and verify the Node DIMSE entry is unavailable under browser export conditions.
  - Verify that the installed README matches the source, its local links resolve, and its marked offline examples run against the packed library. Examples use synthetic data and an owned temporary HTTP server; external-peer examples are not run by this check.
  - Upload the candidate `.tgz` and inventory/integrity manifest. This job does not authenticate to npm or publish packages.

The default check validates browser bundling. The release checklist also calls for `npm run package:check -- --browser`, which executes the packed browser consumer in an isolated installed Chrome/Chromium browser. That browser execution is a separate local release check and is not claimed by the default CI command.

### 3) DIMSE Socket Tests

- Job name: `DIMSE Socket Tests`
- Trigger: `pull_request`, `push`, `schedule`, `workflow_dispatch`
- Command:
  - `npm run test:dimse-sockets`
- Purpose:
  - Runs network/socket DIMSE integration tests.
  - Includes all DIMSE transport test files, client tests, and relay integration tests.

### 4) Orthanc DIMSE Interop Tests

- Job name: `Orthanc DIMSE Interop Tests`
- Trigger: `pull_request`, `push`, `schedule`, `workflow_dispatch`
- Command:
  - `npm run test:orthanc-dimse-all`
- Purpose:
  - End-to-end DIMSE validation against Orthanc.
  - Uses pinned `jodogne/orthanc:1.12.8` with [explicit authenticated configuration](../tools/interop/orthanc.json) and Linux host networking for deterministic MOVE routing.
  - Generates a uniquely identified synthetic study and removes only that study during cleanup. Repository DICOM samples are not uploaded.
  - Requires all eight checks: ECHO, explicit/implicit STORE, FIND counts, empty FIND, GET with exact pixel bytes/counters, rejected GET status, inbound ECHO/STORE, and MOVE with exact pixel bytes/counters. GET/MOVE failures fail the lane.

### 5) Streaming Benchmarks

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
  - `Core Tests (Node 22.x)`
  - `Core Tests (Node 24.x)`
  - `Package Validation (Node 22.x)`
  - `Package Validation (Node 24.x)`
  - `DIMSE Socket Tests`
  - `Orthanc DIMSE Interop Tests`
- Optional (non-blocking):
  - `Streaming Benchmarks`

These are recommended branch protection settings; the workflow file does not configure GitHub branch protection itself.

## Manual Runs

In GitHub:

1. Open `Actions`.
2. Select `EASI JS CI`.
3. Click `Run workflow`.
4. Enable `run_benchmarks` if wanted. Socket and peer checks always run.

## Artifacts

The workflow uploads artifacts for inspection:

- `easi-js-core-coverage-node-22.x` and `easi-js-core-coverage-node-24.x` from `easi-js/coverage/lcov-report`
- `easi-js-package-node-22.x` and `easi-js-package-node-24.x` containing `easi-js/artifacts/*.tgz` and `*.manifest.json`
- `easi-js-benchmarks` from `easi-js/test/output/benchmarks`

## Notes

- DIMSE/Orthanc tests are intentionally gated in test code via environment variables.
- Socket tests automatically run in CI unless explicitly disabled. Peer tests require their environment flags and configured endpoint; `test:orthanc-dimse-all` enables both ordinary and MOVE checks.
- Local peer overrides include `ORTHANC_HTTP_URL`, `ORTHANC_DIMSE_PORT`, and `ORTHANC_MOVE_STORE_PORT`. The peer must register the destination AE at the same listener port. The checked-in configuration uses HTTP 8042, DIMSE 4242, and MOVE 4104.
- Public API contract generation and drift check commands:
  - `npm run docs:api-contract`
  - `npm run docs:api-contract:check`
- Local checks validate the current checkout; editing this workflow does not establish that a remote GitHub Actions run has passed. Require results for the actual release commit before publication.

The core job checks out `davidvaccaro/easi` at `main` into `easi-docs` and points `EASI_CONTRACTS_ROOT` to its contracts. Publish synchronized runtime and contract changes together. While that companion repository remains private, a standard repository-scoped GitHub token cannot read it; publication or separately configured read access is a prerequisite for that CI checkout. This change does not configure account credentials or repository visibility.

## Governance

Supporting process assets:

- PR advisory checklist: `.github/pull_request_template.md`
- Release gate checklist: `easi-js/doc/RELEASE_CHECKLIST.md`
