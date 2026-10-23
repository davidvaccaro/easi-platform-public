# EASI JS 1.0.1

This independent EASI JS patch release carries the parser and native-writer hardening previously exercised by EASI View through an unpublished `1.0.1-corpus.0` package. The release is prepared from the public EASI platform source checkout, not from viewer code. The 204 runtime JavaScript files are byte-for-byte identical to that corpus package; no viewer implementation, original DICOM files, or local corpus paths are included.

The public source baseline is commit `ee5c83a` after EASI JS 1.0.0. Runtime changes are confined to `src/parsers/DicomDataParser.js` and `src/handlers/terminals/DicomDataWriterHandler.js`. The unpublished corpus archive SHA-256 is `ebdc2c0e4afa80a796d7eae6d7a3497795af5abcb4903c989942259e1cd98893`. Package version, README, changelog, and API-contract release metadata advance to 1.0.1.

## Behavior

- Undefined-length UN attributes are parsed structurally as sequences. Their item datasets use Implicit VR Little Endian while their original declared UN representation and enclosing encoding are retained. Leaving the sequence restores the enclosing syntax, including Explicit VR Big Endian.
- Native DICOM writing preserves the same scoped syntax and declared UN representation. Defined-length UN remains opaque.
- Malformed or incomplete UN scopes fail without fabricated dataset/instance completion. Skipped scopes are still validated; STOP, JUMP, FAIL, reset, and bulk-data streaming keep their established lifecycle behavior.
- Deflated Explicit VR Little Endian whole datasets remain unsupported and now fail explicitly with `NotImplemented` after File Meta Information. This release does not add decompression or label unsupported input as malformed.

## Validation

The regression inputs are generated in memory, independently of original imaging corpora. They cover every streaming split, both enclosing byte orders, nested implicit/explicit scopes, empty/defined/undefined lengths, misleading delimiter bytes in opaque values, malformed containers, status/reset behavior, native writer round trips, and deflated syntax rejection. Native DICOM cannot be wired to incompatible JSON/XML input/syntax handlers.

Before publication, run the serial full suite, source-asset audit, API-contract drift check, installed-package Node/browser checks, and executable packaged-README examples. Publication, registry installation, Git tag/release, and the dependent viewer release remain separate steps; preparation does not itself publish an artifact.

Prepared on Node.js 24.6.0 with the following successful checks:

- `npm test -- --runInBand`: 166 suites and 1,466 tests passed; 4 suites / 37 opt-in tests skipped.
- `npm run source:check`: 636 Git-listed files checked.
- `npm run docs:api-contract:check`: release metadata and contract are in sync.
- `npm run package:check -- --browser --keep-temp`: clean installed Node and actual Chrome consumers passed public imports, synthetic read/write, selection and FHIR workflows; Node-only DIMSE exports rejected browser bundling.
- `npm run docs:readme:check`: all 14 executable examples passed and all 8 packaged local links resolved.
- `npm run package:pack`: validated 214-entry archive; no DICOM file headers, original imaging assets, or developer home paths were found.

The local archive is prepared for review; these checks do not claim npm publication or a GitHub release.
