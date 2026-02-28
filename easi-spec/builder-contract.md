# EASI Builder Contract

## Purpose

Define the normative builder semantics for constructing EASI pipelines.

## Design Intent

The builder provides a declarative way to configure:

- source stream type (`fromXxx`)
- source format (`ofXxx`)
- output strategy (`toXxx`) via a terminal handler
- optional handler chain stages (for example de-identification)
- optional output packaging/writer composition where supported by the implementation
- optional parser/handler overrides (`withXxx`)
- optional control flags (`withIsStrict`, masks, callbacks, etc.)

## Core Builder Methods (Draft)

### Source Selection (`from...`)

Examples:

- `fromPartStream()`

Normative intent:

- `fromXxx` configures the reader/source stream type
- `fromXxx` should not finalize the reader

### Source Format Selection (`of...`)

Examples:

- `ofDicomData()`
- `ofDicomMetadata()`
- `ofDicomXmlMetadata()`

Normative intent:

- `ofXxx` configures the parser for the specified source format
- `ofXxx` should not finalize the reader

### Output Selection (`to...`)

Examples:

- `toInstances()`
- `toSelection(selection)`
- `toMapping(mapping)`
- `toDicomData(...)`

Normative intent:

- `toXxx` configures a terminal handler/output strategy
- `toXxx` may also apply parser defaults where the scenario demands a specific parser
- Any parser override behavior must be documented explicitly
- `toXxx` does not preclude additional handler stages being composed around the terminal handler during `build()`

### Overrides (`with...`)

Examples:

- `withParser(parser)`
- `withHandler(handler)`
- `withMask(mask)`
- `withIsStrict(isStrict)`

Normative intent:

- `withXxx` methods set explicit caller intent
- Later calls override earlier calls unless otherwise documented
- Some `withXxx` methods may configure deferred composition behavior (for example `withMask(mask)` causing a de-identification filter handler to wrap the terminal handler during `build()`)

## `build()` Contract (Draft)

`build()` must:

1. Validate that a parser is available (configured or defaulted)
2. Determine or default the terminal handler when omitted (if a default exists for the selected parser)
3. Create/configure a reader
4. Compose configured handler chain stages around the terminal handler (if any)
5. Wire `reader.parser`
6. Wire `parser.handler` to the head of the composed chain (or the terminal handler when no chain stages exist)
7. Apply builder options to parser/reader/handler as defined
8. Return the configured reader

## Precedence Rules (Draft)

Define and freeze precedence for combinations such as:

- `fromXxx().withParser(customParser)`
- `withParser(customParser).toInstances()`
- `toMapping(mapping)` when a non-DICOM parser is already selected
- `withMask(mask).withHandler(customHandler)` and `withHandler(customHandler).withMask(mask)` (whether mask wraps the explicit handler)

Current implementation behavior should be documented before this is frozen.

## Core vs Convenience API

### Core (recommended to freeze first)

- `pipelineBuilder()`
- `fromXxx`, `ofXxx`, `toXxx`, `withXxx`, `build()`
- handler-chain composition semantics
- status propagation through handler chains

### Convenience (may evolve)

- Convenience helpers are intentionally deferred for now
- `EASI` currently exposes only `pipelineBuilder()`
- Scenario-specific factories can be added later once the normative core is frozen
- explicit transport writer helpers and shortcuts beyond the core reader/parser/handler builder

## Open Design Questions (to resolve before freeze)

- Should builder methods return specialized typed builder states in some languages?
- Which `toXxx` methods are normative vs implementation conveniences?
- Should writer composition be modeled directly in the reader builder, or remain an implementation-level helper after terminal handler emission?
