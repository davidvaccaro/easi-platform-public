# Peer Toolkit Benchmarks

This harness compares EASI parse performance against peer DICOM toolkits using a shared workload.

## Included Toolkits
- `easi-js`
- `pydicom`
- `fo-dicom`
- `dcm4che`
- `dcmtk`
- `gdcm`

## Workload
Default workload file: `tools/benchmarks/peer/workloads/default-workload.json`

The default workload uses independently generated `synthetic:` profiles for native, nested-sequence, multiframe, RLE palette, and RGB inputs. Files are materialized in an owned temporary directory and removed after the run. No original image corpus is needed. A custom workload can still supply paths relative to the repository for an optional local corpus; do not commit those files or publish their reports automatically.

The fixture revision is `synthetic-v1`. Establish a new performance baseline for this corpus; results are not directly comparable to the old clinical-sample workloads.

Operation benchmarked:
- Parse complete DICOM file
- Extract core tags (`StudyInstanceUID`, `SeriesInstanceUID`, `SOPInstanceUID`, `Modality`, `Rows`, `Columns`, `NumberOfFrames`)

## Run
From `easi-js`:

```bash
npm run bench:peers:bootstrap
node tools/benchmarks/peer/runPeerBenchmarks.js
```

For a smoke check with no external toolkit installation:

```bash
npm run bench:peers -- --include easi-js --iterations 1 --warmup 0
```

Optional flags:

```bash
node tools/benchmarks/peer/runPeerBenchmarks.js \
  --iterations 12 \
  --warmup 3 \
  --include easi-js,pydicom \
  --workload tools/benchmarks/peer/workloads/default-workload.json
```

Outputs are written to:
- `tools/benchmarks/peer/output/*.json`
- `tools/benchmarks/peer/output/*.md`

## Dependency Notes
Some adapters require external runtime/tooling:
- `pydicom` runner needs `python3` + `pydicom` package.
- `fo-dicom` runner expects `tools/benchmarks/peer/runners/fodicom/FoDicomBench/FoDicomBench.csproj`.
- `dcm4che` runner prefers `tools/benchmarks/peer/runners/dcm4che/target/dcm4che-bench.jar` (built by bootstrap). It can fall back to a `dcmdump` executable.
- `dcmtk` runner needs `dcmdump` on PATH.
- `gdcm` runner needs `gdcmdump` on PATH.

Unavailable runners are reported as `status: unavailable` in the output snapshot.

## Bootstrap
This helper script tries to pull/source-install peer toolkit prerequisites:

```bash
npm run bench:peers:bootstrap
```

It currently:
- Clones toolkit source repos under `tools/benchmarks/peer/vendors/src`.
- Creates a Python venv and installs `pydicom`.
- Restores the fo-dicom benchmark project.
- Builds an in-process dcm4che benchmark runner jar via dcm4che's Maven wrapper.
- Pins dcm4che source to release `5.34.3`, matching the runner's Maven dependency. Existing mismatched or modified source checkouts fail without being changed; move `vendors/src/dcm4che` aside and rerun bootstrap to clone the matching release. The source build requires JDK 17 or newer.
- Attempts to download a dcm4che binary distribution that includes `dcmdump`.
