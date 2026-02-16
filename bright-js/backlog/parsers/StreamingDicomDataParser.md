# StreamingDicomDataParser Backlog

Deferred parser refactor notes to revisit later.

## Open Items

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

## Notes

- The parser intentionally supports permissive behavior for real-world malformed DICOM interoperability.
- Any permissive recovery behavior should still expose explicit diagnostics to avoid silent data-integrity ambiguity.
