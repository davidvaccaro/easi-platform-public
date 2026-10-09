# EASI JS version 1 release assessment

EASI JS should release as a focused streaming DICOM library containing parsing, writing, selection, custom mapping, finite stream processing, Node.js DIMSE, and FHIR R4 ImagingStudy mapping. DIMSE and FHIR are retained following the release-scope decision; both require completion and interoperability validation before publication. Other language implementations and EASI Studio remain outside this release.

Assessment date: October 9, 2026. Runtime snapshot: `5e3c2040680a8a536f744aaf858366669a563e26`. Documentation snapshot in the sibling `easi` repository: `a3d0653`. The annotated `pre-v1-finalization` tag preserves the committed baseline in all three repositories and has been pushed. Runtime removals and future-development branch changes have not been applied. Findings below describe the baseline; the core correctness pass addresses the parser and reader gates first.

## Recommended v1 scope

The release promise should be: **read, inspect, select, map, and write DICOM data through a fluent streaming pipeline in JavaScript**.

Keep:

- `EASI.pipelineBuilder()` and the reader/parser/handler extension contracts.
- Finite byte, file, Node stream, Web Stream, HTTP, and multipart ingestion. Finite folder ingestion can stay if its existing tests and packaging remain straightforward.
- DICOM Part 10 and raw dataset parsing, DICOM JSON/XML metadata, nested sequences, tags, attributes, instances, and essential DICOM model types.
- Selection and caller-defined mappings/handlers.
- Node.js DIMSE with an explicit supported-operation matrix, protocol validation, and required real-server interoperability checks for advertised operations.
- FHIR R4 4.0.1 ImagingStudy mapping, with corrected resource serialization, validated multi-instance aggregation, and referenced Patient/Endpoint resources.
- DICOM and metadata serialization and finite stream/file/byte writers.
- Explicit bulk-data policies and chunk forwarding. Parsing or copying compressed PixelData must remain possible without decoding it.
- Codec registration as an extension point. Native pixel access and mature decoders can be isolated optional utilities after their notices and real fixture coverage are verified; they should not expand the required release gate.

Keep the DICOMweb convenience reader only if its small request-handling fixes and actual response/multipart tests are completed. Otherwise defer `fromDicomweb()` and demonstrate WADO retrieval through the existing HTTP reader. This is a release convenience decision, rather than a reason to delay core HTTP support.

The baseline transfer-syntax matrix should explicitly name what parses, what writes, what can be copied opaquely, and what decodes. A transfer-syntax constant or registry entry does not establish working codec support. Full deflated-dataset and DICOM character-set support can be deferred only if unsupported operations fail clearly or preserve raw bytes without claiming decoded text is correct.

## Features to preserve for a later release

| Feature | Reason to defer | Concrete evidence |
| --- | --- | --- |
| Transcoding and advanced JPEG 2000, JPEG-LS, and HTJ2K promises | Runtime provisioning, precision, and codestream validation are not established across the advertised matrix. | `src/codecs/encoders/Jpeg2000RgbaEncoder.js:142` does not require an HT configuration method. Transcoding tests use fake OpenJPEG backends. `src/handlers/filters/DicomTranscodingFilter.js:2431` has a path that reduces 16-bit monochrome data to 8-bit RGBA. Other native-preserving paths exist; a universal lossless claim would still be incorrect. |
| Automatic de-identification | A correctness and privacy release effort is needed before promising anonymization. | `src/handlers/filters/DicomDeIdentificationFilter.js:356` includes the tag in the UID replacement seed. The same source UID produces different SOP and referenced-SOP UIDs. Default exact-tag masking does not remove arbitrary private attributes. |
| Burned-in text detection and automatic pixel redaction | Heuristic detection is not evidence that identifying text has been removed reliably. | `src/handlers/filters/ocr/OcrRegionDetector.js:24` exposes extensive detection tuning; `test/handlers/filters/ocr/OcrRegionDetector.test.js:47` uses synthetic rectangles. |
| Mixed JPEG/PNG/TIFF/DICOM normalization and image-to-DICOM creation | Expands the project into image conversion and object creation. | `src/handlers/filters/MixedImagingNormalizationFilter.js:155` requires full PixelData materialization and defaults the cap to `Number.MAX_SAFE_INTEGER`. |
| Document wrapping, extracted asset collections, and ZIP archives | Useful application workflows, but outside the smallest library release. | These have meaningful coverage; deferral is scope control, not a finding that they are broadly broken. `src/handlers/terminals/DicomAssetArchiveHandler.js:128` couples archives to FHIR mapping and frame rendering. |
| Folder watching, persistent WebSocket transport, and service orchestration | Adds long-running queue, cancellation, restart, and operational contracts. | Preserve finite stream adapters and their cleanup; move persistent source integrations and demos out of the v1 public surface. |
| Other language implementations, UI packages, and EASI Studio | Outside the user's first-release objective. | Leave them on the existing development track; do not include them in the JS release criteria. |
| Peer benchmarks, corpus orchestration, and proof-of-concept applications | Development tooling should not become a publication dependency. | Exclude `tools`, `test`, generated outputs, external binaries, and corpus assets from the npm release. Keep a small streaming performance check for the core. |

Routing/branching is already outside the main runtime. Keep it deferred. Do not build a plugin marketplace, licensing server, broader UI, or new language implementation to finish v1.

## Retained DIMSE and FHIR gates

- **DIMSE:** publish the bounded Node.js operation matrix and make its advertised operations mandatory in the interoperability lane. Socket tests are currently opt-in in `test/transports/dimse/DimseSocketTestGate.js`; CI permits C-GET/C-MOVE retrieval failures. Correct response-message matching, missing-data handling, empty-query results, and warning/counter reporting. Verify actual peer behavior and describe buffering and TLS limits explicitly.
- **FHIR:** target R4 4.0.1. Correct `series.instance`, Coding-valued modality, and Reference-array endpoints in `src/fhir/ImagingSeries.js`, and repair contained Patient identifiers/names/telecom and multi-instance modality aggregation. Validate emitted resources against the [FHIR R4 ImagingStudy](https://hl7.org/fhir/R4/imagingstudy.html) contract. Existing tests that assert the invalid plural shape must change with the implementation.

## Core correctness gates

The existing full suite passed 732 tests with 21 skipped on Node 24.6.0. Direct synthetic probes during this assessment exposed cases that the suite does not cover. A passing suite does not close the following gates.

| Priority | Finding | Required v1 outcome |
| --- | --- | --- |
| Release blocker | Truncated attributes are reported complete at EOF. `src/parsers/DicomDataParser.js:1778` auto-completes an unfinished attribute. A PatientID declaring 10 bytes with only 2 supplied returns success and complete flags; PixelData declaring 2,000,000 bytes with 2 supplied does too. | Reject truncated input by default, including unfinished items/sequences and partial headers. If a recovery mode is retained, expose incompleteness explicitly rather than reporting success. |
| Release blocker | Undefined-length PixelData changes with chunk boundaries. `src/parsers/DicomDataParser.js:2013` consumes an unmatched chunk entirely. A valid 18-byte encapsulated value becomes 26 bytes when its eight-byte delimiter is split across chunks. | Parse item/fragment structure and make output independent of chunk boundaries. Add tests across every delimiter split and delimiter-like bytes inside fragment payloads. |
| Release blocker | `OV`, `SV`, and `UV` headers are treated as short explicit-VR headers in `src/parsers/DicomDataParser.js:332`. Probes return header length 8 and value length 0 instead of 12 and 8. | Align the long/short VR classification across detection, parsing, and writing. [DICOM PS3.5 section 7.1.2](https://dicom.nema.org/medical/dicom/current/output/chtml/part05/chapter_7.html) defines the two header structures. |
| Release blocker | A valid 12-byte raw dataset rejects because prefix detection waits for 132 bytes even at EOF. `src/parsers/DicomDataParser.js:945`. | Distinguish short raw datasets from incomplete Part 10 input at EOF, and test both explicitly. |
| Release blocker | MIME boundary parameter values are lowercased. `src/readers/parts/PartContentType.js:112` turns `AbC123` into `abc123`. | Preserve parameter values that are case sensitive; test mixed-case boundaries and multipart chunk splits. |
| Release blocker | STOP does not close unread input. `src/readers/PartStreamReader.js:170` releases the lock without cancellation; `src/readers/NodeStreamAdapterReader.js:41` does not close its iterator. Probes observe zero cancellation calls and an unexecuted generator `finally`. | Define source ownership and close owned sources on STOP/error/abort. Test that normal EOF and caller-owned sources follow the documented contract. |
| Release blocker | HTTP error responses reach the parser. `src/readers/HttpStreamReader.js:48` and `src/readers/DicomwebStreamReader.js:485` do not check status; a fake 403 can produce parser success. | Surface HTTP status errors before parsing the body, preserve status context, and cover abort and missing-body handling. |
| Conditional blocker | DICOMweb mishandles array-form headers and overwrites an explicitly supplied Accept header. `src/readers/DicomwebStreamReader.js:391` and `:453`. Its two tests mock the downstream reader. | If retained, fix headers/options precedence and add metadata, multipart, failure, and cancellation integration cases. Otherwise defer the wrapper. |

The [DICOM encoding rules](https://dicom.nema.org/medical/dicom/current/output/chtml/part05/chapter_7.html) require processing undefined-length item structure rather than scanning arbitrary value bytes for a delimiter. Merely retaining delimiter overlap fixes one symptom but is not a sufficient general encapsulated-data parser.

The first core implementation pass replaces EOF auto-completion and binary marker scanning, aligns explicit-VR parsing/writing, fixes small raw datasets and fragmented container handling, and preserves handler terminal statuses. Buffer compaction now copies retained tails into fresh storage so it cannot overwrite previously parsed attributes or caller input. Reader changes enforce source ownership, HTTP failure handling, MIME boundary case, and complete multipart envelopes. Regression coverage includes exhaustive split positions, opaque delimiter bytes inside fragments, native writer round trips, cleanup failures, and actual EASI HTTP/DICOMweb pipelines.

Undefined-length `UN` values now fail explicitly rather than being scanned or interpreted as opaque encapsulated fragments. Their nested implicit-VR parsing and raw-copy representation remain a support-matrix decision before publication; see [DICOM PS3.5 section 6.2.2](https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_6.2.2.html). This pass also preserves the existing permissive recovery for a missing item delimiter when an actual valid sequence delimiter follows; it never creates a delimiter at EOF.

Before freezing 1.0, settle two existing public behavior choices:

- **Result collections.** `src/pipelines/PipelineResultCollection.js:328` forwards iteration, indexing, and length to a sole iterable payload. A single Uint8Array result has `count=1`, `length=3`, three byte iteration values, and one `toArray()` element. Prefer a consistent collection whose length and iteration count results, with `.first()` for a payload; avoid an ambiguous contract becoming permanent for compatibility.
- **Bulk data and text.** `src/handlers/terminals/DicomInstanceHandler.js:152` does not consume bulk chunks, so default streamed PixelData may have an empty `access()` result. Document how users opt into materialization or a chunk consumer. `src/dicom/Attribute.js:78` uses default UTF-8 decoding irrespective of Specific Character Set: either implement the published supported encodings or reject unsupported decoded-text access explicitly. Preserve bytes for opaque processing.

Removing automatic de-identification from v1 also removes its broken UID transformation from the v1 release promise. If tag masking is retained, fix UID reference consistency, establish private-tag policy, and describe it as a transformation tool rather than a validated anonymization profile.

## Packaging and publication gates

1. **Restrict the npm contents before publication.** The current dry run selects 94,485 files: 3,075,176,203 bytes unpacked and 543,365,137 bytes compressed. It includes 328 DICOM files, 75,531 JPEGs, and executable/DLL files. Add an explicit `files` allowlist covering the reviewed runtime, README, operative license, and required third-party notices. Then inspect the exact manifest again. A normal library release should not ship corpus assets or external tools.
2. **Make the package importable.** `package.json` has no `main`, `exports`, or root `index.js`; an isolated `import EASI from 'easi-js'` fails. Define the public entry and intended model/extension exports. Test the packed artifact installed into a clean consumer, rather than only importing repository source.
3. **Publish a current runtime contract.** The package permits only Node 16/18, and CI uses Node 18. Both lines are [end of life](https://nodejs.org/en/about/previous-releases). Target supported Node 22/24, test the declared lines, and add an actual browser smoke check for bytes/Web Streams/HTTP. Do not promise Node-only file/network capabilities in browsers.
4. **Make clean-checkout CI reproducible.** `test/contracts/ApiContractSync.test.js:12` invokes a generator that requires the sibling contracts repository. `.github/workflows/ci.yml:56` checks out only this repository. Check out a pinned compatible contracts revision or include an appropriate self-contained contract fixture. Reproduce the gate from a clean checkout.
5. **Complete licensing and provenance.** No operative LICENSE/NOTICE exists. The package license is a company name, and 193 source files contain old proprietary/lease-equipment boilerplate. Preserve Apache-2.0 and MIT upstream notices, recover the exact vendored copyright/license text, review runtime dependencies, and confirm rights in code and assets. Do not apply the new community restriction to third-party code under its original license.
6. **Review public repository history as well as the package.** An npm allowlist does not remove samples, binaries, or potentially sensitive material from Git history. Establish provenance and publishability before changing repository visibility. A clean JS-only public distribution is an option if the monorepo/history cannot be cleared promptly.

## Documentation gates

- Rewrite the JS README around install/import and a few runnable JS examples: read an instance, select metadata, stream/copy bulk data, and write output. Remove future-language examples from the v1 quick start.
- Update `easi/easi-spec/conformance.md:32`: retain the bounded DIMSE and FHIR commitments, and defer transcoding, assets/archive, and burned-in redaction promises. Define the supported operations before calling the release conformant.
- Generate the API contract and reference from the actual v1 source set. The current generated reference lacks `DicomwebStreamReader`; whether to add it or remove it from v1 depends on the wrapper decision.
- Freeze and document result semantics, source ownership/cancellation, malformed input behavior, bulk streaming/materialization, supported VRs/transfer syntaxes/character sets, and environment boundaries.
- Remove broad claims of complete DICOM, FHIR, anonymization, or lossless transcoding support unless covered by the published matrix and corresponding validation.
- Keep mandatory DIMSE/Orthanc gates for the retained operation matrix, add FHIR R4 validation, and include the core correctness gates. Preserve tests for deferred workflows on the future-development branch.
- Add a changelog, known limitations, installation instructions, and a clear community/commercial licensing explanation. Label the chosen model source-available.

## Safe branch and removal plan

Preserve the complete runtime snapshot with `git branch v2 5e3c2040680a8a536f744aaf858366669a563e26`, then work on a `release/v1` branch based on that snapshot. Preserve the corresponding `easi` specification snapshot on a matching future-development branch before editing its v1 scope. These are proposed commands, not completed branch operations.

Removal must follow imports, rather than deleting directories first:

- Trim the deferred factory methods/imports in `src/EASI.js`.
- Trim deferred construction paths in `src/builders/PipelineBuildSession.js:20`, and the methods in source/format/target/output stages.
- Remove deferred default codec registrations/imports from `src/environment/Configuration.js:20`. Keep transfer-syntax identifiers and opaque compressed PixelData parsing.
- Follow shared imports before deleting document and mixed-imaging helpers. `DicomEntityHandler` uses EncapsulatedDocument, and `ImagingDataUtils` is used by finite readers as well as normalization.
- Preserve deferred code and its tests on `v2`; remove the corresponding v1 tests/contracts/examples rather than skipping tests for behavior that v1 still ships.
- Regenerate the scoped contract/reference, inspect the package contents, and run the retained suite after each coherent removal.

Avoid a new package architecture or broad parser rewrite as part of this release. Fix the concrete core defects and disconnect the deferred workflows with focused changes. Merge the reviewed v1 branch to `main` when its release gates pass; preserve the future-development snapshot without rewriting existing history.

## Shortest completion sequence

1. Preserve the baseline (completed with `pre-v1-finalization`) and freeze the core, Node.js DIMSE, and FHIR R4 scope.
2. Fix parser truncation, encapsulated-data chunk handling, explicit-VR headers, short datasets, multipart boundaries, transport errors, and source cleanup with targeted regressions.
3. Complete and validate the retained DIMSE and FHIR features. Remove the deferred public workflows and align the scope, contract, and docs. Settle result/bulk semantics before 1.0.
4. Add package exports/allowlist, supported-runtime CI, clean-checkout contract resolution, licenses/notices, and a small installable-package quick start.
5. Pass the retained tests, package-consumer and browser checks, a small streaming performance check, and manifest/provenance review. Review custom license terms with counsel, then tag and publish the reviewed JS artifact and matching documentation.

## Validation evidence

The previous full runtime validation was `npm test -- --runInBand`: 143 suites passed, 732 tests passed, 21 tests skipped. Node was 24.6.0. The sandbox's local mock-server restriction was resolved for that run.

After the first core correctness pass, `npm test -- --runInBand` passed **145 suites and 889 tests**, with 3 suites / 21 existing opt-in tests skipped, on Node 24.6.0. `npm run docs:api-contract:check` passed after regenerating the contract and API reference. `BENCH_ITERATIONS=1 npm run bench:streaming` passed its single-buffer and 8/64/256 KiB stream scenarios. `git diff --check` passed in the runtime and documentation repositories.

The corpus validation test now awaits its operations: 34 supported files pass whole-buffer and fragmented parsing with independently checked top-level attribute counts. The original `0003.DCM` and `0004.DCM` samples have odd-length JPEG fragments (36,357 and 28,249 bytes) and are now explicit malformed-input rejection cases. The samples are unchanged. The previous unawaited DUMP comparisons did not provide effective validation.

This assessment added read-only source/test/CI inspection, synthetic Node probes for parser/transport/result behavior, an isolated installed-package import probe, and an isolated contract-generator probe. Packaging was inspected using `npm pack --dry-run --json --cache ./node_modules/.cache/npm-release-audit`; it created no published package or `.tgz`, and its task cache was removed. `npm run docs:api-contract:check` passed in the existing sibling workspace. The preceding documentation review also passed `npm run validate:neutral --prefix easi-contracts` in `easi` with 11 schemas and 22 fixture checks.

This is a release-readiness assessment, not certification of every DICOM transfer syntax, third-party codec, or clinical workflow.
