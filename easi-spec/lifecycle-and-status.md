# EASI Lifecycle And Status

## Purpose

Define parser-to-handler lifecycle ordering and the normative semantics of EASI status values.

## Lifecycle Events (Draft)

The parser emits lifecycle events to the handler as parsing progresses.

Common event families (names may vary slightly by source format but semantics should align):

- `onReset`
- `onStartInstance`
- `onStartMetaSet`
- `onStartDataSet`
- `onStartAttribute`
- `onAppendAttribute`
- `onEndAttribute`
- `onStartSequence`
- `onEndSequence`
- `onStartItem`
- `onEndItem`
- `onEndMetaSet`
- `onEndDataSet`
- `onEndInstance`
- `onError`
- `onProgress`

## Ordering Rules (Draft)

### Instance-level ordering

1. `onStartInstance`
2. zero or more meta-set / data-set / attribute events
3. `onEndInstance`

### Attribute ordering

1. `onStartAttribute`
2. zero or more `onAppendAttribute` calls
3. `onEndAttribute`

Notes:

- `onAppendAttribute` may be called multiple times for streamed values.
- Some attributes may complete without append chunks depending on parser implementation and value size.

### Sequence and item ordering

Nested sequence/item events must be properly balanced and emitted in structured order.

The parser must preserve nesting correctness even when input data is incomplete or odd (subject to parser strictness/tolerance mode).

## Status Values (Normative Intent)

The handler may return a status value to influence parser flow control.

### `CONTINUE`

- Continue parsing normally.

### `SUCCESS`

- Parsing completed successfully.
- Reader should resolve the current result.

### `STOP`

- Stop parsing the current source/part after current operation is complete.
- Reader should resolve the current result.

### `JUMP`

- Skip the remainder of the current multipart part (or equivalent source unit), then continue with next unit when applicable.
- Behavior for single-part sources must be explicitly defined by each reader implementation.

### `FAIL`

- Abort parsing due to an unrecoverable error.
- Reader should reject/fail the operation.

### `SKIP` (if supported by parser/handler pair)

- Skip current element content while preserving parse continuity.
- This status is parser/format dependent and must be documented where supported.

## Error And Tolerance Model (Draft)

EASI implementations may support strict and tolerant parsing modes.

The specification must define:

- which structural violations are always terminal (`FAIL`)
- which violations may be tolerated in non-strict mode
- what diagnostics are required (if any)

## Open Design Questions (to resolve before freeze)

- Exact `JUMP` semantics for single-part sources
- Whether `SKIP` is core EASI or parser-specific
- Required lifecycle events vs optional extension events
