# `PipelineBuilder` Class

`PipelineBuilder` is the staged fluent API entry point for creating an EASI `Pipeline`.

The stages are:

1. Source stage (`from*`, `withReader`)
2. Format stage (`of*`, `withParser`)
3. Target stage (`to*`, `with*` transform options, `withHandler`)
4. Output stage (`into*`, `withWriter`, `build`)

## Constructor

```js
new PipelineBuilder()
```

Typically you create it through `EASI.pipelineBuilder()`.

## Core Fluent Flow

```js
import EASI from "../../src/EASI.js";

const pipeline = EASI
  .pipelineBuilder()
  .fromPartStream()
  .ofDicomData()
  .toInstances()
  .build();
```

## Source Stage Methods

Use one of these before choosing format:

- `fromPartStream()`
- `fromHttpStream()`
- `fromByteStream()`
- `fromFileStream()`
- `fromWebSocketStream()`
- `fromNodeStreamAdapter()`
- `fromDimseAssociation(association?, transport?)`
- `withReader(reader)`

## Format Stage Methods

Use one of these after source:

- `ofDicomData()`
- `ofDicomMetadata()`
- `ofDicomXmlMetadata()`
- `ofJsonData()`
- `ofXmlData()`
- `withParser(parser)`

## Target Stage Methods

Terminal target methods:

- `toInstances()`
- `toEntities()`
- `toSelection(selection)`
- `toMapping(mapping)`
- `toFHIRImagingStudy(profile = "full")`
- `toDicomData(options?)`
- `toStructuredValue()`
- `toAssets(options?)`
- `toAssetArchive(options?)`
- `withHandler(handler)`

Transform/filter configuration methods (applied before terminal output):

- `withOnEmit(callback)`
- `withDeIdentification(deIdentificationMask?)`
- `withBulkDataPolicy(policy)`
- `withValidation(validationConfig?)`
- `withTranscoding(transcodingConfig?)`
- `withBurnedInRedaction(redactionConfig?)`
- `withCodecRegistry(codecRegistry)`

### Codec Registry Setup

`withCodecRegistry(...)` expects a `CodecRegistry` instance.

- Use `Configuration.global.codecRegistry` for the shared default registry.
- Use `Configuration.createDefaultCodecRegistry()` to create an independent default registry.
- Or build one through `EASI.codecRegistryBuilder().withDefaultCodecs().build()`.
- Build-time validation now checks registry integrity (for example, missing default decoder) and throws `InvalidCodecRegistry` when invalid.

## Output Stage Methods

Outbound restreaming:

- `intoByteBuffer(options?)`
- `intoPartBuffer(options?)`
- `intoFileStream(filePath, options?)`
- `intoBrowserFileStream(target, options?)`
- `intoNodeStreamAdapter(writable, options?)`
- `intoWebSocketStream(socket, options?)`
- `intoHttpStream(request, options?)`
- `intoDimseAssociation(association?, options?)`
- `withWriter(writer, target?, options?)`

Finalize:

- `build()`

### HTTP STOW-RS Safe Options

`intoHttpStream(request, options?)` supports a STOW-safe profile without adding a dedicated STOW writer method.

- Enable with `options.stow = true` for defaults.
- Or use `options.stow = { ... }` for explicit control.

Default STOW-safe behavior:

- Enforces `POST`
- Enforces multipart output (`multipart/related; type="application/dicom"`)
- Defaults part content-type to `application/dicom`
- Adds `Accept: application/dicom+json, application/json` when missing
- Validates HTTP status in `[200, 202]`

Example:

```js
const pipeline = EASI
  .pipelineBuilder()
  .fromPartStream()
  .ofDicomData()
  .toDicomData()
  .intoHttpStream(
    { url: "https://dicom.example.com/dicom-web/studies" },
    {
      stow: true,
      stream: false
    }
  )
  .build();
```

## DIMSE Notes

### DIMSE source

`fromDimseAssociation(...)` requires a source transport implementing:

- `read(association, options?)`

Use `NodeDimseQueryRetrieveSourceTransport` for C-FIND/C-GET/C-MOVE source retrieval, or `NodeDimseCStoreScpSourceTransport` for incoming C-STORE SCP ingestion.

To configure TLS and association security options, build association descriptors with:

- `EASI.dimseAssociationBuilder().withBaseAssociation(baseAssociation).build()`

### DIMSE destination

`intoDimseAssociation(...)` requires a destination transport implementing:

- `write(association, payload, options?)`

Use `NodeDimseCStoreScuTransport` for C-STORE SCU destination write.

### Compatibility guardrails

Build-time validation enforces:

- DIMSE reader must be paired with native DICOM&reg; parser (`ofDicomData()`).
- DIMSE writer must be paired with terminal DICOM&reg; byte emission (`toDicomData(...)`).
- DIMSE source and destination transports are required (no default stubs).

## Example: C-FIND Study Discovery -> FHIR&reg; ImagingStudy (Study Summary)

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
  .toFHIRImagingStudy("study-summary")
  .build();

const result = await pipeline.process({
  operation: "cfind",
  level: "STUDY",
  keys: { Modality: "CT" }
});
```

## Example: C-MOVE relay with in-flight de-identification

```js
import EASI from "../../src/EASI.js";
import Tag from "../../src/dicom/Tag.js";
import NodeDimseQueryRetrieveSourceTransport
  from "../../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";
import NodeDimseCStoreScuTransport
  from "../../src/transports/dimse/NodeDimseCStoreScuTransport.js";

const sourceTransport = new NodeDimseQueryRetrieveSourceTransport();
const destinationTransport = new NodeDimseCStoreScuTransport();

const pipeline = EASI
  .pipelineBuilder()
  .fromDimseAssociation(
    { host: "127.0.0.1", port: 4242, callingAeTitle: "EASI_JS", calledAeTitle: "ORTHANC" },
    sourceTransport
  )
  .ofDicomData()
  .toDicomData({ collectOutput: false })
  .withDeIdentification(Tag.DefaultDeIdentificationMask)
  .intoDimseAssociation(
    { host: "127.0.0.1", port: 4242, callingAeTitle: "EASI_JS", calledAeTitle: "ORTHANC" },
    { transport: destinationTransport }
  )
  .build();

await pipeline.process({
  operation: "cmove",
  level: "IMAGE",
  destinationAeTitle: "EASI_MOVE_DEST",
  keys: {
    StudyInstanceUID: "<study-uid>",
    SeriesInstanceUID: "<series-uid>",
    SOPInstanceUID: "<instance-uid>"
  }
});
```
