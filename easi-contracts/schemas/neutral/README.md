# EASI Neutral Schemas

This directory contains the initial language-neutral EASI contract schemas.

Current draft set:

- `common.schema.json`
- `pipeline-manifest.schema.json`
- `pipeline-execution-request.schema.json`
- `pipeline-execution-result.schema.json`
- `pipeline-operation-result.schema.json`
- `stream-trace.schema.json`
- `codegen-request.schema.json`
- `testgen-request.schema.json`
- `capability-statement.schema.json`

Notes:

- These schemas define neutral wire-level envelopes and are intentionally implementation-agnostic.
- Implementation-specific API contracts (for example JavaScript) are stored under:
  - `../implementation/javascript/`
- Additional neutral schema tightening can be layered incrementally as runtime behavior is finalized.
- Fixture validation is driven by:
  - `../../tools/validate-neutral-schemas.js`
  - `../../fixtures/neutral/valid/`
  - `../../fixtures/neutral/invalid/`
