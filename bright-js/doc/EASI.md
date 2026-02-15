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

Currently, it grants access to the `StreamingReaderBuilder` for creating streaming readers.

---

## Static Methods

### `EASI.newStreamingReaderBuilder()`

Creates a new instance of the EASI Streaming Reader Builder.

#### Parameters

*(None.)*

#### Returns

| Type                    | Description                                         |
|-------------------------|-----------------------------------------------------|
| `StreamingReaderBuilder` | A new, initialized Streaming Reader Builder instance. |

---

## Usage Example

```js
import EASI from 'easi-dicom';

// Build the DICOM streaming reader
const reader = EASI.newStreamingReaderBuilder()
    .withParser(new StreamingDicomDataParser())
    .withHandler(new StreamingDicomInstanceHandler())
    .build();

// Read and parse a DICOM file from a URL
reader
    .read(url)
    .then(result => {

        // Establish the parsed instance
        if (typeof result === 'array') {

        }
        else {

        }

    })
    .catch(err => console.log(err));
```

<!-- MASTER_DOC_INDEX_START -->
## Master Documentation Index

Use this index to navigate all documentation markdown files in `bright-js/doc`.

### root
- [EASI](./EASI.md)

### builders
- [StreamingReaderBuilder](./builders/StreamingReaderBuilder.md)

### codecs
- [Decoders](./codecs/Decoders.md)

### codecs/decoders
- [dicomNativePixelDataToRGBADecoder](./codecs/decoders/dicomNativePixelDataToRGBADecoder.md)
- [jpegDecoder](./codecs/decoders/jpegDecoder.md)
- [jpegLosslessDecoder](./codecs/decoders/jpegLosslessDecoder.md)

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
- [CT](./dicom/entities/CT.md)
- [Entity](./dicom/entities/Entity.md)
- [Image](./dicom/entities/Image.md)
- [XA](./dicom/entities/XA.md)

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
- [StreamingDicomInstanceHandler](./handlers/StreamingDicomInstanceHandler.md)
- [StreamingDicomMappingHandler](./handlers/StreamingDicomMappingHandler.md)
- [StreamingDicomSelectingHandler](./handlers/StreamingDicomSelectingHandler.md)
- [StreamingJsonMetadataInstanceHandler](./handlers/StreamingJsonMetadataInstanceHandler.md)
- [StreamingJsonValueHandler](./handlers/StreamingJsonValueHandler.md)

### handlers/mappings
- [DicomMapping](./handlers/mappings/DicomMapping.md)
- [DicomToFHIRImagingStudyMapping](./handlers/mappings/DicomToFHIRImagingStudyMapping.md)
- [Mapping](./handlers/mappings/Mapping.md)

### handlers/selections
- [DicomSelection](./handlers/selections/DicomSelection.md)
- [Selection](./handlers/selections/Selection.md)

### parsers
- [Status](./parsers/Status.md)
- [StreamingDataParser](./parsers/StreamingDataParser.md)
- [StreamingDicomDataParser](./parsers/StreamingDicomDataParser.md)
- [StreamingJsonDataParser](./parsers/StreamingJsonDataParser.md)

### readers
- [StreamingReader](./readers/StreamingReader.md)

### tools/dicom
- [Dumper](./tools/dicom/Dumper.md)
- [DumpParser](./tools/dicom/DumpParser.md)

### utils
- [CharacterUtils](./utils/CharacterUtils.md)
- [DateUtils](./utils/DateUtils.md)
- [NumberUtils](./utils/NumberUtils.md)
- [StringUtils](./utils/StringUtils.md)
- [SymbolUtils](./utils/SymbolUtils.md)

<!-- MASTER_DOC_INDEX_END -->
