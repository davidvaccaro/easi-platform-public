# EASI Specification (Normative Hub)

EASI (Expressive API Standard for Imaging) is a language-neutral API specification for fluent pipeline composition and efficient, streaming-first interaction with DICOM&reg; and related healthcare imaging formats.

EASI is not a replacement for the DICOM&reg; data standard. DICOM&reg; remains the authoritative data standard. EASI defines a consistent, recognizable API contract for reading, parsing, transforming, validating, de-identifying, selecting, mapping, and emitting DICOM&reg; data efficiently across programming languages.

This `README.md` is the primary hub of the EASI specification. It defines the value, scope, conformance model, and core design principles, and links to supporting spec documents that elaborate the details.

## Why EASI Exists

DICOM&reg; is ubiquitous and powerful, but application developers often need to handle:

- multipart transport and streaming input
- nested sequence parsing complexity
- large payloads (for example pixel data)
- multiple source encodings (native DICOM&reg; bytes, DICOMweb&trade; JSON metadata, DICOMweb&trade; XML metadata)
- transformation and extraction workflows (selection, mapping, de-identification, validation)

EASI standardizes a clean API interaction model so client applications can work with DICOM&reg; efficiently without re-implementing parser orchestration and event flow logic in every project and language.

## EASI Value Proposition

EASI provides:

- An expressive, fluent API shape that is recognizable across languages
- A simple mental model for composition and extension
- An efficient, streaming-first execution model designed for large imaging payloads
- A composable pipeline for adapters, filters, and terminal outputs
- Explicit flow-control semantics (`CONTINUE`, `STOP`, `JUMP`, `FAIL`, `SUCCESS`)
- A clean separation between source parsing and downstream DICOM&reg;-domain processing
- A conformance target for multiple implementations (`easi-js`, `easi-cs`, `easi-java`, `easi-py`, etc.)

## What Is Normative vs Informative

Normative EASI content defines required semantics and behavior for conforming implementations.

Normative EASI content includes:

- pipeline model
- lifecycle and status semantics
- builder intent semantics (`from...`, `to...`, `with...`, `into...`, `build()`)
- compatibility and error behavior expectations
- conformance levels and conformance assertions

Informative content may include:

- implementation examples
- performance notes
- language-specific ergonomics
- convenience factory APIs (unless explicitly promoted into conformance)
- roadmap scenarios

## Normative Language

This specification uses the terms `MUST`, `SHOULD`, and `MAY` in their standard normative sense:

- `MUST`: required for conformance
- `SHOULD`: recommended; deviations require justification
- `MAY`: optional implementation choice

## EASI Core v0.1 Normative Scope

The initial normative target is **EASI Core v0.1**.

EASI Core v0.1 defines:

1. The streaming pipeline model:
   - `Reader -> Parser -> [Adapters] -> [Filters] -> Terminal -> [Writer]`
2. The canonical DICOM&reg; semantic lifecycle event contract and ordering semantics
3. Status flow-control semantics:
   - `CONTINUE`, `SUCCESS`, `STOP`, `JUMP`, `FAIL`
4. Core builder semantics:
   - `from...`, `to...`, `with...`, `into...`, `build()`
5. Parser/adapter/filter/terminal compatibility behavior
6. Conformance levels and baseline scenario expectations

EASI Core v0.1 intentionally does not attempt to restate the DICOM&reg; standard itself.

## Non-Goals (Initial)

The following are out of scope for EASI Core v0.1:

- restating DICOM&reg; encoding rules beyond what is needed for API semantics
- standardizing internal implementation data structures
- prescribing language-specific naming casing (`camelCase` vs `PascalCase`)
- prescribing transport framework choices (Node streams, .NET streams, Java I/O, etc.)
- requiring all convenience factory methods for conformance

## Core Design Principle: Semantics First, Syntax Second

EASI should be recognizable across languages, but exact syntax does not need to be identical.

What must remain consistent:

- pipeline semantics
- lifecycle semantics
- status behavior
- builder intent (`from`, `to`, `with`, `build`)
- compatibility/error semantics

What may vary by language:

- method casing (`fromDicomData` vs `FromDicomData`)
- async primitives (`Promise`, `Task`, `CompletableFuture`)
- byte container types (`Uint8Array`, `byte[]`, `ByteBuffer`)
- convenience overloads

## Canonical EASI Pipeline Taxonomy (Normative Vocabulary)

These terms are the normative vocabulary used throughout the spec:

- `Reader`: owns I/O / stream ingestion and source part orchestration
- `Parser`: decodes a source format incrementally
- `Adapter`: translates parser-specific syntax events into canonical DICOM&reg; semantic events
- `Filter`: pass-through transform/validation stage on canonical DICOM&reg; semantic events
- `Terminal`: final handler stage that materializes output or emits transformed bytes
- `Writer` (optional): post-terminal packaging/framing stage for transport output

This vocabulary is designed to remain stable across implementations.

## Canonical Builder Intent (Normative)

EASI standardizes the builder intent model:

- `from...`: choose source format / parser family
- `to...`: choose terminal behavior / output strategy
- `with...`: configure explicit options, overrides, callbacks, and pipeline stages
- `into...`: choose destination transport/writer packaging for emitted output when applicable
- `build()`: validate and compose the pipeline (fail-fast)

Reference implementations may provide additional convenience entry points, but the `from` / `to` / `with` / `into` / `build` intent model is the recognizable core.

## Conformance Levels (Normative Model)

Conformance is defined in levels so implementations can be useful before full feature parity.

### Level 1: Core API Conformance

A Level 1 implementation MUST provide:

- Reader/Parser/Handler pipeline model semantics
- lifecycle and status semantics as specified
- core builder semantics (`from...`, `to...`, `with...`, `build()`)
- fail-fast build validation for invalid pipeline composition

### Level 2: DICOM&reg; Core Scenario Conformance

A Level 2 implementation MUST additionally support the core DICOM&reg; scenarios:

- native DICOM&reg; bytes -> DICOM&reg; Instance model
- native DICOM&reg; bytes -> selection output
- native DICOM&reg; bytes -> mapping output

### Level 3: Extended Scenario Conformance

A Level 3 implementation MAY include additional standardized scenarios such as:

- DICOMweb&trade; JSON metadata parsing
- DICOMweb&trade; XML metadata parsing
- de-identification filters
- validation filters
- native DICOM&reg; byte re-emission
- transport writers

### Official Implementation Guidance

Official EASI implementations SHOULD target:

- Level 1 + Level 2 first
- Level 3 incrementally with documented scenario support

Detailed conformance guidance and fixtures are defined in [`conformance.md`](./conformance.md).

## Multi-Language Example (Same EASI Intent, Different Language Syntax)

### JavaScript (Reference style)

```js
const reader = EASI.pipelineBuilder()
  .fromPartStream()
  .ofDicomData()
  .withValidation('permissive')
  .toInstances()
  .build();
```

### C# (Idiomatic .NET casing, same semantics)

```csharp
var reader = EASI.PipelineBuilder()
    .FromPartStream()
    .OfDicomData()
    .WithValidation("permissive")
    .ToInstances()
    .Build();
```

### Java (Idiomatic JVM style, same semantics)

```java
var reader = EASI.pipelineBuilder()
    .fromPartStream()
    .ofDicomData()
    .withValidation("permissive")
    .toInstances()
    .build();
```

### Python (Fluent style can still be recognizable)

```python
reader = (
    EASI.pipeline_builder()
    .from_part_stream()
    .of_dicom_data()
    .with_validation("permissive")
    .to_instances()
    .build()
)
```

The exact casing differs, but the EASI interaction model remains recognizable.

## Example EASI Pipeline Shapes (Normative Concepts, Informative Examples)

- Native DICOM&reg; parse to Instance:
  - `Reader -> DICOM&reg; Parser -> DICOM&reg; Instance Terminal`
- DICOMweb&trade; JSON metadata to shared DICOM&reg; handlers:
  - `Reader -> JSON Parser -> DICOM&reg; JSON Metadata Adapter -> DICOM&reg; Terminal`
- Native DICOM&reg; de-identify and emit native DICOM&reg; bytes:
  - `Reader -> DICOM&reg; Parser -> Validation Filter (optional) -> DeIdentification Filter -> DICOM&reg; Data Writer Terminal -> Writer (optional)`
- DIMSE PACS source to DIMSE PACS destination:
  - `DIMSE Source -> DICOM&reg; Parser -> [Filters] -> DICOM&reg; Data Writer Terminal -> DIMSE Destination`

## Specification Document Map

Use this `README` as the primary overview and entry point. Use the supporting documents for detailed normative semantics.

### Core (Normative)

- [`core-pipeline.md`](./core-pipeline.md)
  - normative execution model and component responsibilities
- [`lifecycle-and-status.md`](./lifecycle-and-status.md)
  - lifecycle event ordering and status flow semantics
- [`asset-archive.md`](./asset-archive.md)
  - normative ZIP package format for mapped metadata + extracted payload assets
- [`builder-contract.md`](./builder-contract.md)
  - builder intent, composition, and `build()` behavior
- [`transcoding.md`](./transcoding.md)
  - draft normative `withTranscoding(...)` contract, including `onFrame` and `onConcern` payloads
- [`dimse.md`](./dimse.md)
  - draft DIMSE transport extension contract for PACS/RIS/VNA pipeline composition
- [`conformance.md`](./conformance.md)
  - conformance levels, assertions, and implementation allowances

### Supporting / Mixed (Normative + Informative)

- [`scenario-matrix.md`](./scenario-matrix.md)
  - implemented vs planned source/output combinations and roadmap tracking
- [`dicom-capability-statement.md`](./dicom-capability-statement.md)
  - implementation-facing statement of current `easi-js` DICOM&reg; support

## Relationship to Implementations

- `EASI` = specification / API contract
- `BrightDicom` = monorepo and official implementation host
- `easi-js`, `easi-cs`, `easi-java`, `easi-py` = language-specific implementations of EASI

Implementations may evolve internally, but conforming behavior MUST remain aligned with this specification.

## Recommended Freeze Sequence (Pragmatic)

To stabilize EASI before broad multi-language rollout:

1. Freeze pipeline terminology and model
2. Freeze lifecycle/status semantics
3. Freeze builder core semantics and compatibility rules
4. Freeze conformance levels and baseline scenario expectations
5. Expand implementations and language-specific ergonomics

## Current Status

- Draft (`v0.x`)
- Pre-production design freeze in progress
- Reference implementation: `easi-js`

## Summary

EASI succeeds if a developer can recognize the same streaming imaging API model across languages, while DICOM&reg; remains the underlying data standard. The specification should therefore standardize semantics and vocabulary first, and fluent syntax second.
