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
| Native DICOM&reg; bytes | Streaming DICOM&reg; parser | Instance handler | DICOM&reg; `Instance` model | Implemented (`easi-js`) |
| Native DICOM&reg; bytes | Streaming DICOM&reg; parser | Selection handler | Attribute selection result | Implemented (`easi-js`) |
| Native DICOM&reg; bytes | Streaming DICOM&reg; parser | Mapping handler | Custom mapped output (e.g. FHIR&reg;) | Implemented (`easi-js`) |
| Native DICOM&reg; bytes | Streaming DICOM&reg; parser | DICOM&reg; data writer handler | Native DICOM&reg; bytes | Implemented (`easi-js`) |
| Native DICOM&reg; bytes | Streaming DICOM&reg; parser + transcoding filter | DICOM&reg; data writer handler | Transfer-syntax transcoded native DICOM&reg; bytes | Planned (`withTranscoding` contract drafted) |
| Native DICOM&reg; bytes | DICOM&reg; parser + assets archive handler | ZIP package (`metadata.json` + `frames/*` + `manifest.json`) | Standard metadata + image payload package | Implemented (`easi-js`) |
| DICOM&reg; JSON metadata | Streaming JSON parser | Metadata instance handler | DICOM&reg; `Instance` model | Implemented (`easi-js`) |
| DICOM&reg; JSON metadata | Streaming JSON parser | Metadata selection handler | Attribute selection result | Implemented (`easi-js`) |
| DICOM&reg; JSON metadata | Streaming JSON parser | Metadata mapping handler | Custom mapped output (e.g. FHIR&reg;) | Implemented (`easi-js`) |
| JSON (generic) | Streaming JSON parser | JSON value handler | JS value tree | Implemented (`easi-js`) |
| DICOM&reg; dump text | Dump parser | Instance/selection/mapping handlers | Multiple outputs | Implemented (`easi-js`) |
| DICOM&reg; JSON metadata | JSON parser + DICOM&reg; data writer handler path | Native DICOM&reg; bytes | Planned / evaluate |
| Native DICOM&reg; bytes | DICOM&reg; parser + de-identify handler + DICOM&reg; data writer handler | De-identified native DICOM&reg; bytes | Implemented pattern (`easi-js`) |
| Native DICOM&reg; bytes | DICOM&reg; parser + lint handler | Validation/lint report | Planned |
| Native DICOM&reg; bytes | DICOM&reg; parser + manifest handler | Lightweight manifest / index | Planned |
| DIMSE source association (PACS) | DICOM&reg; parser | Instance handler | DICOM&reg; `Instance` model | Planned (`dimse.md` draft) |
| DIMSE source association (PACS) | DICOM&reg; parser + de-identify filter + DICOM&reg; data writer terminal | De-identified native DICOM&reg; bytes | Planned (`dimse.md` draft) |
| DIMSE source association (PACS) | DICOM&reg; parser + mapping handler | Mapped output (e.g. FHIR&reg;) | Planned (`dimse.md` draft) |
| Native DICOM&reg; bytes | DICOM&reg; parser + filters + DICOM&reg; data writer terminal + DIMSE destination association | Streamed C-STORE to PACS/VNA | Planned (`dimse.md` draft) |
| DIMSE source association (PACS) | DICOM&reg; parser + filters + DICOM&reg; data writer terminal + DIMSE destination association | PACS -> process -> PACS relay | Planned (`dimse.md` draft) |

## Notes

- The same parser may support multiple output strategies through different handlers.
- Some combinations require chaining handlers or composite handlers.
- Conformance should test both semantic correctness and streaming behavior where applicable.

## Roadmap Fields To Add Later

- Memory profile expectation
- Streaming guarantee level (fully streamed / partially buffered / buffered)
- Multipart support status
- Single-part support status
