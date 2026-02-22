# EASI Core Pipeline

## Purpose

Define the normative core execution model of EASI independent of language and transport implementation.

## Normative Model

EASI is a streaming pipeline composed of:

1. `Reader`
2. `Parser`
3. `Handler`

High-level flow:

1. A `Reader` receives input bytes or stream data.
2. The `Reader` forwards input to a configured `Parser`.
3. The `Parser` decodes the source format incrementally.
4. The `Parser` emits lifecycle events to a configured `Handler`.
5. The `Handler` produces the final output object(s), stream bytes, or side effects.

## Component Responsibilities

### Reader

Responsibilities:

- Owns I/O and transport concerns (single-part vs multipart, stream chunking)
- Feeds data to the parser incrementally
- Applies reader-level options (for example part callbacks)
- Returns the parser/handler result to the caller

Non-responsibilities:

- DICOM element parsing details
- Output materialization semantics (except orchestration)

### Parser

Responsibilities:

- Decodes source format incrementally (for example native DICOM bytes, DICOM JSON)
- Maintains parse state and partial element state
- Emits well-defined lifecycle events to the handler
- Honors handler-returned status flow control (`CONTINUE`, `STOP`, etc.)

Non-responsibilities:

- Transport retrieval and HTTP concerns
- Domain-specific output mapping logic

### Handler

Responsibilities:

- Receives parser lifecycle events
- Materializes or transforms parsed content
- May stream output incrementally (for example native DICOM write handler)
- Returns status values to influence parser control flow

Non-responsibilities:

- Source format tokenization/decoding

## Builder Wiring Contract (Summary)

The standard EASI builder pattern configures:

- source parser selection (`fromXxx`)
- output handling strategy (`toXxx`)
- optional parser/handler overrides (`withParser`, `withHandler`)

When `build()` is called:

1. The builder must create/configure a `Reader`.
2. The builder must assign `reader.parser`.
3. The builder must assign `parser.handler`.
4. The builder must apply configured options/defaults.

Detailed builder requirements are defined in `builder-contract.md`.

## Extension Points

The following extension classes are first-class EASI concepts:

- New parser implementations (new source formats)
- New handler implementations (new outputs / transformations)
- New mapping abstractions (domain transformation)
- New selection abstractions (targeted extraction)

## Open Design Questions (to resolve before freeze)

- Which builder methods are core vs convenience?
- What guarantees are made about buffering vs streaming at each lifecycle event?
- Which lifecycle methods are required vs optional in handlers?
