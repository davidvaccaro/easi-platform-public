# `NodeDimseCStoreScuTransport` Class

Node DIMSE destination transport for outbound C-STORE SCU writes.

Use this transport with `intoDimseAssociation(...)` on output stage pipelines.

## Usage Pattern

```js
import EASI from "../../../src/EASI.js";
import NodeDimseCStoreScuTransport
  from "../../../src/transports/dimse/NodeDimseCStoreScuTransport.js";

const pipeline = EASI
  .pipelineBuilder()
  .fromPartStream()
  .ofDicomData()
  .toDicomData()
  .intoDimseAssociation(
    { host: "127.0.0.1", port: 4242, callingAeTitle: "EASI_JS", calledAeTitle: "ORTHANC" },
    { transport: new NodeDimseCStoreScuTransport() }
  )
  .build();
```

## Input Expectations

The payload must contain DICOM bytes, such as the materialized output of `toDicomData()`. A statistics-only writer result from `collectOutput: false` cannot be sent as a C-STORE dataset. The selected presentation context must accept the payload's transfer syntax; this transport does not transcode.

## Diagnostics

Transport-level failures are surfaced as pipeline failures and can include DIMSE status detail (`failedPart`, SOP class, SOP instance) when available.

The [DIMSE v1 guide](../../DIMSE_V1.md) describes operation scope, warning/status handling, query/retrieve examples, buffering, and local validation.
