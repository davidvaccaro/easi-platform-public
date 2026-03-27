# `NodeDimseCStoreScpSourceTransport` Class

Node DIMSE source transport that runs a local C-STORE SCP receiver and emits received instances into the EASI pipeline reader path.

## Primary Use Cases

- Act as a temporary/local C-STORE destination for relay workflows.
- Receive inbound DIMSE pushes and immediately parse/transform through EASI.

## Usage Pattern

```js
import EASI from "../../../src/EASI.js";
import NodeDimseCStoreScpSourceTransport
  from "../../../src/transports/dimse/NodeDimseCStoreScpSourceTransport.js";

const pipeline = EASI
  .pipelineBuilder()
  .fromDimseAssociation(
    { host: "127.0.0.1", port: 4104, callingAeTitle: "EASI_MOVE_DEST", calledAeTitle: "EASI_MOVE_DEST" },
    new NodeDimseCStoreScpSourceTransport()
  )
  .ofDicomData()
  .toInstances()
  .build();
```

## Policy Controls

Common policy options include:

- `allowedCallingAeTitles`
- `deniedCallingAeTitles`
- `allowedRemoteHosts`
- `deniedRemoteHosts`
- `maxActiveAssociations`
- `associationTimeoutMs`

## Diagnostics

Use `onConcern` (when available in operation options) to capture policy/association concerns for audit/visibility.
