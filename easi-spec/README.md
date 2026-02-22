# EASI Specification

This folder defines the language-neutral EASI API specification for streaming healthcare imaging workflows.

Purpose:

- Define the core EASI contract independent of implementation language (`easi-js`, `easi-cs`, `easi-java`, `easi-py`, etc.)
- Separate normative behavior (must/should) from convenience APIs (may evolve)
- Establish a foundation for conformance tests and cross-language parity

Status:

- Draft (`v0.x`)
- Pre-production design freeze work-in-progress

Scope (initial):

- Core pipeline model (`Reader -> Parser -> Handler`)
- Lifecycle event ordering and status semantics
- Builder contract (source/target/wiring/defaults)
- Supported scenario combinations (current + planned)
- Conformance expectations for official implementations

Non-goals (initial):

- Full DICOM standard restatement
- Language-specific implementation details
- Transport/framework-specific guidance beyond what is required for semantic parity

Documents:

- `core-pipeline.md`
- `lifecycle-and-status.md`
- `builder-contract.md`
- `scenario-matrix.md`
- `conformance.md`

Terminology:

- `EASI` refers to the API specification / contract.
- `BrightDicom` refers to the monorepo and official implementation host.

Suggested process:

1. Freeze core pipeline semantics.
2. Freeze lifecycle/status semantics.
3. Freeze builder contract and naming.
4. Freeze conformance expectations.
5. Encode in language-specific typings/docs/tests.
