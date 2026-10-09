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
- `pipeline.reader.lastMetadata` exposes the last transport envelope's operation diagnostics, final status, and suboperation counts. It resets at the start of each read attempt.
- A completed query with no matches returns an empty `PipelineResultCollection`; it does not manufacture an empty DICOM instance or FHIR study. Transports represent this explicitly as `{ empty: true, source: new Uint8Array(0), metadata: { count: 0 } }`.
- Use `sourceOptions.signal` to abort one operation. `run.stop()` also aborts in-flight reads and closes source-bound listener transports.
- An envelope's undefined `onEmit` preserves the caller's callback; explicit `null` disables emission.

See the [DIMSE v1 guide](../DIMSE_V1.md) for examples and the supported operation matrix.
