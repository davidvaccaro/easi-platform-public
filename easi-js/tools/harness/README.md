# Test-Library Harness

This harness runs broad EASI pipeline scenarios across a filesystem DICOM library and generates:

- `report.json` (machine-readable)
- `report.html` (human-readable index with overall summary + modality navigation)
- `report-<modality>-pNNN.html` (per-modality paged tables, max 1000 rows/page, with details and frame previews)

## Run

From `easi-js`:

```bash
npm run harness:test-library
```

By default this scans `../data/test-library` recursively and writes output under:

- `test/output/harness/run-<timestamp>/report.json`
- `test/output/harness/run-<timestamp>/report.html`
- `test/output/harness/run-<timestamp>/report-<modality>-pNNN.html`

Default thumbnail extraction limit is `25000` frames per run (override with `--thumbnail-limit`).

By default for full-library sweeps, worker isolation is auto-enabled for reliability.

## Orchestrated Chunk Runs

Run chunked ranges and auto-merge them:

```bash
npm run harness:orchestrate -- --start-index 23562 --end-index 23891 --chunk-size 110 --isolate-file-worker true --file-timeout-ms 8000
```

Dry-run chunk plan only:

```bash
npm run harness:orchestrate -- --start-index 23562 --end-index 23891 --chunk-size 110 --dry-run true
```

## Options

```bash
node tools/harness/runTestLibraryHarness.js --help
```

Common examples:

```bash
# Quick smoke run on first 20 files
node tools/harness/runTestLibraryHarness.js --max-files 20

# Resume by absolute file index range
node tools/harness/runTestLibraryHarness.js --start-index 20000 --end-index 23891

# Full sweep with per-scenario timeout guard
node tools/harness/runTestLibraryHarness.js --scenario-timeout-ms 5000

# Full sweep with hard per-file worker isolation timeout
node tools/harness/runTestLibraryHarness.js --isolate-file-worker true --file-timeout-ms 5000

# Run only parse + deidentify + assets scenarios
node tools/harness/runTestLibraryHarness.js --scenarios parse,deidentify,assets

# Restrict to explicit DICOM extensions
node tools/harness/runTestLibraryHarness.js --include-ext dcm,ima,new --all-files false

# Restrict to files matching regex
node tools/harness/runTestLibraryHarness.js --match "US-.*\\.dcm$"

# Exclude a problematic folder pattern
node tools/harness/runTestLibraryHarness.js --exclude-match "PhilipsAchieva"
```

## Merge Existing Runs

Merge explicit run directories:

```bash
npm run harness:merge -- --runs run-20260319_151400662Z,run-20260319_151740104Z
```

Merge latest N completed runs:

```bash
npm run harness:merge -- --latest 4
```

## Live monitor

Watch the most recent run:

```bash
npm run harness:monitor
```

Watch a specific run:

```bash
node tools/harness/monitorHarnessRun.js --run run-20260319_143231037Z
```

One snapshot only:

```bash
node tools/harness/monitorHarnessRun.js --once true
```

Stall detection with non-zero exit:

```bash
node tools/harness/monitorHarnessRun.js --stale-ms 20000 --exit-on-stale true
```

## Scenario coverage

Default scenarios:

- `parse`: parse to instances + validation concern capture
- `convert`: parse and write native DICOM bytes
- `deidentify`: parse + default de-identification mask + write native DICOM bytes
- `transcode`: parse + transfer syntax transcoding + write native DICOM bytes
- `fhir`: parse + map to FHIR ImagingStudy
- `assets`: parse + metadata mapping + first-frame PNG extraction
