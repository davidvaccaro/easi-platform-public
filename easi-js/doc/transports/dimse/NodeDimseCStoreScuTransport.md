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
  .toDicomData({ collectOutput: false })
  .intoDimseAssociation(
    { host: "127.0.0.1", port: 4242, callingAeTitle: "EASI_JS", calledAeTitle: "ORTHANC" },
    { transport: new NodeDimseCStoreScuTransport() }
  )
  .build();
```

## Input Expectations

The payload should be DICOM byte content produced by `toDicomData(...)`, optionally after filters such as:

- `withDeIdentification(...)`
- `withValidation(...)`
- `withTranscoding(...)`
- `withBurnedInRedaction(...)`

## Diagnostics

Transport-level failures are surfaced as pipeline failures and can include DIMSE status detail (`failedPart`, SOP class, SOP instance) when available.
