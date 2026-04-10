# `DimseAssociationReader` Class

`DimseAssociationReader` is the DIMSE-aware source reader for EASI pipelines.

It adapts DIMSE retrieval operations (such as C-FIND, C-GET, C-MOVE sources, or inbound C-STORE SCP stream sources via transport) into the same parser flow used by other EASI readers.

## Constructor

```js
new DimseAssociationReader(association = null, transport = null, partReader = new PartStreamReader())
```

## Required Transport Contract

The DIMSE source transport must implement:

```js
read(association, options?)
```

And return/emit payloads that can be consumed by the internal part reader/parser path.

## Typical Usage

```js
import EASI from "../../src/EASI.js";
import NodeDimseQueryRetrieveSourceTransport
  from "../../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";

const pipeline = EASI
  .pipelineBuilder()
  .fromDimseAssociation(
    { host: "127.0.0.1", port: 4242, callingAeTitle: "EASI_JS", calledAeTitle: "ORTHANC" },
    new NodeDimseQueryRetrieveSourceTransport()
  )
  .ofDicomData()
  .toInstances()
  .build();
```

## Notes

- Build-time validation requires a DIMSE source transport when using `fromDimseAssociation(...)`.
- DIMSE source currently requires native DICOM&reg; parser semantics (`ofDicomData()`).
