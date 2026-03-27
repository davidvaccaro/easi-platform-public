# `DimseAssociationWriter` Class

`DimseAssociationWriter` is the DIMSE destination writer for EASI pipelines.

It is used on pipeline output stages to send terminal DICOM byte payloads through DIMSE C-STORE style destination transports.

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
  .toDicomData({ collectOutput: false })
  .intoDimseAssociation(
    { host: "127.0.0.1", port: 4242, callingAeTitle: "EASI_JS", calledAeTitle: "ORTHANC" },
    { transport: new NodeDimseCStoreScuTransport() }
  )
  .build();
```

## Notes

- Build-time validation requires a DIMSE destination transport when using `intoDimseAssociation(...)`.
- Build-time validation also requires terminal DICOM byte emission (`toDicomData(...)`) when routing into DIMSE association output.
