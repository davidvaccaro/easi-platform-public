# `NodeDimseCStoreScpSourceTransport` Class

Node DIMSE source transport that runs a local C-STORE SCP receiver and emits received instances into the EASI pipeline reader path.

The listener also responds to C-ECHO on a negotiated Verification context. See the [v1 support matrix](../../DIMSE_V1.md) for independent-peer coverage and limits.

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

const run = pipeline.start({ onResult: (batch) => console.log(batch.count) });
// Later:
await run.stop();
await run.done;
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

Listener TLS, capability lists, policies, and size limits persist across reads; explicit changes restart the listener. Overlapping reads are rejected. `signal` cancels a pending read; `close()`/pipeline stop closes the listener and active connections. Consumed objects leave the queue, freeing its byte budget.

`maxCommandBytes`, `maxDataSetBytes`, and `maxTotalDataSetBytes` bound commands, individual datasets, and queued received objects. Incomplete datasets remain subject to the per-association limit; use `maxActiveAssociations` to bound concurrent receive memory. A successful Store acknowledgment means complete in-memory receipt, rather than application parsing or durable persistence.
