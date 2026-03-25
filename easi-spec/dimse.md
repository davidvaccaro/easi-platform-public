# EASI DIMSE Transport Extension (Draft)

## Purpose

Define how DICOM DIMSE TCP/IP transport composes with the EASI pipeline so developers can stream:

- from a DIMSE source (for example PACS)
- through standard EASI parser/filter/terminal stages
- into a DIMSE destination (for example PACS/VNA/router)

This document is an extension to EASI Core and does not replace DICOM PS3.7/PS3.8 protocol rules.

## Scope

This draft standardizes pipeline-facing API semantics for DIMSE integration:

- source transport (`fromDimseAssociation(...)`)
- destination transport (`intoDimseAssociation(...)`)
- association/session options and validation
- per-instance streaming behavior
- status and failure semantics within EASI (`CONTINUE`, `STOP`, `FAIL`)

## Non-Goals (v1)

- full DIMSE service-class conformance matrix
- DIMSE protocol restatement
- SCP framework design for all service classes
- implementation-specific socket APIs

## Core DIMSE Pipeline Shape (Normative Intent)

DIMSE integrates as transport boundaries around canonical EASI parse/process stages:

- `DIMSE Source -> DICOM Parser -> [Adapters] -> [Filters] -> Terminal -> [Writer] -> DIMSE Destination`

Normative behavior:

1. A received DIMSE data-set (for example C-STORE payload) MUST map to one EASI parse unit.
2. EASI filters/terminals MUST remain transport-agnostic (DIMSE is boundary transport, not handler semantics).
3. Source and destination DIMSE associations MUST be independently configurable.

## Builder Contract (DIMSE Extension)

### Source Transport

`fromDimseAssociation(options)` selects DIMSE as the source reader transport.

Normative intent:

- Establish DIMSE association/session and stream inbound data-sets into parser flow.
- Require parser compatibility (`ofDicomData()` for byte DICOM input).

### Destination Transport

`intoDimseAssociation(options)` selects DIMSE as the destination writer transport.

Normative intent:

- Accept byte output from terminal/writer stage and send as DIMSE C-STORE (or configured service operation).
- Preserve streaming emission (do not require full study buffering).

### Typical End-to-End Shape

```js
const pipeline = EASI.pipelineBuilder()
  .fromDimseAssociation(sourceOptions)
  .ofDicomData()
  .withDeIdentification()           // optional filters
  .toDicomData()
  .intoDimseAssociation(destinationOptions)
  .build();
```

## DIMSE Endpoint Options (Draft Contract)

`fromDimseAssociation(...)` and `intoDimseAssociation(...)` SHOULD support a shared endpoint option model:

```js
{
  host: '10.0.0.15',
  port: 104,
  callingAeTitle: 'EASI_SCU',
  calledAeTitle: 'PACS_AE',
  tls: false,                 // or TLS options object
  maxPduLength: 16384,
  associationTimeoutMs: 15000,
  operationTimeoutMs: 60000
}
```

Required fields:

- `host`
- `port`
- `callingAeTitle`
- `calledAeTitle`

Optional fields:

- `tls`
- `maxPduLength`
- `associationTimeoutMs`
- `operationTimeoutMs`

Implementations MAY add additional options but MUST fail-fast on invalid required values.

## Source Operation Options (Draft)

`fromDimseAssociation(...)` MAY include source operation details:

```js
{
  operation: 'c-get',         // 'c-get' | 'c-move' | 'c-store-scp'
  query: { /* key attributes */ },
  moveDestinationAeTitle: 'EASI_STORE_SCP' // required for c-move
}
```

Minimum v1 recommendation:

- `c-get` as the primary query/retrieve source mode
- `c-store-scp` as optional inbound store mode

`c-move` local-receive extension (current JS implementation):

```js
{
  operation: 'c-move',
  moveDestinationAeTitle: 'EASI_MOVE_DEST', // required
  moveStoreHost: '127.0.0.1',               // local temporary C-STORE SCP bind host
  moveStorePort: 4104,                      // local temporary C-STORE SCP bind port
  moveStoreCalledAeTitle: 'EASI_MOVE_DEST', // optional expected called AE title
  moveStoreWaitTimeoutMs: 15000,            // wait for inbound C-STORE completion
  moveStoreIdleGraceMs: 250                 // idle quiescence window
}
```

Note: For most PACS/Orthanc deployments, the QR SCP must already know how to route `moveDestinationAeTitle` to the local receive endpoint.

## Destination Operation Options (Draft)

`intoDimseAssociation(...)` SHOULD default to C-STORE SCU behavior and MAY allow explicit operation options:

```js
{
  operation: 'c-store',
  onStoreResponse: (response) => { /* status reporting */ }
}
```

## Streaming Semantics (Normative)

DIMSE extension implementations SHOULD preserve EASI streaming guarantees:

1. Each inbound instance SHOULD be processed independently and emitted downstream as soon as available.
2. `STOP` from downstream stages SHOULD halt additional inbound instance processing and close/release associations cleanly.
3. `FAIL` MUST fail the pipeline and terminate association(s) according to transport safety rules.
4. Destination sending SHOULD be incremental per-instance and SHOULD avoid unbounded buffering.

## Status and Concern Mapping (Normative Intent)

DIMSE transport failures MUST be surfaced through EASI-compatible failure/concern pathways.

Recommended concern categories:

- `Transport`: association/connectivity failures
- `Compatibility`: presentation context / transfer syntax mismatch
- `Protocol`: DIMSE message/state violations
- `Timeout`: association or operation timeout

Recommended concern codes (examples):

- `AssociationOpenFailed`
- `AssociationRejected`
- `PresentationContextRejected`
- `StoreOperationFailed`
- `SourceOperationFailed`
- `AssociationClosedUnexpectedly`

## Compatibility Rules (Normative Intent)

1. `fromDimseAssociation(...)` MUST be compatible with parsers expecting native DICOM byte stream input.
2. `intoDimseAssociation(...)` MUST be compatible with terminal/writer output that produces native DICOM byte instances.
3. If the selected terminal output is not byte DICOM output, `build()` MUST fail-fast with a compatibility exception.

## Example Pipelines

### PACS -> De-identify -> PACS

```js
const pipeline = EASI.pipelineBuilder()
  .fromDimseAssociation({
    host: 'pacs-a.internal',
    port: 104,
    callingAeTitle: 'EASI_ROUTER',
    calledAeTitle: 'PACS_A'
  })
  .ofDicomData()
  .withDeIdentification()
  .toDicomData()
  .intoDimseAssociation({
    host: 'pacs-b.internal',
    port: 104,
    callingAeTitle: 'EASI_ROUTER',
    calledAeTitle: 'PACS_B'
  })
  .build();
```

### PACS (QR via C-MOVE) -> EASI Local Receive -> Pipeline

```js
const pipeline = EASI.pipelineBuilder()
  .fromDimseAssociation({
    host: 'pacs.internal',
    port: 104,
    callingAeTitle: 'EASI_QR',
    calledAeTitle: 'PACS_QR'
  }, new NodeDimseQueryRetrieveSourceTransport())
  .ofDicomData()
  .toInstances()
  .build();

const instance = await pipeline.process(null, {
  operation: 'c-move',
  queryRetrieveModel: 'study-root',
  queryRetrieveLevel: 'IMAGE',
  studyInstanceUid: '<study-uid>',
  seriesInstanceUid: '<series-uid>',
  sopInstanceUid: '<instance-uid>',
  moveDestinationAeTitle: 'EASI_MOVE_DEST',
  moveStoreHost: '127.0.0.1',
  moveStorePort: 4104
});
```

### PACS -> FHIR Mapping -> HTTP (non-DIMSE sink)

```js
const pipeline = EASI.pipelineBuilder()
  .fromDimseAssociation(sourceOptions)
  .ofDicomData()
  .toFHIRImagingStudy()
  .intoHttpStream(httpOptions)
  .build();
```

This demonstrates that DIMSE is composable with non-DIMSE output when terminal output type is compatible.

## Orthanc Local Interop (Reference)

For local validation against Orthanc defaults:

- Orthanc HTTP API: `http://localhost:8042`
- Orthanc DIMSE listener: typically `127.0.0.1:4242`
- Called AE title: typically `ORTHANC`

Optional integration test (in `easi-js`):

```bash
cd easi-js
npm run test:orthanc-dimse
npm run test:orthanc-dimse-move
# or:
npm run test:orthanc-dimse-all
```

Environment overrides:

- `ORTHANC_HTTP_URL`
- `ORTHANC_HTTP_USERNAME`
- `ORTHANC_HTTP_PASSWORD`
- `ORTHANC_DIMSE_HOST`
- `ORTHANC_DIMSE_PORT`
- `ORTHANC_DIMSE_CALLED_AE`
- `ORTHANC_DIMSE_CALLING_AE`
- `ORTHANC_DIMSE_QR_MODEL` (`study-root` or `patient-root`)
- `ORTHANC_DIMSE_REQUIRE_C_GET` (`true` to fail when endpoint aborts C-GET)
- `ORTHANC_DIMSE_REQUIRE_C_MOVE` (`true` to fail when endpoint status/route makes C-MOVE unavailable`)
- `ORTHANC_MOVE_DEST_AE` (destination AE Title sent in C-MOVE-RQ)
- `ORTHANC_MOVE_STORE_HOST` (local temporary C-STORE SCP bind host)
- `ORTHANC_MOVE_STORE_PORT` (local temporary C-STORE SCP bind port)
- `ORTHANC_MOVE_STORE_CALLED_AE` (optional expected called AE title for local temporary C-STORE SCP)

## Conformance Guidance (Draft)

DIMSE conformance should be tracked as an extension profile on top of EASI Core:

- `Core + DIMSE Source`
- `Core + DIMSE Destination`
- `Core + DIMSE Source+Destination`

Implementations SHOULD publish which profile(s) they support.
