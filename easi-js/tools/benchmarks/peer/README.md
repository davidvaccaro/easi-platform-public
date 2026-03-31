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

Operation benchmarked:
- Parse complete DICOM file
- Extract core tags (`StudyInstanceUID`, `SeriesInstanceUID`, `SOPInstanceUID`, `Modality`, `Rows`, `Columns`, `NumberOfFrames`)

## Run
From `easi-js`:

```bash
npm run bench:peers:bootstrap
node tools/benchmarks/peer/runPeerBenchmarks.js
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
- Attempts to download a dcm4che binary distribution that includes `dcmdump`.
