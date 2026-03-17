# EASI Scenario Matrix

## Purpose

Track supported and planned source-format -> parser -> handler -> output combinations.

This document should distinguish:

- `Core EASI concepts` (spec-level)
- `Current BrightDicom implementation support` (implementation-level)
- `Planned scenarios` (roadmap)

## Matrix (Draft)

| Source Input | Parser | Handler / Strategy | Output | Status |
|---|---|---|---|---|
| Native DICOM bytes | Streaming DICOM parser | Instance handler | DICOM `Instance` model | Implemented (`easi-js`) |
| Native DICOM bytes | Streaming DICOM parser | Selection handler | Attribute selection result | Implemented (`easi-js`) |
| Native DICOM bytes | Streaming DICOM parser | Mapping handler | Custom mapped output (e.g. FHIR) | Implemented (`easi-js`) |
| Native DICOM bytes | Streaming DICOM parser | DICOM data writer handler | Native DICOM bytes | Implemented (`easi-js`) |
| Native DICOM bytes | Streaming DICOM parser + transcoding filter | DICOM data writer handler | Transfer-syntax transcoded native DICOM bytes | Planned (`withTranscoding` contract drafted) |
| Native DICOM bytes | DICOM parser + assets archive handler | ZIP package (`metadata.json` + `frames/*` + `manifest.json`) | Standard metadata + image payload package | Implemented (`easi-js`) |
| DICOM JSON metadata | Streaming JSON parser | Metadata instance handler | DICOM `Instance` model | Implemented (`easi-js`) |
| DICOM JSON metadata | Streaming JSON parser | Metadata selection handler | Attribute selection result | Implemented (`easi-js`) |
| DICOM JSON metadata | Streaming JSON parser | Metadata mapping handler | Custom mapped output (e.g. FHIR) | Implemented (`easi-js`) |
| JSON (generic) | Streaming JSON parser | JSON value handler | JS value tree | Implemented (`easi-js`) |
| DICOM dump text | Dump parser | Instance/selection/mapping handlers | Multiple outputs | Implemented (`easi-js`) |
| DICOM JSON metadata | JSON parser + DICOM data writer handler path | Native DICOM bytes | Planned / evaluate |
| Native DICOM bytes | DICOM parser + de-identify handler + DICOM data writer handler | De-identified native DICOM bytes | Implemented pattern (`easi-js`) |
| Native DICOM bytes | DICOM parser + lint handler | Validation/lint report | Planned |
| Native DICOM bytes | DICOM parser + manifest handler | Lightweight manifest / index | Planned |

## Notes

- The same parser may support multiple output strategies through different handlers.
- Some combinations require chaining handlers or composite handlers.
- Conformance should test both semantic correctness and streaming behavior where applicable.

## Roadmap Fields To Add Later

- Memory profile expectation
- Streaming guarantee level (fully streamed / partially buffered / buffered)
- Multipart support status
- Single-part support status
