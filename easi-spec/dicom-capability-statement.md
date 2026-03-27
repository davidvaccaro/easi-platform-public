# EASI-JS DICOM Capability Statement

**Document type:** Implementation capability statement (library profile)  
**Implementation:** `easi-js` (JavaScript reference implementation in this repository)  
**Status:** Active draft, implementation-aligned  
**Last updated:** 2026-03-27

---

## 1. Purpose And Scope

This document describes the **current DICOM capabilities** of `easi-js`.

It is intended to function as a practical, implementation-level capability statement for developers integrating EASI pipelines into imaging workflows (PACS/VNA/DICOMweb/service processing).

This is **not** a full replacement for a device/vendor PS3.2 IOD-by-IOD conformance statement.  
`easi-js` is a toolkit library, not a single fixed AE appliance.

---

## 2. Supported DICOM Input And Parsing

### 2.1 Native DICOM Data

`easi-js` supports parsing native DICOM data sets from single-part and multipart streams.

Implemented reader/parser path:

- `fromPartStream().ofDicomData()`
- `fromHttpStream().ofDicomData()`
- `fromFileStream().ofDicomData()`
- `fromByteStream().ofDicomData()`
- `fromNodeStreamAdapter().ofDicomData()`
- `fromWebSocketStream().ofDicomData()`

### 2.2 DICOMweb Metadata

Implemented metadata parsing paths:

- DICOM JSON metadata: `ofDicomMetadata()`
- DICOM XML metadata: `ofDicomXmlMetadata()`

Adapters normalize metadata syntax events into the canonical DICOM semantic handler chain.

### 2.3 Strict/Permissive Parse Behavior

Parser strictness is configurable:

- permissive mode (default)
- strict mode via `withIsStrict(true)`

---

## 3. DIMSE Capability

### 3.1 Implemented DIMSE Roles (Node transport profile)

### Source-side

- C-FIND (SCU query/retrieve source)
- C-GET (SCU retrieve source)
- C-MOVE (SCU retrieve source with local inbound store handling)
- C-STORE SCP source mode (for inbound receive workflows)

### Destination-side

- C-STORE SCU destination write

### Pipeline composition

- source: `fromDimseAssociation(association, sourceTransport)`
- destination: `intoDimseAssociation(association, { transport: destinationTransport })`

### Query/Retrieve models

- Study Root
- Patient Root

### Query levels

- STUDY
- SERIES
- IMAGE

### Operational diagnostics

DIMSE concern/diagnostic events are supported and can be surfaced through pipeline/API concern callbacks.

### 3.2 Not Currently Implemented As First-Class Pipeline Operations

- C-ECHO convenience operation
- N-service class operation set (N-CREATE/N-SET/etc.)
- C-STORE SCP as a standalone terminal output mode (destination role remains C-STORE SCU)

---

## 4. Output Materialization Capability

Implemented terminal outputs include:

- DICOM `Instance` model (`toInstances()`)
- DICOM `Entity` model (`toEntities()`)
- DICOM selection output (`toSelection(...)`)
- DICOM mapping output (`toMapping(...)`)
- FHIR ImagingStudy output (`toFHIRImagingStudy(...)`)
- DICOM byte re-emission (`toDicomData(...)`)
- Asset extraction (`toAssets(...)`)
- Asset archive package (`toAssetArchive(...)`)
- JSON/XML value materialization (`toJsonValue()`)

---

## 5. DICOM De-Identification Capability

### 5.1 Attribute-Level De-Identification

Implemented:

- explicit mask: `withMask(mask)`
- convenience default mask: `withDeIdentification()` (uses default protected-tag mask)
- custom mask override: `withDeIdentification(customMask)`

### 5.2 Burned-In Pixel Redaction

Implemented:

- manual region mode (`regions`)
- OCR-like region discovery mode (`ocr-regions`)

Redaction is implemented as a pipeline filter (`withBurnedInRedaction(...)`) and can be combined with byte re-emission and DIMSE relay workflows.

---

## 6. Validation Capability

Implemented validation filter:

- `withValidation(...)` with strict/permissive profile behavior
- concern reporting (warnings/errors) without requiring immediate pipeline termination

---

## 7. Transfer Syntax Capability

### 7.1 Parsing/Dictionary Coverage

`easi-js` includes a broad transfer syntax dictionary in `TransferSyntax.js`, including uncompressed, JPEG family, JPEG-LS, JPEG 2000, HTJ2K, RLE, deflated, and additional standard/private entries.

### 7.2 Pixel Decode Capability (Configured Decoders)

Default configured decoders include:

- Uncompressed/native pixel decode
- JPEG Baseline
- JPEG Lossless (including SV1 usage path)
- JPEG-LS (lossless and near-lossless)
- JPEG 2000 (lossless/lossy and MC variants)
- HTJ2K variants
- RLE Lossless

### 7.3 Pixel Encode/Transcode Capability

Implemented transcoding filter:

- `withTranscoding(...)`

Implemented target compressed output families:

- JPEG Baseline
- JPEG 2000 (lossless/lossy)
- HTJ2K family
- RLE Lossless

Implemented uncompressed output pathways:

- implicit/explicit little-endian pathways through the transcoding flow

### Compatibility behavior

- Unsupported source/target syntax pairs fail with explicit concern/error (`UnsupportedTransferSyntaxPair`).
- Capability depends on configured codec availability at runtime.

---

## 8. FHIR Mapping Capability

Implemented built-in mapping:

- `DicomToFHIRImagingStudyMapping`

Supported profiles:

- `full` (default)
- `study-summary`

Supports reference template and subject-mode customization for deployment-specific endpoint/reference strategies.

---

## 9. Streaming Behavior

The implementation is pipeline-streaming by design:

- incremental read/parse/emit
- handler/filter composition in event flow
- optional restreaming via writers (`into...`)

Both single-part and multipart content framing are supported by the part stream reader/writer stack.

---

## 10. Runtime Profiles

### Browser profile

- HTTP + File + WebSocket source patterns
- browser file writer support
- kitchen-sink sample workflows

### Node profile

- file/node stream adapters
- DIMSE transport implementations
- server-side relay and processing scenarios

---

## 11. Known Boundaries

- DIMSE transport implementations are currently Node-focused.
- DIMSE service-class coverage is centered on query/retrieve + store relay workflows, not the full DIMSE operation set.
- OCR-region burned-in redaction is heuristic by nature and should be validated on representative modalities/data.
- Not all transfer syntax pairs are transcodable; unsupported pairs are explicitly reported.

---

## 12. Practical Interop Position

Current implementation is designed and tested for real-world workflows such as:

- DICOMweb or DIMSE ingest -> parse -> model/materialize
- DICOM ingest -> de-identify -> DICOM re-emit
- DICOM ingest -> transcode -> DICOM re-emit
- DIMSE source -> in-flight processing -> DIMSE C-STORE destination relay
- DICOM/DICOMweb ingest -> FHIR ImagingStudy mapping

---

## 13. Future Capability Expansion (Planned)

- additional DIMSE operations where they add pipeline value
- continued transfer syntax pair expansion
- continued burned-in redaction improvements
- parallel capability statements for other language implementations (`easi-cs`, `easi-java`, `easi-py`)
