# EASI Builder Contract

## Purpose

Define the normative builder semantics for constructing EASI pipelines.

## Design Intent

The builder provides a declarative way to configure:

- source format (`fromXxx`)
- output strategy (`toXxx`)
- optional parser/handler overrides (`withXxx`)
- optional control flags (`withIsStrict`, masks, callbacks, etc.)

## Core Builder Methods (Draft)

### Source Selection (`from...`)

Examples:

- `fromDicomData()`
- `fromDicomMetadata()`

Normative intent:

- `fromXxx` configures the parser for the specified source format
- `fromXxx` should not finalize the reader

### Output Selection (`to...`)

Examples:

- `toInstances()`
- `toSelection(selection)`
- `toMapping(mapping)`
- `toDicomData(...)`

Normative intent:

- `toXxx` configures handler/output strategy
- `toXxx` may also apply parser defaults where the scenario demands a specific parser
- Any parser override behavior must be documented explicitly

### Overrides (`with...`)

Examples:

- `withParser(parser)`
- `withHandler(handler)`
- `withMask(mask)`
- `withIsStrict(isStrict)`

Normative intent:

- `withXxx` methods set explicit caller intent
- Later calls override earlier calls unless otherwise documented

## `build()` Contract (Draft)

`build()` must:

1. Validate that a parser is available (configured or defaulted)
2. Default the handler when omitted (if a default exists for the selected parser)
3. Create/configure a reader
4. Wire `reader.parser`
5. Wire `parser.handler`
6. Apply builder options to parser/reader/handler as defined
7. Return the configured reader

## Precedence Rules (Draft)

Define and freeze precedence for combinations such as:

- `fromXxx().withParser(customParser)`
- `withParser(customParser).toInstances()`
- `toMapping(mapping)` when a non-DICOM parser is already selected

Current implementation behavior should be documented before this is frozen.

## Core vs Convenience API

### Core (recommended to freeze first)

- `newStreamingReaderBuilder()`
- `fromXxx`, `toXxx`, `withXxx`, `build()`

### Convenience (may evolve)

- `EASI.newStreamingDicomInstanceReaderBuilder()`
- `EASI.newStreamingDicomDataWriterReaderBuilder()`
- other scenario-specific helpers

## Open Design Questions (to resolve before freeze)

- Should builder methods return specialized typed builder states in some languages?
- Which `toXxx` methods are normative vs implementation conveniences?
