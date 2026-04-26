# AGENTS.md
Instructions for AI coding agents working in this repository.
These rules apply to all automated code changes.

---

## 1. Project Overview
This repository provides the EASI platform implementation ("easi-platform"), including the pure JavaScript implementation of EASI, for fluent composition and efficient reading and writing of DICOM&reg; medical images.

- DICOM&reg; studies contain many large instances and require streaming-friendly processing.
- EASI is designed around stream parsing and stream handling (similar in spirit to SAX-style processing).
- The main engineering focus is `easi-js`.

Subsystems in this repository:
- `easi-js`: Primary JavaScript implementation (main target for agent changes).
- `easi-cs`: Reserved placeholder for the future C# implementation of EASI (avoid unless explicitly requested).

---

## 2. Repository Structure
Top-level:
- `/easi-js` Primary runtime/library code.
- `/easi-cs` Reserved placeholder for the future C# EASI implementation.
- `/data` Sample DICOM&reg; files and dictionary source files used by tooling/tests.
- `/ext/tools` External DICOM&reg; tooling binaries/scripts.

`easi-js` structure:
- `/src/EASI.js` Factory entry point (`EASI.pipelineBuilder()`).
- `/src/builders` Reader construction APIs (`PipelineBuilder`).
- `/src/readers` Network stream reader (`PartStreamReader`) that routes single-part vs multipart payloads.
- `/src/parsers` Streaming parsers (`DicomDataParser`, `JsonDataParser`) with status-based flow control.
- `/src/handlers` Event handlers that materialize parse output:
  - `DicomInstanceHandler` -> `Instance`/`MetaSet`/`DataSet` objects.
  - `DicomMappingHandler` -> custom mapped output via mapping classes.
  - `DicomSelectingHandler` -> partial attribute extraction via selection classes.
- `/src/handlers/mappings` Mapping abstractions (`Mapping`, `DicomMapping`, `DicomToFHIRImagingStudyMapping`).
- `/src/handlers/selections` Selection abstractions (`Selection`, `DicomSelection`).
- `/src/dicom` Core DICOM&reg; model/types (`Tag`, `Attribute`, `TransferSyntax`, `Instance`, etc.).
- `/src/fhir` FHIR&reg; model classes used by DICOM&reg;-to-FHIR&reg; mapping.
- `/src/codecs` Pixel data decoding utilities.
- `/test` Jest unit and integration tests (mirrors `src` structure).
- `/doc` Markdown API and class docs.

Agents should avoid modifying:
- `/easi-cs`

---

## 3. Project Architecture (Important)
Use this execution model when implementing features:

1. Build a reader using `EASI -> PipelineBuilder`.
2. Choose source and parser (`fromPartStream().ofDicomData()`, `fromPartStream().ofDicomMetadata()`, `fromPartStream().ofDicomXmlMetadata()`, or `withParser(...)`).
3. Choose output strategy:
   - `toInstances()` for DICOM&reg; object model output.
   - `toMapping(mapping)` for mapped output (typically FHIR&reg;/custom object).
   - `toSelection(selection)` for targeted attribute extraction.
4. Builder wires `reader.parser = parser` and `parser.handler = handler`.
5. `PartStreamReader` reads HTTP response stream and dispatches parsed events.
6. Parser emits lifecycle events to handler (`onStartAttribute`, `onEndAttribute`, etc.).
7. Handler returns final product from `onEndInstance`.

Extension points:
- New parse target: add a handler under `/src/handlers`.
- New mapping strategy: extend `DicomMapping` under `/src/handlers/mappings`.
- New selection strategy: extend `Selection`/`DicomSelection` under `/src/handlers/selections`.
- New domain model support: add model classes in `/src/dicom` or `/src/fhir`, then map/handle accordingly.

---

## 4. Exact Commands
Run commands from repository root unless noted.

Environment:
1. `cd easi-js`
2. `node -v` (expected major version `16` or `18` per `package.json`)

Install dependencies:
1. `cd easi-js`
2. `npm ci`

Run full tests:
1. `cd easi-js`
2. `npm test`

Run full tests serially (more stable local debugging):
1. `cd easi-js`
2. `npm test -- --runInBand`

Run a single test file:
1. `cd easi-js`
2. `npx jest test/dicom/TransferSyntax.test.js`

Run tests matching a name:
1. `cd easi-js`
2. `npx jest -t "TransferSyntax"`

Coverage output:
- Jest coverage is enabled by default (`collectCoverage: true`).
- HTML report path: `easi-js/coverage/lcov-report/index.html`.

---

## 5. Lint and Formatting Rules
Current repository state:
- No `lint` script is defined in `easi-js/package.json`.
- No ESLint/Prettier config is currently configured as a required check.

Agent expectations:
- Follow the existing style of nearby files.
- Preserve class-oriented structure and method naming patterns.
- Do not introduce a new linter/formatter dependency unless explicitly requested.

---

## 6. Coding Standards
Agents must follow these conventions:

- Language: JavaScript (ES module syntax).
- Formatting: match existing class/file formatting and comment style.
- Prefer small, focused classes and minimal diffs.
- Reuse existing abstractions (`Builder`, `Parser`, `Handler`, `Mapping`, `Selection`) instead of bypassing them.
- Do not introduce new dependencies unless necessary and explicitly justified.
- Follow existing naming conventions.

---

## 7. Testing Requirements
All code changes must:

- Include or update unit tests when behavior changes.
- Run relevant tests locally before completing work.
- Run at least `npm test -- --runInBand` for broad changes in `easi-js`.
- Avoid reducing coverage for touched modules without justification.

When adding/changing:
- Parser logic: add tests under `easi-js/test/parsers` (or related integration tests) focused on parser status/edge cases.
- DICOM&reg; model types: add/update class unit tests in `easi-js/test/dicom`.
- Mapping/selection behavior: add targeted tests covering tag presence/absence and completion conditions.

---

## 8. Change Workflow for Agents
Before making changes:

1. Identify the subsystem (`builder`, `reader`, `parser`, `handler`, `mapping`, `selection`, or model).
2. Review related source and existing tests.
3. Make minimal, targeted edits.
4. Run relevant tests, then broader suite as needed.
5. Summarize intent, files changed, and exact validation commands executed.

Agents should avoid large refactors unless explicitly requested.

---

## 9. Security & Safety Rules
Agents MUST:

- Never commit secrets.
- Never modify environment files (`.env*`).
- Avoid changing authentication/authorization or permission logic unless requested.
- Treat all DICOM&reg; sample files as sensitive-style test assets; do not move or publish them outside repo context.

---

## 10. Pull Request Guidance (if applicable)
When preparing PRs:

- Include summary of intent.
- Describe affected modules (e.g., parser/handler/mapping).
- List exact commands run for validation.
- Include test results summary (pass/fail and scope).
- Mention any manual steps required.

---

## 11. Domain Knowledge
- DICOM&reg;: Digital Imaging and Communications in Medicine standard for medical imaging data.
- FHIR&reg;: Fast Healthcare Interoperability Resources standard for interoperable healthcare data.
- EASI: streaming-first API design in this project for efficient parse, transform, and selective extraction of DICOM&reg; data.

---

## 12. Agent Execution Philosophy
Agents should:

- Prefer minimal, safe, incremental changes.
- Reuse existing abstractions.
- Match established architecture patterns.
- Ask for clarification when uncertain.
