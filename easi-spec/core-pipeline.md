# EASI Core Pipeline

## Purpose

Define the normative core execution model of EASI independent of language and transport implementation.

## Normative Model

EASI is a streaming pipeline composed of:

1. `Source` (input bytes / stream payload)
2. `Reader`
3. `Parser`
4. `HandlerChain` (zero or more handler stages)
5. `TerminalHandler`
6. optional `Writer` (transport/output packaging stage)

High-level flow:

1. A `Reader` receives input bytes or stream data from the `Source`.
2. The `Reader` forwards input to a configured `Parser`.
3. The `Parser` decodes the source format incrementally.
4. The `Parser` emits lifecycle events to the head of the configured handler chain.
5. Each handler stage may inspect, transform, or forward events.
6. The `TerminalHandler` produces the final output object(s), emitted bytes, or side effects.
7. When used, a `Writer` packages output for transport (for example single-part or multipart framing).

Example forms:

- Typical parse/materialize pipeline: `Reader -> Parser -> TerminalHandler`
- Filtered pipeline: `Reader -> Parser -> HandlerChain -> TerminalHandler`
- Parse/transform/emit pipeline: `Reader -> Parser -> HandlerChain -> TerminalHandler -> Writer`

## Normative Terminology

- `HandlerChain`: ordered handler stages that receive parser lifecycle events.
- `Filter Handler` / `Transform Handler`: a handler stage that modifies or selectively forwards events to a next handler (for example de-identification).
- `TerminalHandler`: the final handler stage that materializes output, emits bytes, or records results.
- `Writer`: an optional post-handler output packaging component (for example multipart body writer).

## Component Responsibilities

### Reader

Responsibilities:

- Owns I/O and transport concerns (single-part vs multipart, stream chunking)
- Feeds data to the parser incrementally
- Applies reader-level options (for example part callbacks)
- Returns the parser/handler result to the caller

Non-responsibilities:

- DICOM&reg; element parsing details
- Output materialization semantics (except orchestration)

### Parser

Responsibilities:

- Decodes source format incrementally (for example native DICOM&reg; bytes, DICOM&reg; JSON)
- Maintains parse state and partial element state
- Emits well-defined lifecycle events to the handler
- Honors handler-returned status flow control (`CONTINUE`, `STOP`, etc.)

Non-responsibilities:

- Transport retrieval and HTTP concerns
- Domain-specific output mapping logic

### HandlerChain / TerminalHandler

Responsibilities:

- Receives parser lifecycle events
- Handler stages may transform, filter, annotate, or forward parsed content
- Terminal handlers materialize output or emit stream bytes incrementally (for example native DICOM&reg; write handler)
- Returns status values to influence parser control flow

Non-responsibilities:

- Source format tokenization/decoding

Implementation note (reference behavior):

- De-identification is represented as a filter handler that wraps a terminal handler and forwards lifecycle events to `nextHandler`.

### Writer (Optional)

Responsibilities:

- Packages terminal handler output for a destination protocol or transport shape
- Supports output framing concerns (for example single-part vs multipart)
- Streams output bytes/chunks without requiring full buffering when supported

Non-responsibilities:

- Source format parsing
- DICOM&reg; semantic transformation (unless explicitly implemented as a handler instead)

## Builder Wiring Contract (Summary)

The standard EASI builder pattern configures:

- source parser selection (`fromXxx`)
- output handling strategy (`toXxx`)
- optional parser/handler overrides (`withParser`, `withHandler`)

When `build()` is called:

1. The builder must create/configure a `Reader`.
2. The builder must assign `reader.parser`.
3. The builder must compose any configured handler stages and terminal handler.
4. The builder must assign `parser.handler` to the head of the composed chain.
5. The builder must apply configured options/defaults.

Detailed builder requirements are defined in `builder-contract.md`.

## Extension Points

The following extension classes are first-class EASI concepts:

- New parser implementations (new source formats)
- New handler implementations (filter/transform stages and terminal handlers)
- New writer implementations (transport/output packaging)
- New mapping abstractions (domain transformation)
- New selection abstractions (targeted extraction)

## Open Design Questions (to resolve before freeze)

- Which builder methods are core vs convenience?
- What guarantees are made about buffering vs streaming at each lifecycle event?
- Which lifecycle methods are required vs optional in handlers?
