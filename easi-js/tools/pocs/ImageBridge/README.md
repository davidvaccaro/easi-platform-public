# ImageBridge PoC

ImageBridge is a proof-of-concept DIMSE C-STORE listener built on EASI.
It behaves like a lightweight storage target that receives DICOM instances,
extracts key frames in real time, maps selected DICOM attributes to JSON,
and forwards the resulting payload to cloud and/or local storage.

## What This PoC Demonstrates

- DIMSE C-STORE SCP ingestion with `fromDimseAssociation(...)`
- Streaming parse + asset extraction with `toAssets(...)`
- Per-instance metadata mapping via `DicomMapping`
- Heuristic key-frame selection (`first`, `last`, cadence, motion delta)
- Lossless frame conversion (default: PNG)
- Cloud-style delivery of non-DICOM assets (`image + JSON metadata`)

## Fast Demo (Recommended)

From repository root:

```bash
cd easi-js
node tools/pocs/ImageBridge/ImageBridgeDemo.js --pick
```

What this does for you automatically:

1. Starts a local mock cloud receiver.
2. Starts ImageBridge as a DIMSE C-STORE listener.
3. Lets you pick a DICOM file from `data/dicoms`.
4. Sends it to ImageBridge using DIMSE C-STORE.
5. Shows where key-frame images + metadata landed.
6. Keeps services running so you can inspect the flow in real time.

Dashboard URL is printed in the console, typically:

- `http://127.0.0.1:18080/`

Press `Ctrl+C` to stop.

## Demo Options

- `--pick`: interactive file picker from `data/dicoms`
- `--input <path>`: explicit file or directory of DICOM files
- `--bridge-port <port>`: ImageBridge listener port (default `11112`)
- `--cloud-port <port>`: mock cloud dashboard/API port (default `18080`)
- `--called-ae-title <AE>`: bridge called AE title (default `IMAGE_BRIDGE`)
- `--calling-ae-title <AE>`: sender calling AE title (default `IMAGE_BRIDGE_DEMO`)
- `--output-dir <path>`: output root (default `test/output/pocs/imagebridge/demo`)
- `--once`: run one send pass and exit (no long-running live mode)

Example:

```bash
cd easi-js
node tools/pocs/ImageBridge/ImageBridgeDemo.js \
  --input ../data/dicoms/0002.DCM \
  --once
```

## Mock Cloud (Standalone)

If you want only the mock cloud server:

```bash
cd easi-js
node tools/pocs/ImageBridge/MockCloudServer.js
```

Default endpoint for bridge events:

- `POST /image-bridge/events`

Useful API routes:

- `GET /api/health`
- `GET /api/events`
- `GET /api/events/:id`
- `GET /assets/:file`

## ImageBridge (Standalone)

You can still run ImageBridge alone:

```bash
cd easi-js
node tools/pocs/ImageBridge/ImageBridge.js
```

## Common Environment Variables

ImageBridge variables:

- `IMAGE_BRIDGE_ID`
- `IMAGE_BRIDGE_HOST`
- `IMAGE_BRIDGE_PORT`
- `IMAGE_BRIDGE_CALLED_AE_TITLE`
- `IMAGE_BRIDGE_ALLOWED_CALLING_AE_TITLES`
- `IMAGE_BRIDGE_ALLOWED_REMOTE_HOSTS`
- `IMAGE_BRIDGE_MAX_KEY_FRAMES_PER_INSTANCE`
- `IMAGE_BRIDGE_MOTION_THRESHOLD`
- `IMAGE_BRIDGE_LOSSLESS_FORMAT`
- `IMAGE_BRIDGE_CLOUD_URL`
- `IMAGE_BRIDGE_CLOUD_API_KEY`
- `IMAGE_BRIDGE_LOCAL_OUTPUT_DIR`
- `IMAGE_BRIDGE_STORE_LOCAL_COPY`
- `IMAGE_BRIDGE_VERBOSE`

Mock cloud variables:

- `IMAGE_BRIDGE_MOCK_CLOUD_HOST`
- `IMAGE_BRIDGE_MOCK_CLOUD_PORT`
- `IMAGE_BRIDGE_MOCK_CLOUD_OUTPUT_DIR`
- `IMAGE_BRIDGE_MOCK_CLOUD_MAX_BODY_BYTES`
- `IMAGE_BRIDGE_MOCK_CLOUD_VERBOSE`

## Output Locations

For the fast demo (`ImageBridgeDemo.js`) under `--output-dir`:

- `bridge-local-output/`: key-frame images + per-frame metadata emitted by ImageBridge
- `mock-cloud/events/`: full received cloud event payload JSON
- `mock-cloud/assets/`: non-DICOM images reconstructed by mock cloud from `bytesBase64`

This gives you clear observability of each stage in the flow:

- DIMSE send -> bridge processing -> cloud receipt -> non-DICOM asset materialization.
