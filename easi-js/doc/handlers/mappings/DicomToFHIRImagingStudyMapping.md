# `DicomToFHIRImagingStudyMapping`

Maps native DICOM, DICOM JSON metadata, or Native DICOM Model XML into **FHIR R4 4.0.1 ImagingStudy** resources. It extends `DicomMapping` and runs through the normal parser/handler pipeline. Pixel data is not included in the FHIR resource.

## Map a study into an existing FHIR system

This example uses a synthetic DICOM JSON metadata record. Import paths are relative to `easi-js/doc/handlers/mappings`.

```js
import EASI from '../../../src/EASI.js';

const metadata = {
  '00080016': { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.2'] },
  '00080018': { vr: 'UI', Value: ['1.2.3.1.1'] },
  '00080050': { vr: 'SH', Value: ['ACC-EXAMPLE'] },
  '00080060': { vr: 'CS', Value: ['CT'] },
  '0020000D': { vr: 'UI', Value: ['1.2.3'] },
  '0020000E': { vr: 'UI', Value: ['1.2.3.1'] }
};

const pipeline = EASI.pipelineBuilder()
  .fromPartStream()
  .ofDicomMetadata()
  .toFHIRImagingStudy({
    subject: { reference: 'Patient/example' },
    status: 'available',
    identifierSystems: { accession: 'https://example.org/accession' },
    endpoints: { study: 'Endpoint/dicomweb', series: 'Endpoint/dicomweb' }
  })
  .build();

const result = await pipeline.process({
  source: new TextEncoder().encode(JSON.stringify(metadata))
});
const study = result.first();
const json = JSON.stringify(study);
```

`result` is a `PipelineResultCollection`. Use `result.toArray()` for multiple studies. The mapper produces resources in memory; it does not create Patient/Endpoint records or submit anything to a FHIR server. An Endpoint reference identifies an existing **FHIR Endpoint resource**, whose `address` can contain the DICOMweb URL. Do not put a WADO retrieval URL directly in `ImagingStudy.endpoint`.

The relevant output is:

```json
{
  "resourceType": "ImagingStudy",
  "identifier": [
    { "system": "urn:dicom:uid", "value": "urn:oid:1.2.3" },
    { "system": "https://example.org/accession", "value": "ACC-EXAMPLE" }
  ],
  "status": "available",
  "modality": [{ "system": "http://dicom.nema.org/resources/ontology/DCM", "code": "CT" }],
  "subject": { "reference": "Patient/example" },
  "endpoint": [{ "reference": "Endpoint/dicomweb" }],
  "numberOfSeries": 1,
  "numberOfInstances": 1,
  "series": [{
    "uid": "1.2.3.1",
    "modality": { "system": "http://dicom.nema.org/resources/ontology/DCM", "code": "CT" },
    "endpoint": [{ "reference": "Endpoint/dicomweb" }],
    "numberOfInstances": 1,
    "instance": [{
      "uid": "1.2.3.1.1",
      "sopClass": { "system": "urn:ietf:rfc:3986", "code": "urn:oid:1.2.840.10008.5.1.4.1.1.2" }
    }]
  }]
}
```

## Options and fluent configuration

`toFHIRImagingStudy()` accepts a profile name or the same options as `new DicomToFHIRImagingStudyMapping(options)`. Existing calls such as `toFHIRImagingStudy('study-summary')` continue to work. For custom computed mappings, construct the mapping and pass it to `.toMapping(mapping)`.

| Option | Default | Behavior |
| --- | --- | --- |
| `profile` | `'full'` | `'full'` lists mapped series/instances; `'study-summary'` emits study metadata without a series list. |
| `status` | `'available'` | One of `registered`, `available`, `cancelled`, `entered-in-error`, `unknown`. Set this to the state known by your source. |
| `subjectMode` | `'contained'` | Contains a Patient with `id: 'patient'` and references `#patient`; `'reference'` uses an existing subject. |
| `subject` | absent | Reference object or reference string. Providing this selects reference mode unless `subjectMode` is explicitly supplied. Logical References with `identifier.value` are also supported. |
| `identifierSystems` | absent | Absolute URI namespaces: `patient` for PatientID, `accession` for AccessionNumber, `study` for StudyID. StudyInstanceUID always uses `urn:dicom:uid`. |
| `endpoints` | absent | `study` and `series` accept a Reference, reference string, or array of these. |
| `referenceTemplates` | absent | Templates for `study`/`series` Endpoint references and `subject`. |
| `properties` | absent | Values available to templates through `{prop.name}`. |
| `endpointTemplatePolicy` | `'omit'` | Missing template tokens can omit the endpoint or throw (`'error'`); `'blank'` also undergoes Reference validation. |

Fluent setters are `setProfile`, `setStatus`, `setSubjectMode`, `setSubject`, `setIdentifierSystems`, `setEndpoints`, `setReferenceTemplate`, `setReferenceTemplates`, and the inherited `setProperties`/`addComputed` APIs.

For a source where PatientID is already a valid local FHIR Patient resource ID:

```js
const options = {
  subjectMode: 'reference',
  referenceTemplates: { subject: 'Patient/{dicom.PatientID}' },
  endpoints: { study: 'Endpoint/dicomweb' }
};
```

Templates support `{dicom.Keyword}`, `{dicom.00100020}`, and `{prop.name}` tokens. Template substitution does not perform patient matching or URL escaping. Use a resolved `subject` Reference when DICOM identifiers need an application-specific identity lookup.

## Required input and aggregation

| Profile | Required DICOM attributes |
| --- | --- |
| `full` | StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID, SOPClassUID, and one Modality. |
| `study-summary` | StudyInstanceUID. Series and instance attributes are not required. |

Both profiles require a FHIR subject. Default contained mode can emit a Patient with only its local `id` if demographics are absent. Reference mode requires a configured subject or a template that resolves. Legacy `subjectMode: 'none'` fails when producing a resource because R4 requires `ImagingStudy.subject`.

Within one `pipeline.process()` call, records are grouped **only by StudyInstanceUID**, in first-seen order. SeriesInstanceUID and SOPInstanceUID identify series and instances; duplicates enrich existing records without increasing counts. Interleaved studies remain separate. A later call starts a fresh aggregation.

Full-profile counts describe the unique instances actually mapped, which may be a subset of the PACS study. Study modalities come from represented series. Summary-profile counts use NumberOfStudyRelatedSeries and NumberOfStudyRelatedInstances when provided; repeating a summary does not add its counts again. Conflicting declared summary counts fail. Missing summary counts are omitted.

The mapper rejects conflicting nonblank Patient IDs/issuers or resolved subject references within a study, modalities within a series, SOP classes within an instance, and instances assigned to different series or studies. Optional scalar metadata keeps the first populated value; repeating identifiers, names, contacts, modalities, and endpoints are deduplicated.

## Mapped metadata

- Study: UID, StudyID, AccessionNumber, StudyDescription, StudyDate/StudyTime, modalities, and counts.
- Series: UID, SeriesNumber, Modality, SeriesDescription, SeriesDate/SeriesTime, and observed instance count.
- Instance: UID, SOPClassUID, and InstanceNumber.
- Contained Patient: PatientID, IssuerOfPatientID, PatientName, PatientSex, PatientBirthDate, PatientTelephoneNumbers, and PatientTelecomInformation.

Patient identifiers use the configured namespace; a DICOM issuer is preserved as `identifier.assigner.display`, rather than being invented into a URI. Patient names choose a populated DICOM PN representation and split its family/given/middle/prefix/suffix components. Telephone/email/URL strings become ContactPoint values. Patient demographics are omitted in external-reference mode.

DICOM dates become FHIR `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` strings. A complete date and time with seconds and TimezoneOffsetFromUTC become a FHIR dateTime, preserving fractional seconds and the supplied offset. Without sufficient time precision or an offset, only the known date is emitted; the mapper does not guess the machine's timezone. Invalid calendar dates and invalid provided numbers fail rather than producing a misleading resource.

For native DICOM text, the mapper supports the default ASCII repertoire (`ISO_IR 6`), UTF-8 (`ISO_IR 192`), and Latin-1 (`ISO_IR 100`). Unsupported declarations, ISO 2022 escape sequences, and malformed UTF-8 fail clearly. DICOM JSON/XML text is already Unicode and is not decoded using the original binary character-set declaration. This support is scoped to mapping; it does not establish a general DICOM character-set writer contract.

## R4 compatibility and validation

Wire JSON uses `series.instance`, Coding-valued series modality/SOP class, Reference-array endpoints, and Patient identifier/name/telecom arrays. JavaScript aliases `.instances`, `.telcom`, and `.addTelcom()` remain for existing callers, but those spellings are not emitted. R4 has no instance-level endpoint; configuring one fails. Null and empty optional values are omitted, while meaningful zero and false values remain.

Tests use a pinned official [R4 JSON schema](https://hl7.org/fhir/R4/fhir.schema.json) with additional semantic assertions for required primitives, counts, empty values, and contained references. See [validation provenance and limits](../../../test/validation/fhir-r4/README.md). This is a bounded ImagingStudy mapper, not a general FHIR profile or terminology validator. A receiving server's implementation guide may impose additional requirements.

The output follows the [R4 ImagingStudy definition](https://hl7.org/fhir/R4/imagingstudy.html), [DICOM mapping guidance](https://hl7.org/fhir/R4/imagingstudy-mappings.html), [Patient definition](https://hl7.org/fhir/R4/patient.html), and [FHIR JSON rules](https://hl7.org/fhir/R4/json.html).
