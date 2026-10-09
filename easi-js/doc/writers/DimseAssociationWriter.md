# `DimseAssociationWriter` Class

`DimseAssociationWriter` is the DIMSE destination writer for EASI pipelines.

It is used on pipeline output stages to send terminal DICOM&reg; byte payloads through DIMSE C-STORE style destination transports.

## Constructor

```js
new DimseAssociationWriter(transport = null)
```

## Required Transport Contract

The DIMSE destination transport must implement:

```js
write(association, payload, options?)
```

## Typical Usage

```js
import EASI from "../../src/EASI.js";
import NodeDimseCStoreScuTransport
  from "../../src/transports/dimse/NodeDimseCStoreScuTransport.js";

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

## Notes

- Build-time validation requires a DIMSE destination transport when using `intoDimseAssociation(...)`.
- Build-time validation also requires terminal DICOM&reg; byte emission (`toDicomData(...)`) when routing into DIMSE association output.
- Store payloads must be materialized bytes; `collectOutput: false` returns operation metadata and cannot supply them.
- Batch writes run sequentially and stop on failure. Metadata includes requested `count`, actual `attempted`, disjoint `completed`/`failed`/`warning` counts, and individual `results`. An earlier Bxxx warning remains visible when later writes succeed.
- See the [v1 DIMSE guide](../DIMSE_V1.md) for statuses, negotiation, and cancellation.
