# StreamingDicomDataParser Backlog

Deferred parser refactor notes to revisit later.

---

## Open Items (Original)

1. Truncated end-of-stream can still return `Status.SUCCESS`.
Current reference points:
- `bright-js/src/parsers/StreamingDicomDataParser.js:1181` (end-of-stream auto-complete path)
- `bright-js/src/parsers/StreamingDicomDataParser.js:1244` (returns `Status.SUCCESS`)

2. Undefined-length empty/odd sequence handling can leak control tags as normal attributes.
Current reference points:
- `bright-js/src/parsers/StreamingDicomDataParser.js:1348` (non-`Item` sequence branch)
- `bright-js/src/parsers/StreamingDicomDataParser.js:1352` (ends sequence without consuming control tag here)
- `bright-js/src/parsers/StreamingDicomDataParser.js:1264` (next element parse path that can materialize control tag)

3. Strict fixed-length VR validation is still over-strict for valid VM > 1 values.
Current reference points:
- `bright-js/src/parsers/StreamingDicomDataParser.js:344`
- `bright-js/src/parsers/StreamingDicomDataParser.js:345`

---

## Open Items (From Evaluation — Correctness / Bugs)

### B-1. Private tag VR mutates the shared tag dictionary singleton
**Severity:** Critical
`Tag.find()` returns a shared reference from the tag registry. Assigning `tag.VR = valueRepresentation` at the private-tag handling path mutates that shared object. In a multipart session parsing multiple instances, a private tag appearing with different VRs across instances will get the first instance's VR permanently baked in. Silent cross-instance data corruption.
Current reference point:
- `bright-js/src/parsers/StreamingDicomDataParser.js:242-243`
Fix direction: Clone the tag entry (or create a local wrapper) before mutating VR.

---

### B-2. `reset()` discards buffered bytes that belong to the next instance
**Severity:** Critical for multipart
`reset()` creates a new `EncodedData()` which abandons whatever bytes are still in the buffer. If a network chunk spans the boundary between two DICOM instances (i.e., the tail of one instance and the header of the next arrive in the same chunk), the leading bytes of the second instance are silently discarded.
Current reference points:
- `bright-js/src/parsers/StreamingDicomDataParser.js:613-614` (reset called after success)
- `bright-js/src/parsers/StreamingDicomDataParser.js:117` (`this.data = new EncodedData()` in reset)
Fix direction: Save `this.data` before reset, transfer remaining bytes after reset.

---

### B-3. End-of-stream auto-complete only unwinds one level of sequence nesting
**Severity:** Bug
The end-of-stream completion path at `isDone == true` closes exactly one item/sequence pair, then stops. If sequences are nested more than one level (legal DICOM), the outer sequences are abandoned without `onEndSequence` events, leaving handler state incomplete.
Current reference points:
- `bright-js/src/parsers/StreamingDicomDataParser.js:1196-1235`
Fix direction: Loop over `this.dataElements` stack, not just the top pair.

---

### B-4. DataSet-level `SKIP` status causes a silent stall
**Severity:** Logic risk
If a handler returns `Status.SKIP` from `onStartDataSet`, `this.status` becomes `SKIP`. `parseNextDataSet` checks `if (this.status === Status.CONTINUE)` and skips the loop. It then returns `Status.CONTINUE` (not STOP/FAIL). On the next `parse()` call, `partStarted` is already true so `onStartDataSet` is not re-fired, `this.status` is still `SKIP`, the loop is skipped again — perpetual stall, no diagnostic, no progress.
Current reference point:
- `bright-js/src/parsers/StreamingDicomDataParser.js:976`
Fix direction: Add a SKIP drain path for DataSet analogous to the MetaSet SKIP drain.

---

### B-5. Missing `FileMetaInformationGroupLength` causes unbounded meta-set parse
**Severity:** Logic risk for malformed DICOM
The meta-set CONTINUE loop exits only when `(totalBytesConsumed - partStart) == metaSetGroupLength`. If `(0002,0000)` is absent or malformed, `metaSetGroupLength` stays 0 and the condition can never be true. The parser continues consuming all subsequent data-set elements as meta-set elements, never transitioning to the DataSet stage, with no diagnostic.
Current reference points:
- `bright-js/src/parsers/StreamingDicomDataParser.js:895-934`
Fix direction: Add a fallback: if a data-element with group != 0x0002 is encountered and metaSetGroupLength is still 0, emit `onError` and force-transition to DataSet.

---

### B-6. `this.status` is shared state mutated by `parseNextDataElement` and read by its callers
**Severity:** Logic risk / maintainability
`parseNextDataSet` and `parseNextMetaSet` drive while-loops calling `parseNextDataElement`. That inner function both reads AND writes `this.status`. Mutations inside the inner function immediately change the outer loop's exit condition and return value at line 1485. There is no contract at the call site about which function "owns" the status. Reasoning about correctness requires mentally executing both simultaneously.
Current reference points:
- `bright-js/src/parsers/StreamingDicomDataParser.js:1271` (inner mutates)
- `bright-js/src/parsers/StreamingDicomDataParser.js:979` (outer reads)
Fix direction: Return a local status from `parseNextDataElement` rather than writing to `this.status`; callers apply it.

---

## Open Items (From Evaluation — Clarity / Structure)

### C-1. `deepCopyArray` uses JSON round-trip for a plain string array
**Severity:** Low perf / clarity
`Utilities.deepCopyArray` calls `JSON.parse(JSON.stringify(arr))` and is used in `reset()` to copy the string partition specification arrays. `arr.slice()` is faster, simpler, and not fragile for non-JSON-serializable values.
Current reference point:
- `bright-js/src/dicom/Utilities.js:77`
- `bright-js/src/parsers/StreamingDicomDataParser.js:87`

---

### C-2. `onProgress` fires with null byte counts during early parse stages
**Severity:** Minor bug
`fireStreamEvent` calls `onProgress` after every `onEnd*` event. But `bytesRead` and `bytesTotal` are only populated in `parse()` at lines 520-521 and are `null` during preamble/prefix parsing and during `reset()`. Handler implementations of `onProgress` will receive null values.
Current reference point:
- `bright-js/src/parsers/StreamingDicomDataParser.js:465-490`

---

### C-3. `peekTagDetails` returns three distinct types: `null`, `false`, and an object
**Severity:** Clarity / correctness risk
`null` means error, `false` means need more data, an object means success. Callers must check `if (details == null)` then `if (details == false)` — two falsy checks with different semantics. A typed result object `{ ok, needsMoreData, ... }` or separate error handling would remove the implicit convention.
Current reference point:
- `bright-js/src/parsers/StreamingDicomDataParser.js:139`

---

### C-4. Three core methods each exceed 150–230 lines with 4–5 levels of nesting
**Severity:** Maintainability
`peekTagDetails` (~250 lines), `parseNextDataSet` (~200 lines), and `parseNextDataElement` (~230 lines) are very large with deep nesting. Named private helpers would each be independently testable and would make each method's intent readable at a glance:
- `_peekExplicitTagHeader(bytesPeeked)`
- `_peekImplicitTagHeader(bytesPeeked)`
- `_processUndefinedLengthAttribute(isDone)`
- `_processSequenceCompletion()`
Current reference points:
- `bright-js/src/parsers/StreamingDicomDataParser.js:139` (peekTagDetails)
- `bright-js/src/parsers/StreamingDicomDataParser.js:951` (parseNextDataSet)
- `bright-js/src/parsers/StreamingDicomDataParser.js:1259` (parseNextDataElement)

---

### C-5. Remaining `var` usage throughout the parser body
**Severity:** Clarity
`peekTagDetails`, `parseNextDataElement`, and related methods still use `var` for most local variables outside the `valueLength`/`length` variables already converted. In a complex state machine, `let`/`const` make scoping intent explicit and prevent hoisting surprises.

---

### C-6. `result.valueLength` is grafted onto the result object after a long block
**Severity:** Clarity
In `peekTagDetails`, the `result` object is constructed without `valueLength`, which is then assigned ~60 lines later via `result.valueLength = valueLength`. A reader of the object construction sees an incomplete object. Moving `valueLength` into the literal at construction time makes the object's shape visible at its definition.
Current reference point:
- `bright-js/src/parsers/StreamingDicomDataParser.js:305-311` (construction without valueLength)
- `bright-js/src/parsers/StreamingDicomDataParser.js:368` (assignment after the fact)

---

## Notes

- The parser intentionally supports permissive behavior for real-world malformed DICOM interoperability.
- Any permissive recovery behavior should still expose explicit diagnostics to avoid silent data-integrity ambiguity.
