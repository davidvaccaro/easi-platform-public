# CI/CD (GitHub Actions)

This project uses GitHub Actions to run automated quality checks for `easi-js`.

Workflow files:

- `.github/workflows/ci.yml`
- `.github/workflows/perf-smoke.yml`
- `.github/workflows/perf-peer-nightly.yml`

## Lanes

Core, packaging, DIMSE socket, and Orthanc checks run on normal development changes. Core and packaging each test supported Node.js versions 22 and 24. Socket, Orthanc, and all benchmark jobs use Node.js 24. Performance smoke also runs on EASI JS and workflow changes; streaming and full peer benchmarks remain scheduled or manually enabled.

The main CI workflow runs on pushes and pull requests targeting `main` regardless of the changed paths, so an accidentally added imaging asset outside `easi-js` also receives the source publication check. The separate performance smoke workflow filters changes to `easi-js/**` and `.github/workflows/**`.

### 1) Core Tests

- Job names: `Core Tests (Node 22.x)` and `Core Tests (Node 24.x)`
- Trigger: `pull_request`, `push`, `workflow_dispatch`
- Command:
  - `npm run source:check`
  - `npm test -- --runInBand`
  - `npm run harness:synthetic`
- Purpose:
  - Required correctness gate for normal development/PRs.
  - Runs unit + deterministic integration tests.
  - Rejects accidentally tracked original imaging files, private corpus directories, external native tools, and renamed Part-10 binaries. Ignored local assets are permitted.
  - Generates independent synthetic inputs for native/endian/signed-pixel, nested-sequence, multiframe, streaming, and genuine compressed-format coverage. No original corpus or local native dump executable is required.
  - Runs eight generated profiles through all six corpus-harness scenarios and verifies exact transcoded pixels and real thumbnails, without external peers or optional codec setup.
  - Includes API contract synchronization and codec/plugin conformance coverage against the bundled contract snapshot. Missing fixtures or an invalid explicit contracts directory fail the checks.

### 2) Package Validation

- Job names: `Package Validation (Node 22.x)` and `Package Validation (Node 24.x)`
- Trigger: `pull_request`, `push`, `workflow_dispatch`
- Commands:
  - `npm ci`
  - `npm run source:check`
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
  - Includes all DIMSE transport test files, client tests, relay integration tests, and the fresh-checkout ImageBridge CLI test with exact synthetic Store and image output checks.

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

### 6) Performance Smoke

- Workflow: `EASI JS Performance Smoke`; job: `Perf Smoke (EASI JS)`
- Trigger: EASI JS/workflow changes on `push` or `pull_request` to `main`, plus `workflow_dispatch`
- Command:
  - `npm run bench:peers -- --include easi-js --iterations 5 --warmup 1 --output tools/benchmarks/peer/output/perf-smoke.json`
- Purpose:
  - Runs the EASI-only default synthetic workload on Node.js 24, without installing external toolkits or requiring original imaging files.
  - Exercises native, nested-sequence, multiframe, RLE palette, and RGB profiles generated in an owned temporary directory and removed after the run.
  - Fails if any result row is not `ok`; successful results are summarized in the job summary.

### 7) Peer Performance Benchmark

- Workflow: `EASI JS Peer Performance Benchmark`; job: `Perf Peer (Nightly/Manual)`
- Trigger: nightly schedule, `workflow_dispatch`, or changes to its workflow on `main`
- Command:
  - `node tools/benchmarks/peer/runPeerBenchmarks.js --include easi-js,pydicom,fo-dicom,dcm4che,dcmtk,gdcm --iterations 8 --warmup 2 --output tools/benchmarks/peer/output/perf-peer-nightly.json`
- Purpose:
  - Uses Node.js 24 and the same five synthetic profiles as smoke; manual runs can override iteration and warmup counts.
  - Bootstraps the external Python, .NET, Java, DCMTK, and GDCM tools, then reports their parse timings alongside EASI JS.
  - Requires bootstrap, builds, and benchmark execution to succeed. The summary displays any unavailable or non-OK toolkit rows for inspection; this lane is performance reporting rather than a correctness gate.

Both peer benchmark workflows use the `synthetic-v1` workload revision. Establish performance baselines against this corpus; its results are not directly comparable to the original image corpus.

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
  - `Perf Smoke (EASI JS)`
  - `Perf Peer (Nightly/Manual)`

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
- `easi-js-perf-smoke` containing `easi-js/tools/benchmarks/peer/output/perf-smoke.json` and `.md`
- `easi-js-perf-peer-nightly` containing `easi-js/tools/benchmarks/peer/output/perf-peer-nightly.json` and `.md`

Artifact uploads are best effort. An account storage quota or upload service failure can leave coverage, candidate archives, or performance reports unavailable in GitHub without failing otherwise successful checks. Tests, benchmark execution and summaries, and packaging validation retain their existing failure behavior; only upload steps use `continue-on-error`. Candidate archives and inventory manifests can still be generated locally with `npm run package:pack`, and benchmark commands retain their local JSON/Markdown reports.

## Notes

- DIMSE/Orthanc tests are intentionally gated in test code via environment variables.
- Socket tests automatically run in CI unless explicitly disabled. Peer tests require their environment flags and configured endpoint; `test:orthanc-dimse-all` enables both ordinary and MOVE checks.
- Local peer overrides include `ORTHANC_HTTP_URL`, `ORTHANC_DIMSE_PORT`, and `ORTHANC_MOVE_STORE_PORT`. The peer must register the destination AE at the same listener port. The checked-in configuration uses HTTP 8042, DIMSE 4242, and MOVE 4104.
- Public API contract generation and drift check commands:
  - `npm run docs:api-contract`
  - `npm run docs:api-contract:check`
- Local checks validate the current checkout; editing this workflow does not establish that a remote GitHub Actions run has passed. Require results for the actual release commit before publication.

Core CI and a fresh source checkout use the [bundled contract snapshot](../test/fixtures/contracts/README.md), with no private companion checkout or extra repository credentials. Maintainer generation uses the canonical companion when available and refreshes the snapshot automatically. `EASI_CONTRACTS_ROOT=/path/to/easi-contracts` explicitly selects another complete directory for generation or checks; incomplete overrides fail. Keep runtime changes, generated canonical contracts, and the snapshot synchronized.

## Governance

Supporting process assets:

- PR advisory checklist: `.github/pull_request_template.md`
- Release gate checklist: `easi-js/doc/RELEASE_CHECKLIST.md`
