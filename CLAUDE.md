# CLAUDE.md
AI assistant guidance for the easi-platform repository.

---

## Project Overview

This repository (easi-platform) includes the pure JavaScript implementation of **EASI** (Expressive API Standard for Imaging) for fluent composition and efficient, streaming-oriented processing of DICOM&reg; medical images. The architecture is explicitly SAX-style: data flows through a `PartStreamReader → Parser → Handler` pipeline with status-based flow control at each stage.

**Primary target for all work:** `easi-js/`

**Avoid unless explicitly requested:**
- `easi-cs/` (reserved placeholder for the future C# EASI implementation)

---

## Repository Layout

```
easi-js/src/
  EASI.js                   # Factory entry point
  builders/                 # PipelineBuilder
  readers/                  # PartStreamReader (HTTP, single-part and multipart)
  parsers/                  # DicomDataParser, JsonDataParser, Status
  handlers/                 # DicomInstanceHandler, MappingHandler, SelectingHandler
    mappings/               # Mapping, DicomMapping, DicomToFHIRImagingStudyMapping
    selections/             # Selection, DicomSelection
  dicom/                    # Core model: Tag, Attribute, AttributeSequence, DataSet,
                            #   Instance, MetaSet, TransferSyntax, ValueRepresentation, etc.
  fhir/                     # FHIR&reg; model classes used by DICOM&reg;-to-FHIR&reg; mapping
  codecs/                   # Pixel data decoding utilities

easi-js/test/             # Jest tests (mirrors src/ tree)
  dicom/                    # Unit tests for DICOM&reg; model classes
    entities/               # Entity-level integration tests (CT, XA, Image, Entity)
    parsers/                # Parser integration tests
easi-js/backlog/          # Deferred work notes (read before touching parsers)
data/                       # Sample DICOM&reg; files and dictionary source files
```

---

## Architecture: PartStreamReader → Parser → Handler

```
EASI.pipelineBuilder()
  .fromPartStream().ofDicomData()          # sets parser = DicomDataParser
  .toInstances()            # sets handler = DicomInstanceHandler
  .build()                  # wires parser.handler = handler, reader.parser = parser
```

Parser emits lifecycle events to the handler:
`onStartInstance → onStartMetaSet/DataSet → onStartAttribute → onAppendAttribute → onEndAttribute → … → onEndInstance`

Handler methods return a `Status` symbol to direct the parser:
- `CONTINUE` — keep parsing normally
- `SKIP` — skip this element's data but keep consuming
- `JUMP` — skip the remaining current part
- `STOP` — stop after this element is complete
- `FAIL` — abort
- `SUCCESS` — parse complete

Extension points:
- **New output format:** add a handler under `src/handlers/`
- **New mapping:** extend `DicomMapping` under `src/handlers/mappings/`
- **New selection:** extend `Selection`/`DicomSelection` under `src/handlers/selections/`
- **New domain model:** add classes under `src/dicom/` or `src/fhir/`

---

## Commands

All commands run from inside `easi-js/` unless noted.

```bash
# Install
npm ci

# Run all tests (with coverage)
npm test

# Run serially — prefer this for local debugging
npm test -- --runInBand

# Run a specific test file
npx jest test/dicom/TransferSyntax.test.js

# Run tests matching a name
npx jest -t "TransferSyntax"
```

Coverage HTML report: `easi-js/coverage/lcov-report/index.html`

Node.js requirement: `18.x` or `16.x` (see `package.json` `engines` field).

---

## Code Style

- **Language:** JavaScript ES modules (`import`/`export default`).
- **Class structure:** class-oriented; one default export per file.
- **File header:** every file carries the standard proprietary notice block; preserve it on new files.
- **Naming:** match existing patterns (`XxxYyy`, `onStartXxx`/`onEndXxx`, `parseNextXxx`).
- **Comments:** use inline block comments (`/* ... */`) and line comments (`// ...`) in the existing style; don't add JSDoc to methods you didn't touch.
- **No linter/formatter tooling** is configured — match the surrounding file's formatting by eye.
- **No new dependencies** without explicit justification.

---

## Testing Requirements

- Include or update tests for any behavior change.
- Tests live in `easi-js/test/` mirroring `easi-js/src/`.
- Parser logic tests go in `test/dicom/` (or `test/dicom/parsers/`).
- Model class tests go in `test/dicom/`.
- Mapping/selection tests should cover tag-present, tag-absent, and completion conditions.
- Do not reduce coverage for touched modules without justification.
- Run `npm test -- --runInBand` before considering a change done.

---

## Known Backlog / Before You Touch Parsers

Read `easi-js/backlog/parsers/DicomDataParser.md` before modifying the parser. It documents three known deferred issues:

1. Truncated end-of-stream can return `Status.SUCCESS` (lines ~1181 / ~1244).
2. Undefined-length empty/odd sequences can leak control tags as normal attributes (lines ~1348 / ~1352 / ~1264).
3. Strict fixed-length VR validation is over-strict for valid VM > 1 values (lines ~344–345).

The parser deliberately tolerates real-world malformed DICOM&reg;; do not tighten permissive paths without explicit request and corresponding diagnostic output.

---

## Security & Safety

- Never commit secrets or modify `.env*` files.
- Do not alter authentication/authorization logic unless explicitly asked.
- Treat all files under `data/` as sensitive test assets; do not move or publish them.

---

## Change Workflow

1. Identify the subsystem (`builder`, `reader`, `parser`, `handler`, `mapping`, `selection`, model).
2. Read the relevant source and its existing tests before changing anything.
3. Make minimal, targeted edits — avoid opportunistic refactoring.
4. Run the relevant test file, then `npm test -- --runInBand`.
5. Summarize: intent, files changed, exact commands run, test results.

---

## Domain Glossary

| Term | Meaning |
|---|---|
| DICOM&reg; | Digital Imaging and Communications in Medicine — the medical imaging standard |
| EASI | Expressive API Standard for Imaging — a fluent and efficient streaming abstraction in this project |
| FHIR&reg; | Fast Healthcare Interoperability Resources — the interoperability standard used for output mapping |
| Part-10 | DICOM&reg; file format (preamble + prefix + meta-set + data-set) |
| Part-5 | Raw DICOM&reg; data-set without preamble/prefix |
| VR | Value Representation — describes the data type of a DICOM&reg; attribute |
| SOP Class | Service-Object Pair class — identifies the type of DICOM&reg; object |
| WADO-RS | Web Access to DICOM&reg; Objects via RESTful Services — DICOMweb&trade; retrieval protocol |
