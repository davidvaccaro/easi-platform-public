# EASI JS version 1 release assessment

The stable release target is **`@xinonix/easi-js@1.0.0`**: a streaming DICOM library containing parsing, writing, selection, custom mapping, finite stream processing, Node.js DIMSE, and FHIR R4 ImagingStudy mapping. DIMSE and FHIR are retained following the release-scope decision; the implementation and bounded validation profiles are described below. Other language implementations and EASI Studio remain outside this release.

Assessment updated October 9, 2026. The owner has authorized the stable launch. The public source, license, README, package metadata, synthetic fixtures, and correctness work are prepared. Publication of the exact `1.0.0` archive, registry verification, and the matching GitHub release are recorded separately in the [release checklist](RELEASE_CHECKLIST.md); this preparation assessment does not claim those final steps have completed. The previously published `1.0.0-rc.1` is historical release-candidate evidence, rather than the artifact being prepared here.

## Current preparation status

- [Public-source CI](https://github.com/davidvaccaro/easi-platform-public/actions/runs/38005933452) passed the Node 22/24 core and package lanes, DIMSE sockets, and Orthanc interoperability checks before the version-only stable preparation.
- [Performance smoke](https://github.com/davidvaccaro/easi-platform-public/actions/runs/38005933275) passed the five synthetic EASI JS profiles. The [independent-toolkit comparison](https://github.com/davidvaccaro/easi-platform-public/actions/runs/38005145645) passed all 30 profile/toolkit cases on the same synthetic workload revision.
- Original imaging assets remain ignored in the local developer kit with verified backups. Published branches and the checkpoint tag in `davidvaccaro/easi-platform-public` have clean history; original development history remains in the private archive. No private companion checkout is needed for public tests.
- The npm archive includes the identical repository/package Community License, complete third-party notices, and no required npm runtime dependencies. The license is source-available, with the agreed free community and paid commercial terms.
- The original recommendation to remove additional runtime workflows onto a new `v2` branch was not adopted. Existing workflows remain in the package with bounded documentation; their presence does not promise complete DICOM, FHIR, anonymization, or lossless transcoding support.

The sections below retain the original assessment, implementation evidence, and scope recommendations as a historical record. The baseline findings are not an outstanding blocker list. Exact-commit checks and registry/archive evidence for the stable release must still be recorded after preparation.

## Original v1 scope recommendation

Original baseline: runtime snapshot `5e3c2040680a8a536f744aaf858366669a563e26` and sibling documentation snapshot `a3d0653`, assessed on October 9, 2026 before the correctness, FHIR, DIMSE, packaging, and source-publication work. Baseline IDs identify private historical evidence; the public checkpoint uses filtered history. The proposed removals below were scope recommendations, not completed branch operations or current release requirements.

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

DICOMweb was originally conditional on request-handling fixes and actual response/multipart tests. Those fixes and pipeline regressions were completed in the core correctness pass, so `fromDicomweb()` is retained alongside the HTTP reader.

The baseline transfer-syntax matrix should explicitly name what parses, what writes, what can be copied opaquely, and what decodes. A transfer-syntax constant or registry entry does not establish working codec support. Full deflated-dataset and DICOM character-set support can be deferred only if unsupported operations fail clearly or preserve raw bytes without claiming decoded text is correct.

## Original recommendations for later-release scope

This table preserves baseline concerns and line references. The retained runtime and its current support boundaries are described in the [package README](../README.md). It does not assert that these implementations were removed or that the old line numbers describe the final source.

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

- **DIMSE:** the [bounded Node.js operation matrix](DIMSE_V1.md) now includes both-direction Verification/Store and Study Root FIND/GET/MOVE SCU. The implementation validates negotiated contexts/roles/transfer syntaxes, response message IDs, PDV/command structure, complete datasets, warning/counter diagnostics, and bounded fragmentation. Empty success yields zero objects; signal/stop terminate local operations and close owned sockets. Dataset, operation, and receiver-queue byte limits bound materialization. Strict Orthanc 1.12.8 tests use synthetic objects and exact pixel-byte/counter assertions; GET/MOVE failures fail the lane. Socket and peer lanes now run on PR/push/manual/schedule. Operations still buffer complete results before parsing; Store success acknowledges memory receipt rather than durable persistence. Independent peer tests use TCP; deployment TLS remains a separate integration check.
- **FHIR:** target R4 4.0.1. The implementation pass corrects `series.instance`, Coding-valued modality/SOP class, Reference-array endpoints, contained Patient serialization, and multi-instance aggregation. Pipeline options now configure subject references, identifier namespaces, status, and Endpoints. Full/summary profiles have explicit required-input, count, and identity-conflict behavior. Synthetic resources are checked locally against the pinned official R4 JSON schema and bounded semantic assertions, including fragmented JSON/XML/native DICOM pipelines and multipart native aggregation. See the [mapping guide](./handlers/mappings/DicomToFHIRImagingStudyMapping.md) and [validation scope](../test/validation/fhir-r4/README.md). Receiving-server implementation guides and terminology checks remain application-specific integration work; this release does not claim universal FHIR conformance.

FHIR implementation validation on Node 24.6.0: `npm test -- --runInBand` passed 150 suites / 1,063 tests with 3 suites / 21 existing opt-in tests skipped. `npm run docs:api-contract:check` passed after contract/reference regeneration, and the documented mapping example produced its exact expected JSON. This pass also fixes PN representation grouping/writing and split UTF-8 strings in the JSON parser. Native mapping supports ASCII, UTF-8, and Latin-1, with explicit errors for unsupported character-set declarations. The package's supported Node/browser matrix remains a separate publication gate below.

DIMSE implementation validation on Node 24.6.0: the final `npm test -- --runInBand`, with `RUN_DIMSE_SOCKET_TESTS`, `RUN_ORTHANC_DIMSE`, and `RUN_ORTHANC_DIMSE_MOVE` enabled against a disposable native Orthanc 1.12.8 peer, passed **155 suites / 1,249 tests**. Only the opt-in benchmark was skipped (one suite/test). All eight independent-peer checks passed, including a C-FIND-to-FHIR summary checked against the official R4 schema and semantic assertions. `npm run docs:api-contract:check` passed after regenerating 192 API reference classes. Documentation examples passed JavaScript syntax checks and both repository diff checks passed. These were local results at that implementation stage; the private companion-contract checkout was subsequently removed from CI, and the independent public-source CI runs above passed.

## Historical core correctness findings and fixes

At the original assessment stage, the existing full suite passed 732 tests with 21 skipped on Node 24.6.0. Direct synthetic probes exposed the defects below. All parser/reader findings in this table were addressed by the implementation pass described immediately afterward and are covered by the current regression suite. The priority labels record their original release impact.

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

Undefined-length `UN` values fail explicitly rather than being scanned or interpreted as opaque encapsulated fragments. Nested implicit-VR parsing and raw-copy representation for that case remain unsupported; see [DICOM PS3.5 section 6.2.2](https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_6.2.2.html). This pass also preserves the existing permissive recovery for a missing item delimiter when an actual valid sequence delimiter follows; it never creates a delimiter at EOF.

Two behavior choices from the original assessment are retained and documented for v1:

- **Result collections.** Compatibility forwarding can expose a sole iterable payload through iteration, indexing, and length. Use `count`, `.first()`, and `.toArray()` as the documented product collection contract. A single Uint8Array can therefore have `count=1` while direct length/iteration describe its bytes; the README documents this explicitly.
- **Bulk data and text.** `DicomInstanceHandler` does not collect streamed bulk chunks, so PixelData can have an empty `access()` result. The README documents bounded materialization and chunk consumers. General `Attribute.value` access is not a complete character-set conversion layer; FHIR native mapping separately supports ASCII, UTF-8, and Latin-1 with explicit unsupported-declaration errors. Opaque processing can preserve raw bytes.

The original recommendation was to defer an automatic de-identification promise. Existing transformation utilities remain available, but v1 does not establish a validated anonymization profile, removal of all private attributes, or reliable burned-in text removal.

## Packaging and publication gates

1. **Package contents are restricted.** The baseline dry run selected 94,485 files (3,075,176,203 unpacked bytes), including corpus images and executables. Packaging now uses an explicit runtime/README/changelog/license allowlist. The validated pre-stable 214-file manifest excludes samples, tests, tools, coverage, binaries, and codec assets. `npm run package:check` inspects the actual archive; `npm run package:pack` records its inventory and integrity alongside the tarball. The stable archive must receive its own final validation and integrity record.
2. **Public imports are implemented.** Native ESM entries cover the root, DICOM, FHIR, mappings, selections, codecs, and Node DIMSE. The DIMSE entry is available only under Node export conditions. Clean consumers install the exact packed artifact and exercise all eight exported paths, synthetic metadata/native read/write, selection, and FHIR mapping. Browser bundling and an isolated Chrome execution pass; Node socket transports are excluded from browser imports. Internal source paths are not exported. The candidate still contains existing runtime workflows; packaging does not perform the proposed feature removals below.
3. **Supported runtime checks are implemented.** `engines` and CI target Node 22/24. The package checker runs against both declared lines, and its optional `--browser` check executes synthetic workflows in a real browser. Source-level HTTP/Web Stream and socket tests complement this artifact check. CI matrix changes still need a run on the eventual release commit. The old Node 16/18 declaration is removed.
4. **Contract checks run from a public checkout.** Core CI and source tests use a bundled snapshot of the four required Licensor-owned JSON contracts/examples. Maintainer generation refreshes the snapshot from the canonical companion when available. Explicit `EASI_CONTRACTS_ROOT` overrides remain strict; missing fixtures fail instead of using inline fallback data. The private companion checkout is no longer a CI dependency.
5. **Operative licensing and notices are included.** The package uses `SEE LICENSE IN LICENSE`, the agreed community license, `NOTICE`, and five complete upstream license texts. Commercial licensing contact is `dvaccaro@xinonix.com`. Company-owned legacy headers are addressed by the license's precedence clause; upstream licenses remain intact. Optional OpenJPEG and demo dependencies are development-only, and there are no required npm runtime dependencies. Commercial use outside community eligibility requires the appropriate written licensing agreement.
6. **Repository history is clean; stable registry publication is separate.** The owner verified the `@xinonix` scope and published `1.0.0-rc.1` under `next`; npm also assigned `latest` on that first publication. The `1.0.0` launch publishes a newly validated archive under `latest`. Original images and external binaries stay in the ignored local developer kit, and public tests generate independent synthetic inputs. The separately published public repository has audited clean branch/tag history; the original repository remains private. Current-tree removal alone would not have cleared older Git objects.

## Original documentation recommendations

These were the baseline documentation tasks. The current package README, API reference/contracts, DIMSE operation matrix, FHIR guide, licensing explanation, and synthetic validation documentation implement the release-facing guidance. Proposed feature removals and a new future-development branch were not adopted. Continue to describe the current bounded behavior rather than treating the old removal proposals as unfinished publication work.

- Rewrite the JS README around install/import and a few runnable JS examples: read an instance, select metadata, stream/copy bulk data, and write output. Remove future-language examples from the v1 quick start.
- Update `easi/easi-spec/conformance.md:32`: retain the bounded DIMSE and FHIR commitments, and defer transcoding, assets/archive, and burned-in redaction promises. Define the supported operations before calling the release conformant.
- Generate the API contract and reference from the actual v1 source set. The current generated reference lacks `DicomwebStreamReader`; whether to add it or remove it from v1 depends on the wrapper decision.
- Freeze and document result semantics, source ownership/cancellation, malformed input behavior, bulk streaming/materialization, supported VRs/transfer syntaxes/character sets, and environment boundaries.
- Remove broad claims of complete DICOM, FHIR, anonymization, or lossless transcoding support unless covered by the published matrix and corresponding validation.
- Keep mandatory DIMSE/Orthanc gates for the retained operation matrix, add FHIR R4 validation, and include the core correctness gates. Preserve tests for deferred workflows on the future-development branch.
- Add a changelog, known limitations, installation instructions, and a clear community/commercial licensing explanation. Label the chosen model source-available.

## Historical branch and removal proposal

The original proposal was to preserve the complete runtime snapshot with `git branch v2 5e3c2040680a8a536f744aaf858366669a563e26`, then work on a `release/v1` branch based on that snapshot, with a matching documentation snapshot. These commands were not applied and are not instructions for the stable launch. The original history is now retained privately, and public `main` is the clean source for the release.

Removal must follow imports, rather than deleting directories first:

- Trim the deferred factory methods/imports in `src/EASI.js`.
- Trim deferred construction paths in `src/builders/PipelineBuildSession.js:20`, and the methods in source/format/target/output stages.
- Remove deferred default codec registrations/imports from `src/environment/Configuration.js:20`. Keep transfer-syntax identifiers and opaque compressed PixelData parsing.
- Follow shared imports before deleting document and mixed-imaging helpers. `DicomEntityHandler` uses EncapsulatedDocument, and `ImagingDataUtils` is used by finite readers as well as normalization.
- Preserve deferred code and its tests on `v2`; remove the corresponding v1 tests/contracts/examples rather than skipping tests for behavior that v1 still ships.
- Regenerate the scoped contract/reference, inspect the package contents, and run the retained suite after each coherent removal.

Avoid a new package architecture or broad parser rewrite as part of this release. Fix the concrete core defects and disconnect the deferred workflows with focused changes. Merge the reviewed v1 branch to `main` when its release gates pass; preserve the future-development snapshot without rewriting existing history.

## Historical completion sequence

This was the original sequence before implementation. Parser/reader correctness, FHIR, DIMSE, packaging, synthetic tests, and public-source cleanup are now complete. The final stable steps are exact-archive validation, publication and registry verification, and the matching Git tag/release, as listed in the current release checklist.

1. Preserve the baseline (completed with `pre-v1-finalization`) and freeze the core, Node.js DIMSE, and FHIR R4 scope.
2. Fix parser truncation, encapsulated-data chunk handling, explicit-VR headers, short datasets, multipart boundaries, transport errors, and source cleanup with targeted regressions.
3. Complete and validate the retained DIMSE and FHIR features. Remove the deferred public workflows and align the scope, contract, and docs. Settle result/bulk semantics before 1.0.
4. Add package exports/allowlist, supported-runtime CI, clean-checkout contract resolution, licenses/notices, and a small installable-package quick start.
5. Pass the retained tests, package-consumer and browser checks, a small streaming performance check, and manifest/provenance review, then tag and publish the reviewed JS artifact and matching documentation under the owner's agreed license.

## Validation evidence

The source-publication cleanup on 2026-10-09 passed **167 suites / 1,467 tests** on Node **22.23.3** and **24.6.0**, with DIMSE sockets enabled and nine existing opt-in Orthanc/benchmark tests skipped. Both runs used an exported checkout containing no original corpus, local native tools, private documentation companion, or `EASI_CONTRACTS_ROOT` override. The synthetic functional harness passed 48 scenarios and eight exact pixel checks on each runtime; Kitchen Sink browser actions and packed consumer workflows passed, and the packaged README examples passed on both runtimes. Original assets remain ignored locally with verified backups. The clean source is published separately at `davidvaccaro/easi-platform-public`; original development history remains private. These source changes are unreleased on npm.

The earlier packaging pass validated the then-local `@xinonix/easi-js@1.0.0-rc.1` archive in clean installed consumers on Node **22.23.3** and **24.6.0**. On each runtime, `RUN_DIMSE_SOCKET_TESTS=true npm test -- --runInBand` passed **161 suites / 1,353 tests**, with 2 suites / 9 opt-in tests skipped (Orthanc and benchmarks). The final manifest guard added five missing-upstream-license regressions; its **26 tests** then passed on both runtimes. `npm ci` passed with the updated lockfile. `npm run package:check` passed public imports, synthetic metadata/native read/write, selection, FHIR, browser bundling, and rejection of the Node-only export in browser builds. `npm run package:check -- --browser` passed the installed consumer in isolated Chrome. The README's byte-reader/writer, selection, and FHIR examples were executed with synthetic input. API contract/reference regeneration and drift checks passed in the sibling workspace. These results preceded candidate publication and later public-source CI; they are preserved as historical evidence rather than the final stable archive check.

The previous full runtime validation was `npm test -- --runInBand`: 143 suites passed, 732 tests passed, 21 tests skipped. Node was 24.6.0. The sandbox's local mock-server restriction was resolved for that run.

After the first core correctness pass, `npm test -- --runInBand` passed **145 suites and 889 tests**, with 3 suites / 21 existing opt-in tests skipped, on Node 24.6.0. `npm run docs:api-contract:check` passed after regenerating the contract and API reference. `BENCH_ITERATIONS=1 npm run bench:streaming` passed its single-buffer and 8/64/256 KiB stream scenarios. `git diff --check` passed in the runtime and documentation repositories.

At the first correctness stage, the corpus validation test was changed to await its operations: 34 supported files passed whole-buffer and fragmented parsing with independently checked top-level attribute counts. The original `0003.DCM` and `0004.DCM` samples had odd-length JPEG fragments (36,357 and 28,249 bytes) and became explicit malformed-input rejection cases. That private-corpus test was subsequently replaced with independent synthetic coverage for publication; the original local samples remain unchanged. The earlier unawaited DUMP comparisons did not provide effective validation.

This assessment added read-only source/test/CI inspection, synthetic Node probes for parser/transport/result behavior, an isolated installed-package import probe, and an isolated contract-generator probe. Packaging was inspected using `npm pack --dry-run --json --cache ./node_modules/.cache/npm-release-audit`; it created no published package or `.tgz`, and its task cache was removed. `npm run docs:api-contract:check` passed in the existing sibling workspace. The preceding documentation review also passed `npm run validate:neutral --prefix easi-contracts` in `easi` with 11 schemas and 22 fixture checks.

This is a release-readiness assessment, not certification of every DICOM transfer syntax, third-party codec, or clinical workflow.
