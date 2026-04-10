# EASI Conformance

## Purpose

Define what it means for an implementation to conform to the EASI specification.

Initial scope is focused on official implementations (`easi-js`, future `easi-cs`, `easi-java`, `easi-py`).

## Conformance Model (Draft)

Conformance should be defined at multiple levels:

1. **Core Pipeline Conformance**
2. **Lifecycle/Status Conformance**
3. **Builder Contract Conformance**
4. **Scenario Conformance** (per supported source/output combinations)
5. **Streaming Behavior Conformance** (when claimed)

## Conformance Levels (Proposed)

### Level 1: Core

Must implement:

- Reader/Parser/Handler pipeline model
- Status semantics (`CONTINUE`, `STOP`, `JUMP`, `FAIL`, `SUCCESS`) as specified
- Builder contract core methods (`from...`, `to...`, `with...`, `into...`, `build()`)

### Level 2: DICOM&reg; Core Scenarios

Must implement:

- Native DICOM&reg; bytes -> Instance output
- Native DICOM&reg; bytes -> Selection output
- Native DICOM&reg; bytes -> Mapping output

### Level 3: Extended Scenarios

May include:

- DICOM&reg; JSON metadata parsing
- Native DICOM&reg; write output
- Dump parsing
- Handler chaining (de-identification, linting, manifesting)
- DIMSE transport extensions (source and/or destination profiles, see `dimse.md`)

## Test Assets And Fixtures (Draft)

Conformance should rely on shared fixtures:

- Valid Part-10 DICOM&reg; files
- Multipart payload fixtures
- Nested sequence edge cases
- Truncated / malformed but tolerated inputs (for non-strict mode behavior)
- DICOM&reg; JSON metadata fixtures
- Dump text fixtures

## Expected Assertions (Draft)

Examples:

- Lifecycle events occur in valid order
- Status values alter flow exactly as specified
- Nested sequences close correctly
- Top-level attributes remain top-level after nested sequence parsing
- De-identification chaining preserves structural validity
- Writer round-trip scenarios preserve parseable output

## Language-Specific Allowances

Implementations may differ in:

- method naming case (`fromDicomData` vs `FromDicomData`)
- async primitives (`Promise`, `Task`, `CompletableFuture`)
- byte container types (`Uint8Array`, `byte[]`, `ByteBuffer`)

Implementations must not differ in:

- core semantics
- lifecycle ordering guarantees
- status behavior

## Open Design Questions (to resolve before freeze)

- What is the minimum required scenario set for an “official EASI implementation”?
- How strict should streaming memory guarantees be in conformance tests?
- Should convenience factory APIs be part of conformance or explicitly excluded?
