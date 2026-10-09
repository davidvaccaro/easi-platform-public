# Node.js DIMSE in EASI JS v1

DIMSE uses the existing reader/parser/handler/writer pipeline. The built-in transports require Node.js sockets; they do not run in a browser. This matrix describes the JavaScript implementation, rather than support promised by future language implementations.

| Operation | EASI role | v1 behavior | Independent peer validation |
| --- | --- | --- | --- |
| C-ECHO | SCU and SCP | Client verification; the Store listener also answers Verification requests. | Both directions with Orthanc 1.12.8 |
| C-STORE | SCU and SCP | Send materialized Part 10 bytes; receive negotiated Storage objects and retain their dataset bytes. | Both directions; outgoing Explicit and Implicit VR Little Endian |
| C-FIND | SCU | Matching keys, requested return keys, multiple pending identifiers, final status, empty success. | Study Root study queries, including counts and no matches |
| C-GET | SCU plus Storage SCP on the same association | Negotiate Storage SCP roles and receive multiple instances before returning results. | Study Root, two series, exact synthetic pixel bytes and final counters |
| C-MOVE | SCU plus a temporary Store listener | Start the destination listener before issuing MOVE, collect incoming instances, then close it. | Study Root, two series, exact synthetic pixel bytes and final counters |

Patient Root query UIDs remain configurable and have local protocol coverage. Independent-peer validation currently covers Study Root. Query/Retrieve SCP services, worklist, normalized DIMSE services, and asynchronous operation multiplexing are outside this matrix.

## Verify a peer

These examples run from `easi-js` using the source modules. Replace endpoints and identifiers with your peer's configuration.

```js
import EASI from "./src/EASI.js";
import NodeDimseQueryRetrieveSourceTransport
  from "./src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";

const association = {
  host: "127.0.0.1", port: 4242,
  callingAeTitle: "EASI_JS", calledAeTitle: "ORTHANC",
  associationTimeoutMs: 30000, maxPduLength: 16384
};

const client = EASI.dimseClientBuilder().withAssociation(association).build();
const verification = await client.echo({ operationTimeoutMs: 10000 });
console.log(verification.status, verification.dimse.messageIdBeingRespondedTo);
```

## Find studies and map their summaries to FHIR

Request the attributes needed by the mapping explicitly. A peer can reject unsupported optional keys or omit unavailable values. Counts describe the peer's study, rather than the number of query response datasets.

```js
const summaries = EASI.pipelineBuilder()
  .fromDimseAssociation(association, new NodeDimseQueryRetrieveSourceTransport())
  .ofDicomData()
  .toFHIRImagingStudy("study-summary")
  .build();

const studies = await summaries.process({ sourceOptions: {
  operation: "c-find", queryRetrieveModel: "study-root",
  queryRetrieveLevel: "STUDY",
  keys: { PatientID: "RESEARCH-*" },
  returnKeys: [
    "StudyInstanceUID", "PatientID", "PatientName", "StudyDate", "StudyTime",
    "StudyDescription", "AccessionNumber", "ModalitiesInStudy",
    "NumberOfStudyRelatedSeries", "NumberOfStudyRelatedInstances"
  ],
  operationTimeoutMs: 30000
} });

console.log(studies.toArray().map((study) => study.toJSON()));
console.log(summaries.reader.lastMetadata.dimse.finalResponse);
```

`keys` accepts DICOM keywords, eight-digit hexadecimal tags, or `(gggg,eeee)` tags. Text values may be scalar or arrays; arrays encode DICOM value multiplicity. `returnKeys` uses the same names and adds zero-length values without replacing a matching key. Custom attributes need a supported text VR in `keyVrs`. Unknown keys and unsupported nonempty binary/sequence query values fail explicitly. Non-ASCII query text declares UTF-8 (`ISO_IR 192`).

Use `queryRetrieveLevel`, with `STUDY`, `SERIES`, or `IMAGE` for Study Root; `PATIENT` additionally requires Patient Root. Operations also accept `cfind`, `cget`, and `cmove`. Query options belong in `sourceOptions` or the association's `query` object. See the [FHIR mapping guide](handlers/mappings/DicomToFHIRImagingStudyMapping.md) for external Patient references and identifier namespaces.

## Retrieve using GET or MOVE

GET receives Store suboperations on the request association. Restrict `storageSopClassUids` and `storageTransferSyntaxUids` to what your application can accept when you know the study's content.

```js
const retrieval = EASI.pipelineBuilder()
  .fromDimseAssociation(association, new NodeDimseQueryRetrieveSourceTransport())
  .ofDicomData()
  .toInstances()
  .build();

const instances = await retrieval.process({ sourceOptions: {
  operation: "c-get", performFind: false,
  queryRetrieveLevel: "STUDY",
  keys: { StudyInstanceUID: "<study-uid>" },
  operationTimeoutMs: 60000
} });
console.log(instances.count, retrieval.reader.lastMetadata.dimse.finalResponse);
```

`performFind` defaults to `true`: GET/MOVE first perform FIND and drain its response identifiers. Use `false` when you already have the required identifiers.

MOVE requires the remote archive to route a destination AE to this listener's reachable address and fixed port. Configuring the local listener does not register that route at the remote archive. `moveStoreHost` is the local bind address; it is not advertised to the archive by C-MOVE.

```js
const instances = await retrieval.process({ sourceOptions: {
  operation: "c-move", performFind: false,
  queryRetrieveLevel: "STUDY",
  keys: { StudyInstanceUID: "<study-uid>" },
  moveDestinationAeTitle: "EASI_MOVE_DEST",
  moveStoreHost: "127.0.0.1", moveStorePort: 4104,
  moveStoreCalledAeTitle: "EASI_MOVE_DEST",
  operationTimeoutMs: 60000
} });
```

Both transports preserve received dataset bytes and construct Part 10 file metadata using the negotiated SOP class and transfer syntax. Pipeline parsing and pixel decoding have their own support matrix; transport acceptance does not establish decoder support.

## Send and receive Store objects

```js
import NodeDimseCStoreScuTransport
  from "./src/transports/dimse/NodeDimseCStoreScuTransport.js";
import NodeDimseCStoreScpSourceTransport
  from "./src/transports/dimse/NodeDimseCStoreScpSourceTransport.js";

const sender = EASI.pipelineBuilder()
  .fromPartStream().ofDicomData().toDicomData()
  .intoDimseAssociation(association, { transport: new NodeDimseCStoreScuTransport() })
  .build();
const sent = await sender.process({ source: part10Bytes });

const receiver = EASI.pipelineBuilder()
  .fromDimseAssociation(
    { host: "127.0.0.1", port: 4104, calledAeTitle: "EASI_MOVE_DEST" },
    new NodeDimseCStoreScpSourceTransport()
  )
  .ofDicomData().toInstances().build();
const run = receiver.start({ onResult: (batch) => console.log(batch.count) });
// Later, stop accepting connections and settle a waiting read:
await run.stop();
await run.done;
```

The sender requires materialized DICOM bytes. `.toDicomData({ collectOutput: false })` produces operation metadata and cannot supply a Store payload. The transport does not transcode to a peer-selected syntax; incompatible selection is rejected. Batch writes preserve warnings from earlier objects and expose requested `count`, actual `attempted`, disjoint `completed`/`failed`/`warning` counts, and individual `results` in write metadata.

The receiver retains listener configuration across successive reads and batches incoming objects after an idle grace period. Overlapping reads on one receiver are rejected. Store success acknowledges complete receipt into memory; it does not acknowledge application parsing or durable persistence. Applications needing a durable Storage SCP acknowledgment policy require additional integration.

## Status, cancellation, and bounds

`pipeline.reader.lastMetadata` describes the most recent transport read and is cleared when a new read begins. Query diagnostics include operation, elapsed time, optional preflight `find`, and `finalResponse`. Final response fields include numeric `status`, `messageIdBeingRespondedTo`, `remaining`, `completed`, `failed`, `warning`, and `failedSopInstanceUids`; absent counters are `null`.

Successful no-match/no-object operations return an empty result collection, with `metadata.count === 0`, without parsing a fabricated object. Warning statuses retain returned partial results and diagnostics. Failure/cancel statuses reject with the peer response in `error.dimse`; check that status before treating a retrieval as complete. Local abort closes the association and rejects; it does not perform a graceful C-CANCEL exchange.

Pass an AbortSignal in `sourceOptions.signal`, or stop a listener using `run.stop()`. `associationTimeoutMs` is the socket idle timeout (default 30 seconds); `operationTimeoutMs` supplies an optional absolute operation deadline. Callers should set a deadline when a peer could keep sending pending responses indefinitely.

The Node transports buffer complete datasets and retrieved output before the pipeline consumes it. Memory use therefore includes retained datasets, Part 10 wrappers, and multipart output copies; these operations do not offer constant-memory study retrieval.

| Query/receive limit | Default | Purpose |
| --- | --- | --- |
| `maxPduLength` | 16 KiB | Advertised incoming P-DATA body maximum; outgoing fragments respect the peer's maximum. |
| `maxIncomingPduLength` | 16 MiB | Hard incoming PDU size cap. |
| `maxCommandBytes` | 1 MiB | Maximum reassembled command. |
| `maxDataSetBytes` | 512 MiB | Maximum reassembled dataset. |
| `maxTotalDataSetBytes` | 512 MiB | Maximum retained datasets across one query/retrieval operation or queued Store objects. |

Reduce limits for your deployment and query a smaller series or instance when a study exceeds them. The Store receiver also has AE/host allow/deny policies, active-association limits, and TLS options. TLS/mTLS configuration has local tests; the independent Orthanc matrix described here uses TCP. Deployment-specific certificates and peer security profiles need separate verification.

## Validation

From `easi-js`:

```sh
npm run test:dimse-sockets
npm run test:orthanc-dimse-all
npm test -- --runInBand
```

The Orthanc command requires a configured peer; [CI](CI.md) uses a pinned 1.12.8 image and [configuration](../tools/interop/orthanc.json). Tests generate and remove their own uniquely identified synthetic study, exercise both endpoint roles, and require GET/MOVE success with exact pixel bytes and final counts. Socket and peer lanes run on pull requests and pushes as well as scheduled/manual runs. Protocol parsing follows [DICOM PS3.7 DIMSE-C](https://dicom.nema.org/medical/dicom/current/output/chtml/part07/chapter_9.html) and [PS3.8 upper-layer PDUs](https://dicom.nema.org/medical/dicom/current/output/chtml/part08/chapter_9.html).
