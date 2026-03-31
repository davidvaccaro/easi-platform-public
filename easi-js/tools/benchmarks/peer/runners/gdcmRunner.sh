#!/usr/bin/env bash
set -euo pipefail

FILE=""
ITERATIONS=10
WARMUP=2

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file) FILE="$2"; shift 2 ;;
    --iterations) ITERATIONS="$2"; shift 2 ;;
    --warmup) WARMUP="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -z "$FILE" ]]; then
  echo "Missing required --file argument." >&2
  exit 2
fi

GDCMDUMP_BIN="${GDCMDUMP_BIN:-gdcmdump}"
if [[ ! -x "$GDCMDUMP_BIN" ]] && ! command -v "$GDCMDUMP_BIN" >/dev/null 2>&1; then
  echo "gdcmdump binary was not found. Set GDCMDUMP_BIN or install GDCM tools to run this benchmark adapter." >&2
  exit 3
fi

if [[ ! -f "$FILE" ]]; then
  echo "Input file was not found: $FILE" >&2
  exit 4
fi

run_once_ms() {
  python3 - "$GDCMDUMP_BIN" "$FILE" <<'PY'
import subprocess
import sys
import time

started = time.perf_counter_ns()
subprocess.run([sys.argv[1], sys.argv[2]], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
elapsed_ms = (time.perf_counter_ns() - started) / 1_000_000.0
print(elapsed_ms)
PY
}

WARMUP_SAMPLES=()
SAMPLES=()
for ((i=0; i<WARMUP; i++)); do
  WARMUP_SAMPLES+=("$(run_once_ms)")
done
for ((i=0; i<ITERATIONS; i++)); do
  SAMPLES+=("$(run_once_ms)")
done

FILE_SIZE=$(python3 - <<PY
import os
print(os.path.getsize(r'''$FILE'''))
PY
)

SAMPLES_JOINED="${SAMPLES[*]-}"
WARMUP_JOINED="${WARMUP_SAMPLES[*]-}"

SAMPLES_STR="$SAMPLES_JOINED" WARMUP_STR="$WARMUP_JOINED" python3 - <<PY
import json
import os
samples = [float(x) for x in os.environ.get("SAMPLES_STR", "").split()] if os.environ.get("SAMPLES_STR", "") else []
warmup = [float(x) for x in os.environ.get("WARMUP_STR", "").split()] if os.environ.get("WARMUP_STR", "") else []
print(json.dumps({
  "toolkit": "gdcm",
  "operation": "dicom-parse-and-core-tag-extract",
  "file": r'''$FILE''',
  "fileSizeBytes": int("$FILE_SIZE"),
  "warmupIterations": int("$WARMUP"),
  "iterations": int("$ITERATIONS"),
  "warmupSamplesMs": warmup,
  "samplesMs": samples,
  "extracted": {
    "studyInstanceUid": None,
    "seriesInstanceUid": None,
    "sopInstanceUid": None,
    "modality": None,
    "numberOfFrames": None,
    "rows": None,
    "columns": None,
    "attributeCount": None
  }
}), end="")
PY
