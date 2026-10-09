# Changelog

## Unreleased

- Keep original DICOM, derived image/metadata samples, and external native tools in the ignored local developer kit; replace public test dependencies with independently generated synthetic DICOM.
- Preserve native endian, signed/unsigned pixel, multiframe, nested sequence, malformed fragment, RLE, JPEG, lossless JPEG, and genuine JPEG 2000 regression coverage. Large streaming checks now use mandatory generated inputs.
- Generate default benchmark inputs and provide an offline synthetic sample in the Kitchen Sink and a fresh-checkout ImageBridge demo.
- Add an offline synthetic corpus harness with exact output checks across all six pipeline scenarios; keep private corpus runs optional.
- Add a source publication check for accidentally tracked imaging assets.
- Fix native dump execution, promise error reporting, and argument handling; allow a local tool override or a tool installed on PATH.
- Correct signed RLE sample rendering, including stored-bit masking and 8-bit signed input.
- Honor the pipeline's codec registry when rendering RGBA assets, including isolated JPEG 2000 providers.
- Preserve source byte order while reading numeric metadata during native big-endian to little-endian transcoding; verify exact 16-bit pixel output through fragmented and streamed inputs.
- Read Part-10 transfer syntax information in the corpus harness's transcode scenario and use a valid default AE title in ImageBridge.

## 1.0.0-rc.1

First installable EASI JS release candidate under the `@xinonix/easi-js` package name.

- Native ESM public entry points for the EASI factory, DICOM models, FHIR R4 imaging models, mapping/selection extensions, codecs, and Node DIMSE transports.
- Streaming native DICOM and DICOM JSON/XML metadata parsing, selection, and writing.
- FHIR R4 ImagingStudy mapping with contained/referenced subjects, hierarchy aggregation, and validated resource serialization.
- Node DIMSE Verification/Store and Study Root FIND/GET/MOVE support within the documented operation profile.
- Node 22/24 package validation, clean installed-consumer workflows, and browser bundling/smoke checks.
- Explicit runtime-only package contents with no required npm runtime dependencies.
- EASI JS Community License with a USD 5 million consolidated revenue threshold and preserved third-party licenses/notices.

This release candidate supports installation and review. Registry candidates use the `next` distribution tag; stable promotion is a separate release step. Examples and the Kitchen Sink are maintained in the source checkout rather than shipped in the library archive. Public repository/history clearance and final commercial order terms are handled separately from distribution of this reviewed runtime package.
