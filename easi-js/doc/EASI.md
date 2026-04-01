# EASI: Efficient API for Streaming in Healthcare Imaging

## Mission Statement
EASI (Efficient API for Streaming in Healthcare Imaging) exists to provide a lightweight, high-performance, and developer-friendly foundation for stream reading and writing, parsing, and transforming medical imaging data — including DICOM and DICOMweb — using modern, portable, and scalable technologies.

Our mission is to simplify access to complex imaging data, enable real-time and memory-efficient workflows, and empower developers to build next-generation imaging applications, viewers, and services — without requiring deep expertise in the DICOM standard.

## Technical Overview

EASI provides a lightweight, extensible, and memory-efficient foundation for SAX-style parsing, stream reading and writing, and transformation of medical imaging data — including DICOM and DICOMweb metadata — entirely in modern JavaScript.

### Designed for real-world healthcare environments, EASI enables:

- Efficient parsing of large datasets (multi-gigabyte studies, streaming archives)
- Incremental, event-driven access to imaging metadata and pixel data
- Uniform APIs across diverse data sources (WADO-RS, WADO-URI, IHE XDS-I, local files)
- Low-memory, zero-copy operation suitable for browsers, mobile, and servers
- Pluggable handlers to generate high-level entities or application models

EASI empowers developers to build scalable, high-performance imaging workflows and applications — with full control over performance and data transformation — without requiring deep expertise in the DICOM standard.

# `EASI` Class

The `EASI` class is the root entry point for the EASI DICOM system.  

It provides access to the primary constructs and builders of the system.  

It provides static builder entry points for `PipelineBuilder`, `CodecRegistryBuilder`, `DimseAssociationBuilder`, and `DimseClientBuilder`.

## Parse/Emit Combination Matrix

Use this table as the quick-start map for supported parse-input to emit-output combinations.
Use `fromHttpStream()` for URL/fetch transport and `fromPartStream()` for direct byte/stream sources.

| Parse Input Format | Emit Output Format | Pipeline Recipe |
|--------------------|--------------------|-----------------|
| DICOM bytes (Part-10 / native) | DICOM `Instance` / `Array<Instance>` | `EASI.pipelineBuilder().fromPartStream().ofDicomData().toInstances()` |
| DICOM bytes (Part-10 / native) | DICOM `Entity` / `Array<Entity>` | `EASI.pipelineBuilder().fromPartStream().ofDicomData().toEntities()` |
| DICOM bytes (Part-10 / native) | Selected DICOM `AttributeSet` / `Array<AttributeSet>` | `EASI.pipelineBuilder().fromPartStream().ofDicomData().toSelection(selection)` |
| DICOM bytes (Part-10 / native) | Custom mapped output model | `EASI.pipelineBuilder().fromPartStream().ofDicomData().toMapping(mapping)` |
| DICOM bytes (Part-10 / native) | FHIR `ImagingStudy` | `EASI.pipelineBuilder().fromPartStream().ofDicomData().toFHIRImagingStudy()` |
| DICOM bytes (Part-10 / native) | Native DICOM byte stream | `EASI.pipelineBuilder().fromPartStream().ofDicomData().toDicomData(options)` |
| DICOM JSON metadata | DICOM `Instance` / `Array<Instance>` | `EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().toInstances()` |
| DICOM JSON metadata | DICOM `Entity` / `Array<Entity>` | `EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().toEntities()` |
| DICOM JSON metadata | Selected DICOM `AttributeSet` / `Array<AttributeSet>` | `EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().toSelection(selection)` |
| DICOM JSON metadata | Custom mapped output model | `EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().toMapping(mapping)` |
| DICOM JSON metadata | FHIR `ImagingStudy` | `EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().toFHIRImagingStudy()` |
| DICOM XML metadata | DICOM `Instance` / `Array<Instance>` | `EASI.pipelineBuilder().fromPartStream().ofDicomXmlMetadata().toInstances()` |
| DICOM XML metadata | DICOM `Entity` / `Array<Entity>` | `EASI.pipelineBuilder().fromPartStream().ofDicomXmlMetadata().toEntities()` |
| DICOM XML metadata | Selected DICOM `AttributeSet` / `Array<AttributeSet>` | `EASI.pipelineBuilder().fromPartStream().ofDicomXmlMetadata().toSelection(selection)` |
| DICOM XML metadata | Custom mapped output model | `EASI.pipelineBuilder().fromPartStream().ofDicomXmlMetadata().toMapping(mapping)` |
| DICOM XML metadata | FHIR `ImagingStudy` | `EASI.pipelineBuilder().fromPartStream().ofDicomXmlMetadata().toFHIRImagingStudy()` |
| Generic JSON text/bytes | JavaScript value/object/array | `EASI.pipelineBuilder().fromPartStream().ofJsonData().toJsonValue()` |
| Generic JSON text/bytes | Wrapped document DICOM bytes (`Uint8Array` or `Array<Uint8Array>`) | `EASI.pipelineBuilder().fromPartStream().ofJsonData().toWrappedDocuments(options)` |
| Generic raw bytes (PDF/XML/STL/OBJ/MTL/etc.) | Wrapped document DICOM bytes (`Uint8Array`) | `EASI.pipelineBuilder().fromPartStream().ofByteData().toWrappedDocuments(options)` |
| Generic XML text/bytes | JavaScript object/array representation | `EASI.pipelineBuilder().fromPartStream().ofXmlData().toJsonValue()` |
| DIMSE C-FIND (study query) | Study summary FHIR `ImagingStudy[]` | `EASI.pipelineBuilder().fromDimseAssociation(assoc, srcTransport).ofDicomData().toFHIRImagingStudy("study-summary")` |
| DIMSE C-GET / C-MOVE source | DICOM `Instance` / FHIR mapping / byte stream | `EASI.pipelineBuilder().fromDimseAssociation(assoc, srcTransport).ofDicomData().toInstances()` |
| DICOM bytes or DIMSE source | DIMSE C-STORE destination | `EASI.pipelineBuilder().fromPartStream().ofDicomData().toDicomData().intoDimseAssociation(destAssoc, { transport: destTransport })` |

> Pipeline-based scenarios are finalized with `.build().process(source)`.

## DIMSE Recipes

### C-FIND -> FHIR Study Summaries

```js
import EASI from "easi-dicom";
import NodeDimseQueryRetrieveSourceTransport from "../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";

const sourceAssociation = {
  host: "127.0.0.1",
  port: 4242,
  callingAeTitle: "EASI_JS",
  calledAeTitle: "ORTHANC"
};

const pipeline = EASI
  .pipelineBuilder()
  .fromDimseAssociation(sourceAssociation, new NodeDimseQueryRetrieveSourceTransport())
  .ofDicomData()
  .toFHIRImagingStudy("study-summary")
  .build();

const studies = await pipeline.process({
  operation: "cfind",
  level: "STUDY",
  keys: { Modality: "CT" }
});
```

### C-MOVE source -> in-flight de-identification -> C-STORE destination

```js
import EASI from "easi-dicom";
import Tag from "../src/dicom/Tag.js";
import NodeDimseQueryRetrieveSourceTransport from "../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";
import NodeDimseCStoreScuTransport from "../src/transports/dimse/NodeDimseCStoreScuTransport.js";

const sourceAssociation = {
  host: "127.0.0.1",
  port: 4242,
  callingAeTitle: "EASI_JS",
  calledAeTitle: "ORTHANC"
};

const destinationAssociation = {
  host: "127.0.0.1",
  port: 4242,
  callingAeTitle: "EASI_JS",
  calledAeTitle: "ORTHANC"
};

const pipeline = EASI
  .pipelineBuilder()
  .fromDimseAssociation(sourceAssociation, new NodeDimseQueryRetrieveSourceTransport())
  .ofDicomData()
  .withDeIdentification(Tag.DefaultDeIdentificationMask)
  .toDicomData({ collectOutput: false })
  .intoDimseAssociation(destinationAssociation, {
    transport: new NodeDimseCStoreScuTransport()
  })
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

### JSON document descriptor(s) -> wrapped DICOM bytes

```js
import EASI from "easi-dicom";

const descriptor = {
  mimeType: "application/pdf",
  title: "Sample Report",
  bytes: new Uint8Array([37, 80, 68, 70])
};

const wrappedDicomBytes = await EASI
  .pipelineBuilder()
  .fromByteStream()
  .ofJsonData()
  .toWrappedDocuments()
  .build()
  .process(new TextEncoder().encode(JSON.stringify(descriptor)), {
    contentType: "application/json"
  });
```

### Raw document bytes -> wrapped DICOM bytes

```js
import EASI from "easi-dicom";

const rawPdfBytes = new Uint8Array([/* ... */]);

const wrappedDicomBytes = await EASI
  .pipelineBuilder()
  .fromByteStream()
  .ofByteData()
  .toWrappedDocuments({
    mimeType: "application/pdf",
    title: "Echo Report"
  })
  .build()
  .process(rawPdfBytes, { contentType: "application/pdf" });
```

---

## Static Methods

### `EASI.pipelineBuilder()`

Creates a new instance of the EASI PipelineBuilder.

#### Parameters

*(None.)*

#### Returns

| Type                    | Description                                         |
|-------------------------|-----------------------------------------------------|
| `PipelineBuilder` | A new, initialized PipelineBuilder instance. |

---

### `EASI.codecRegistryBuilder()`

Creates a new instance of the EASI `CodecRegistryBuilder`.

#### Parameters

*(None.)*

#### Returns

| Type                    | Description                                              |
|-------------------------|----------------------------------------------------------|
| `CodecRegistryBuilder`  | A new, initialized codec-registry builder instance.      |

---

### `EASI.dimseAssociationBuilder()`

Creates a new instance of the EASI `DimseAssociationBuilder`.

#### Parameters

*(None.)*

#### Returns

| Type                    | Description                                              |
|-------------------------|----------------------------------------------------------|
| `DimseAssociationBuilder`  | A new, initialized DIMSE association builder instance.      |

---

### `EASI.dimseClientBuilder()`

Creates a new instance of the EASI `DimseClientBuilder`.

#### Parameters

*(None.)*

#### Returns

| Type                    | Description                                              |
|-------------------------|----------------------------------------------------------|
| `DimseClientBuilder`    | A new, initialized DIMSE client builder instance.        |

---

## Usage Example

```js
import EASI from 'easi-dicom';

// Build the DICOM parsing pipeline
const pipeline = EASI.pipelineBuilder()
    .fromHttpStream()
    .ofDicomData()
    .toInstances()
    .build();

// Read and parse a DICOM file from a URL
pipeline
    .process(url)
    .then(result => {

        // Establish the parsed instance
        if (Array.isArray(result) === true) {

        }
        else {

        }

    })
    .catch(err => console.log(err));
```

<!-- MASTER_DOC_INDEX_START -->
## Master Documentation Index

Use this index to navigate all documentation markdown files in `easi-js/doc`.

### root
- [EASI](./EASI.md)

### builders
- [CodecRegistryBuilder](./builders/CodecRegistryBuilder.md)
- [DimseAssociationBuilder](./builders/DimseAssociationBuilder.md)
- [DimseClientBuilder](./builders/DimseClientBuilder.md)
- [PipelineBuilder](./builders/PipelineBuilder.md)

### clients
- [DimseClient](./clients/DimseClient.md)

### codecs
- [Decoders](./codecs/Decoders.md)

### codecs/decoders
- [dicomNativePixelDataToRGBADecoder](./codecs/decoders/dicomNativePixelDataToRGBADecoder.md)
- [JpegDecoder](./codecs/decoders/jpegDecoder.md)
- [JpegLosslessDecoder](./codecs/decoders/jpegLosslessDecoder.md)

### data
- [Data](./data/Data.md)

### dicom
- [Attribute](./dicom/Attribute.md)
- [AttributeSequence](./dicom/AttributeSequence.md)
- [AttributeSet](./dicom/AttributeSet.md)
- [Constants](./dicom/Constants.md)
- [DataElement](./dicom/DataElement.md)
- [DataSet](./dicom/DataSet.md)
- [EncodedData](./dicom/EncodedData.md)
- [Instance](./dicom/Instance.md)
- [Item](./dicom/Item.md)
- [MetaSet](./dicom/MetaSet.md)
- [Modality](./dicom/Modality.md)
- [PixelData](./dicom/PixelData.md)
- [Preamble](./dicom/Preamble.md)
- [Prefix](./dicom/Prefix.md)
- [SOPClass](./dicom/SOPClass.md)
- [Tag](./dicom/Tag.md)
- [TagSet](./dicom/TagSet.md)
- [TransferSyntax](./dicom/TransferSyntax.md)
- [Utilities](./dicom/Utilities.md)
- [ValueRepresentation](./dicom/ValueRepresentation.md)

### dicom/entities
- [Entity](./dicom/entities/Entity.md)
- [Image](./dicom/entities/Image.md)

### dicom/modules
- [GeneralSeriesModule](./dicom/modules/GeneralSeriesModule.md)
- [ImagePixelModule](./dicom/modules/ImagePixelModule.md)
- [ImagePlaneModule](./dicom/modules/ImagePlaneModule.md)
- [ModalityLookUpTableModule](./dicom/modules/ModalityLookUpTableModule.md)
- [Module](./dicom/modules/Module.md)
- [MultiFrameModule](./dicom/modules/MultiFrameModule.md)
- [VisualizationFunctionModule](./dicom/modules/VisualizationFunctionModule.md)

### environment
- [Configuration](./environment/Configuration.md)
- [Exception](./environment/Exception.md)
- [Runtime](./environment/Runtime.md)

### fhir
- [BackboneElement](./fhir/BackboneElement.md)
- [Base](./fhir/Base.md)
- [CodeableConcept](./fhir/CodeableConcept.md)
- [CodeableReference](./fhir/CodeableReference.md)
- [Coding](./fhir/Coding.md)
- [CodingSystems](./fhir/CodingSystems.md)
- [ContactPoint](./fhir/ContactPoint.md)
- [DiagnosticReport](./fhir/DiagnosticReport.md)
- [DocumentReference](./fhir/DocumentReference.md)
- [DomainResource](./fhir/DomainResource.md)
- [Element](./fhir/Element.md)
- [Encounter](./fhir/Encounter.md)
- [HumanName](./fhir/HumanName.md)
- [Identifier](./fhir/Identifier.md)
- [ImagingInstance](./fhir/ImagingInstance.md)
- [ImagingSelection](./fhir/ImagingSelection.md)
- [ImagingSeries](./fhir/ImagingSeries.md)
- [ImagingStudy](./fhir/ImagingStudy.md)
- [Narrative](./fhir/Narrative.md)
- [Organization](./fhir/Organization.md)
- [Patient](./fhir/Patient.md)
- [Period](./fhir/Period.md)
- [Practitioner](./fhir/Practitioner.md)
- [PractitionerRole](./fhir/PractitionerRole.md)
- [Reference](./fhir/Reference.md)
- [Resource](./fhir/Resource.md)

### handlers
- [StreamHandler](./handlers/StreamHandler.md)
- [DicomInstanceHandler](./handlers/DicomInstanceHandler.md)
- [DicomMappingHandler](./handlers/DicomMappingHandler.md)
- [DicomSelectingHandler](./handlers/DicomSelectingHandler.md)
- [DicomJsonMetadataAdapter](./handlers/adapters/DicomJsonMetadataAdapter.md)

### handlers/terminals/syntax
- [JsonDataHandler](./handlers/terminals/syntax/JsonDataHandler.md)
- [XmlDataHandler](./handlers/terminals/syntax/XmlDataHandler.md)

### handlers/mappings
- [DicomMapping](./handlers/mappings/DicomMapping.md)
- [DicomToFHIRImagingStudyMapping](./handlers/mappings/DicomToFHIRImagingStudyMapping.md)
- [Mapping](./handlers/mappings/Mapping.md)

### handlers/selections
- [DicomSelection](./handlers/selections/DicomSelection.md)
- [Selection](./handlers/selections/Selection.md)

### parsers
- [Status](./parsers/Status.md)
- [DataParser](./parsers/DataParser.md)
- [DicomDataParser](./parsers/DicomDataParser.md)
- [JsonDataParser](./parsers/JsonDataParser.md)

### readers
- [DimseAssociationReader](./readers/DimseAssociationReader.md)
- [PartStreamReader](./readers/PartStreamReader.md)

### transports/dimse
- [DimseTransportContract](./transports/dimse/DimseTransportContract.md)
- [NodeDimseCStoreScpSourceTransport](./transports/dimse/NodeDimseCStoreScpSourceTransport.md)
- [NodeDimseCStoreScuTransport](./transports/dimse/NodeDimseCStoreScuTransport.md)
- [NodeDimseQueryRetrieveSourceTransport](./transports/dimse/NodeDimseQueryRetrieveSourceTransport.md)

### tools/dicom
- [Dumper](./tools/dicom/Dumper.md)
- [DumpParser](./tools/dicom/DumpParser.md)

### utils
- [CharacterUtils](./utils/CharacterUtils.md)
- [DateUtils](./utils/DateUtils.md)
- [NumberUtils](./utils/NumberUtils.md)
- [StringUtils](./utils/StringUtils.md)
- [SymbolUtils](./utils/SymbolUtils.md)

### writers
- [DimseAssociationWriter](./writers/DimseAssociationWriter.md)

<!-- MASTER_DOC_INDEX_END -->
