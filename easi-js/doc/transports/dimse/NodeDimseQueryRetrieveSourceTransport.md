# `NodeDimseQueryRetrieveSourceTransport` Class

Node DIMSE source transport for query/retrieve workflows.

## Supported Operations

- `cfind`
- `cget`
- `cmove` (with retrieval relay semantics)

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

const result = await pipeline.process({
  operation: "cget",
  level: "IMAGE",
  keys: {
    StudyInstanceUID: "<study-uid>",
    SeriesInstanceUID: "<series-uid>",
    SOPInstanceUID: "<instance-uid>"
  }
});
```

## Optional Controls

Call-level options can include:

- query level and key constraints
- move destination options for C-MOVE flows
- `onConcern` callback for diagnostics/concern events
- policy objects such as `moveStorePolicy` where applicable

Refer to kitchen-sink server DIMSE endpoints for live examples.
