# `NodeDimseQueryRetrieveSourceTransport` Class

Node DIMSE source transport for query/retrieve workflows.

## Supported Operations

- `c-find`, `c-get`, and `c-move` (also accept `cfind`, `cget`, `cmove`).
- C-ECHO through `DimseClient`.

See the [v1 operation matrix and recipes](../../DIMSE_V1.md) for independent-peer coverage, statuses, cancellation, and buffering limits.

## Usage Pattern

```js
import EASI from "../../../src/EASI.js";
import NodeDimseQueryRetrieveSourceTransport
  from "../../../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";

const transport = new NodeDimseQueryRetrieveSourceTransport();

const pipeline = EASI
  .pipelineBuilder()
  .fromDimseAssociation(
    { host: "127.0.0.1", port: 4242, callingAeTitle: "EASI_JS", calledAeTitle: "ORTHANC" },
    transport
  )
  .ofDicomData()
  .toInstances()
  .build();

const result = await pipeline.process({ sourceOptions: {
  operation: "c-get",
  performFind: false,
  queryRetrieveLevel: "IMAGE",
  keys: {
    StudyInstanceUID: "<study-uid>",
    SeriesInstanceUID: "<series-uid>",
    SOPInstanceUID: "<instance-uid>"
  }
} });
```

## Optional Controls

Call-level options can include:

- `queryRetrieveModel`: `study-root` (default) or `patient-root`.
- `queryRetrieveLevel`: STUDY/SERIES/IMAGE, plus PATIENT for Patient Root.
- `keys`: matching attributes; `returnKeys`: zero-length return attributes, preserving matches.
- `moveDestinationAeTitle`, `moveStoreHost`, `moveStorePort`, `moveStoreCalledAeTitle`: MOVE routing/listener settings. The archive must already route this destination AE to the listener.
- `signal`, `operationTimeoutMs`, and command/dataset/PDU bounds.
- `onConcern` callback for diagnostics/concern events
- policy objects such as `moveStorePolicy` where applicable

`pipeline.reader.lastMetadata.dimse.finalResponse` exposes status and suboperation counters. Empty success returns no objects, warnings retain partial results, and peer failures reject with `error.dimse`. GET negotiates Storage SCP roles on the request association. These operations buffer results before parsing.
