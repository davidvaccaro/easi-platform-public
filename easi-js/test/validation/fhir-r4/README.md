# FHIR R4 validation fixtures

`fhir.schema.json` is the complete, unmodified official HL7 FHIR **R4 4.0.1** JSON
schema, downloaded from <https://hl7.org/fhir/R4/fhir.schema.json> on 2026-10-09.
It uses JSON Schema draft-06 and includes 680 resource/datatype definitions.

- Size: 3,386,892 bytes.
- SHA-256: `2230406893b4cf002a4ee1e5e2bbeca22ac5d2d4931b3e9ef7b9594bbc376a01`.
- Official release downloads: <https://hl7.org/fhir/R4/downloads.html>.
- Copyright: © HL7.org 2011+; FHIR Release 4, Technical Correction #1 (v4.0.1).
- Specification license: CC0, as documented at <https://hl7.org/fhir/R4/license.html>.
  This test tooling is an EASI addition; HL7 does not endorse it. Terminologies
  referenced by the specification may have separate third-party licenses.

Run from `easi-js` after `npm ci`:

```sh
npx jest test/validation/FhirR4Schema.test.js --runInBand --coverage=false
```

The tests serialize resources produced by actual EASI pipelines from synthetic
DICOM JSON metadata, then validate their wire JSON against the official
`ImagingStudy` and `Patient` definitions with development-only Ajv. Validation is
local and reproducible: tests perform no downloads, send no resources to a
server, and use no sample patient files. `validate.js` replaces only the schema
wrapper's obsolete `id` keyword; official definitions remain unchanged.

The official JSON schema is one validation layer. It checks property names,
types, repeating arrays, nested datatypes, and many primitive lexical patterns.
It permits missing primitive fields to support FHIR primitive extensions, some
complex definitions omit `type: object`, and its `unsignedInt` definition does
not enforce integer/range bounds. It does not
resolve references or check calendar dates, represented counts, resource
identity, terminology bindings, or implementation guide profiles.

`validateEasiFhirSemantics` supplements it for EASI's bounded output: required
status/series/instance primitive values, complex object shapes, unsigned integer limits, empty-value
omission, calendar dates, contained Patient references, unique represented
UIDs, and counts at least as large as represented elements. Larger totals are
allowed by R4, particularly for study summaries. These checks require concrete
primitive values because this mapper does not emit primitive extensions.

Passing this suite establishes the tested EASI mapping contract and official
JSON schema compatibility. It is not a full HL7 FHIR validator, terminology
service, receiving-server validation, or an implementation guide conformance
claim. Normative behavior comes from:

- [ImagingStudy definitions](https://hl7.org/fhir/R4/imagingstudy-definitions.html)
- [DICOM mappings](https://hl7.org/fhir/R4/imagingstudy-mappings.html)
- [Patient definitions](https://hl7.org/fhir/R4/patient-definitions.html)
- [FHIR JSON representation](https://hl7.org/fhir/R4/json.html)
- [Primitive datatypes](https://hl7.org/fhir/R4/datatypes.html)
- [Contained references](https://hl7.org/fhir/R4/references.html)
- [Validation layers](https://hl7.org/fhir/R4/validation.html)
