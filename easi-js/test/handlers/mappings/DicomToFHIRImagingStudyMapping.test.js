import EASI from '../../../src/EASI.js';
import DicomToFHIRImagingStudyMapping from '../../../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js';
import ImagingStudy from '../../../src/fhir/ImagingStudy.js';
import Tag from '../../../src/dicom/Tag.js';
import Attribute from '../../../src/dicom/Attribute.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';

const DCM = 'http://dicom.nema.org/resources/ontology/DCM';
const CT = '1.2.840.10008.5.1.4.1.1.2';

function record(values = {}) {
  return {
    '0020000D': '1.2.3', '0020000E': '1.2.3.1',
    '00080016': CT, '00080018': '1.2.3.1.1', '00080060': 'CT',
    ...values
  };
}

function mapRecord(mapping, values, context = {}) {
  mapping.start(context);
  for (const [id, value] of Object.entries(values)) {
    const attribute = new Attribute(Tag.find(id), 0, null, TransferSyntax.NONE);
    attribute.value = value;
    mapping.mapAttribute(context, attribute);
  }
  return { result: mapping.end(context), context };
}

async function mapJson(values, options = {}) {
  const metadata = {};
  for (const [id, value] of Object.entries(values)) {
    metadata[id] = { vr: Tag.find(id).VR.ID, Value: Array.isArray(value) ? value : [value] };
  }
  const result = await EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().
    toMapping(new DicomToFHIRImagingStudyMapping(options)).build().
    process({ source: new TextEncoder().encode(JSON.stringify(metadata)) });
  return result.first();
}

function json(value) {
  return JSON.parse(JSON.stringify(value));
}

test('maps complete JSON metadata to the R4 hierarchy and a resolvable contained Patient', async () => {
  const result = await mapJson(record({ '00100020': 'P-1234' }));
  expect(result).toBeInstanceOf(ImagingStudy);
  const resource = json(result);
  expect(resource.identifier).toEqual([{ system: 'urn:dicom:uid', value: 'urn:oid:1.2.3' }]);
  expect(resource.status).toBe('available');
  expect(resource.subject).toEqual({ reference: '#patient' });
  expect(resource.contained[0].id).toBe('patient');
  expect(resource.contained[0].identifier).toEqual([{ value: 'P-1234' }]);
  expect(resource.modality).toEqual([{ system: DCM, code: 'CT' }]);
  expect(resource.series[0].modality).toEqual({ system: DCM, code: 'CT' });
  expect(resource.series[0].instance[0].sopClass).toEqual({ system: 'urn:ietf:rfc:3986', code: 'urn:oid:' + CT });
  expect(resource.series[0]).not.toHaveProperty('instances');
  expect(resource.series[0].instance[0]).not.toHaveProperty('endpoint');
});

test('expands configured Endpoint and subject references from property and DICOM tokens', async () => {
  const mapping = new DicomToFHIRImagingStudyMapping().setProperties({ fhirBase: 'https://example.test/fhir' }).
    setSubjectMode('reference').setReferenceTemplates({
      study: '{prop.fhirBase}/Endpoint/study-{dicom.StudyInstanceUID}',
      series: '{prop.fhirBase}/Endpoint/series-{dicom.SeriesInstanceUID}',
      subject: '{prop.fhirBase}/Patient/{dicom.PatientID}'
    });
  const { result } = mapRecord(mapping, record({ '00100020': 'P-1234' }));
  expect(json(result).endpoint).toEqual([{ reference: 'https://example.test/fhir/Endpoint/study-1.2.3' }]);
  expect(json(result).series[0].endpoint).toEqual([{ reference: 'https://example.test/fhir/Endpoint/series-1.2.3.1' }]);
  expect(result.subject.reference).toBe('https://example.test/fhir/Patient/P-1234');
  expect(result.contained).toEqual([]);
  expect(() => mapping.setReferenceTemplate('instance', 'Endpoint/instance')).toThrow('no instance endpoint');
});

test('static subject/endpoints support Reference objects and preserve repeating R4 arrays', () => {
  const mapping = new DicomToFHIRImagingStudyMapping({
    subject: { reference: 'Patient/patient-123', type: 'Patient' }, status: 'registered',
    endpoints: { study: ['Endpoint/main', { reference: 'Endpoint/backup' }], series: 'Endpoint/series' }
  });
  const { result } = mapRecord(mapping, record());
  expect(json(result).subject).toEqual({ reference: 'Patient/patient-123', type: 'Patient' });
  expect(json(result).status).toBe('registered');
  expect(json(result).endpoint).toEqual([{ reference: 'Endpoint/main' }, { reference: 'Endpoint/backup' }]);
  expect(json(result).series[0].endpoint).toEqual([{ reference: 'Endpoint/series' }]);
  expect(json(result)).not.toHaveProperty('contained');
});

test('study-summary preserves reported totals and omits absent series without inventing full instances', async () => {
  const result = await mapJson({
    '0020000D': '1.2.3', '00081030': 'CT CHEST', '00080061': ['CT', 'MR'],
    '00201206': '4', '00201208': '228'
  }, { profile: 'study-summary' });
  expect(result.series).toEqual([]);
  expect(json(result)).not.toHaveProperty('series');
  expect(json(result).numberOfSeries).toBe(4);
  expect(json(result).numberOfInstances).toBe(228);
  expect(json(result).modality).toEqual([{ system: DCM, code: 'CT' }, { system: DCM, code: 'MR' }]);
  expect(json(result).subject.reference).toBe('#patient');
});

test.each(['full', 'study-summary'])('subjectMode none is explicitly rejected in %s', profile => {
  const mapping = new DicomToFHIRImagingStudyMapping({ profile, subjectMode: 'none' });
  expect(() => mapRecord(mapping, record())).toThrow('ImagingStudy.subject is required');
});

test('required fields are rejected before constructing an incomplete full record', () => {
  for (const [id, label] of [
    ['0020000D', 'StudyInstanceUID'], ['0020000E', 'SeriesInstanceUID'],
    ['00080018', 'SOPInstanceUID'], ['00080016', 'SOPClassUID'], ['00080060', 'Modality']
  ]) {
    const values = record();
    delete values[id];
    const mapping = new DicomToFHIRImagingStudyMapping();
    const context = {};
    expect(() => mapRecord(mapping, values, context)).toThrow(label);
    expect(context.studiesByUID.size).toBe(0);
  }
});

test.each(['not-a-uid', '1.02.3', '1.2.', '9.2.3', '12.3.4', '1'.repeat(65)])('invalid UID %s fails explicitly', uid => {
  expect(() => mapRecord(new DicomToFHIRImagingStudyMapping(), record({ '0020000D': uid }))).toThrow('StudyInstanceUID');
});

test('unresolved reference subjects fail instead of disappearing from output', () => {
  const mapping = new DicomToFHIRImagingStudyMapping({ subjectMode: 'reference', referenceTemplates: { subject: 'Patient/{dicom.PatientID}' } });
  expect(() => mapRecord(mapping, record())).toThrow('resolvable subject template');
});

test('aggregates by Study UID, deduplicates series/SOPs, and normalizes Coding modalities repeatedly', () => {
  const mapping = new DicomToFHIRImagingStudyMapping();
  const context = {};
  mapRecord(mapping, record({ '00201206': '999', '00201208': '999', '00080061': ['CT', 'MR', 'XA'] }), context);
  mapRecord(mapping, record({ '00080018': '1.2.3.1.2' }), context);
  mapRecord(mapping, record({ '00080018': '1.2.3.1.2' }), context);
  const { result } = mapRecord(mapping, record({ '0020000E': '1.2.3.2', '00080018': '1.2.3.2.1', '00080060': 'MR' }), context);
  expect(result.series.length).toBe(2);
  expect(result.series[0].instances.length).toBe(2);
  expect(result.series[1].instances.length).toBe(1);
  expect(json(result).numberOfSeries).toBe(2);
  expect(json(result).numberOfInstances).toBe(3);
  expect(json(result).series[0].numberOfInstances).toBe(2);
  expect(json(result).modality).toEqual([{ system: DCM, code: 'CT' }, { system: DCM, code: 'MR' }]);
});

test('different Study UIDs never merge because an accession number intersects', () => {
  const mapping = new DicomToFHIRImagingStudyMapping({ identifierSystems: { accession: 'https://example.test/accessions' } });
  const context = {};
  mapRecord(mapping, record({ '00080050': 'ACC-1' }), context);
  const { result } = mapRecord(mapping, record({ '0020000D': '1.2.4', '0020000E': '1.2.4.1', '00080018': '1.2.4.1.1', '00080050': 'ACC-1' }), context);
  expect(result.length).toBe(2);
  expect(result.map(study => study.identifier[0].value)).toEqual(['urn:oid:1.2.3', 'urn:oid:1.2.4']);
});

test('identifiers preserve configured namespaces and DICOM issuer without inventing URI authority', () => {
  const { result } = mapRecord(new DicomToFHIRImagingStudyMapping({
    identifierSystems: { patient: 'https://example.test/patients', accession: 'https://example.test/accessions', study: 'https://example.test/study-ids' }
  }), record({ '00100020': 'P-1', '00100021': 'LOCAL ISSUER', '00080050': 'ACC-2', '00200010': 'STUDY-3' }));
  const resource = json(result);
  expect(resource.identifier).toEqual([
    { system: 'urn:dicom:uid', value: 'urn:oid:1.2.3' },
    { system: 'https://example.test/study-ids', value: 'STUDY-3' },
    { system: 'https://example.test/accessions', value: 'ACC-2' }
  ]);
  expect(resource.contained[0].identifier).toEqual([{ system: 'https://example.test/patients', value: 'P-1', assigner: { display: 'LOCAL ISSUER' } }]);
});

test('Patient PN representations, birth date, sex, and multiple telecom values map usefully', async () => {
  const result = await mapJson(record({
    '00100020': 'P-1', '00100010': { Alphabetic: 'Smith^Jane^Anne^Dr^Jr', Ideographic: 'OTHER' },
    '00100030': '19800229', '00100040': 'F', '00102154': ['555-0101', '555-0102'], '00102155': 'jane@example.test'
  }));
  const patient = json(result).contained[0];
  expect(patient.name[0]).toMatchObject({ family: 'Smith', given: ['Jane', 'Anne'], prefix: ['Dr'], suffix: ['Jr'] });
  expect(patient.gender).toBe('female');
  expect(patient.birthDate).toBe('1980-02-29');
  expect(patient.telecom).toEqual([{ system: 'phone', value: '555-0101' }, { system: 'phone', value: '555-0102' }, { system: 'email', value: 'jane@example.test' }]);
  expect(patient).not.toHaveProperty('telcom');
});

test.each([
  ['20240229', '134501.1234', '-0500', '2024-02-29T13:45:01.1234-05:00'],
  ['20240229', '134501', '+1400', '2024-02-29T13:45:01+14:00'],
  ['20240229', '134501', null, '2024-02-29'],
  ['20240229', '13', '-0500', '2024-02-29'],
  ['202402', null, null, '2024-02'],
  ['2024', null, null, '2024']
])('DICOM started date/time %s %s %s preserves known precision', (date, time, offset, expected) => {
  const { result } = mapRecord(new DicomToFHIRImagingStudyMapping(), record({
    '00080020': date, '00080030': time, '00080021': date, '00080031': time, '00080201': offset
  }));
  expect(json(result).started).toBe(expected);
  expect(json(result).series[0].started).toBe(expected);
});

test.each(['20230229', '20241301', '00000101'])('invalid DICOM date %s is rejected', birth => {
  expect(() => mapRecord(new DicomToFHIRImagingStudyMapping(), record({ '00100030': birth }))).toThrow('invalid DICOM date');
});

test.each(['-1', '1.5', '2147483648'])('non-R4 unsigned instance number %s is rejected', value => {
  expect(() => mapRecord(new DicomToFHIRImagingStudyMapping(), record({ '00200013': value }))).toThrow('unsigned InstanceNumber');
});

test.each([
  [{ '00100020': 'P-2' }, 'Patient identity'],
  [{ '00100021': 'ISSUER-2' }, 'Patient identity'],
  [{ '00080060': 'MR' }, 'Modality'],
  [{ '00080016': '1.2.840.10008.5.1.4.1.1.4' }, 'SOPClassUID'],
  [{ '0020000E': '1.2.3.2' }, 'different series']
])('conflicting record %j fails before modifying the aggregate', (changes, message) => {
  const mapping = new DicomToFHIRImagingStudyMapping();
  const context = {};
  const first = record({ '00100020': 'P-1', '00100021': 'ISSUER-1' });
  const { result } = mapRecord(mapping, first, context);
  const baseline = json(result);
  expect(() => mapRecord(mapping, { ...first, ...changes }, context)).toThrow(message);
  expect(json(result)).toEqual(baseline);
});

test('repeated study summaries enrich unknown counts and reject contradictory totals', () => {
  const mapping = new DicomToFHIRImagingStudyMapping({ profile: 'study-summary' });
  const context = {};
  mapRecord(mapping, { '0020000D': '1.2.3', '00080061': 'CT' }, context);
  const { result } = mapRecord(mapping, { '0020000D': '1.2.3', '00080061': ['CT', 'MR'], '00201206': '3', '00201208': '12' }, context);
  expect(json(result).modality).toEqual([{ system: DCM, code: 'CT' }, { system: DCM, code: 'MR' }]);
  expect(json(result).numberOfSeries).toBe(3);
  expect(json(result).numberOfInstances).toBe(12);
  expect(() => mapRecord(mapping, { '0020000D': '1.2.3', '00201206': '4' }, context)).toThrow('Conflicting study-summary');
});

test('mapping reuse with fresh session contexts does not retain previous studies', () => {
  const mapping = new DicomToFHIRImagingStudyMapping();
  const first = mapRecord(mapping, record()).result;
  const next = mapRecord(mapping, record({ '0020000D': '1.2.4' })).result;
  expect(next).toBeInstanceOf(ImagingStudy);
  expect(next.identifier[0].value).toBe('urn:oid:1.2.4');
  expect(first.identifier[0].value).toBe('urn:oid:1.2.3');
});

test('omits blank optional fields without emitting empty arrays or objects', () => {
  const { result } = mapRecord(new DicomToFHIRImagingStudyMapping(), record({ '00081030': '', '00200013': null }));
  const resource = json(result);
  expect(resource).not.toHaveProperty('description');
  expect(resource).not.toHaveProperty('endpoint');
  expect(resource.series[0].instance[0]).not.toHaveProperty('number');
  expect(resource.contained[0]).not.toHaveProperty('identifier');
  expect(resource.contained[0]).not.toHaveProperty('name');
});


test.each([
  { Alphabetic: '', Ideographic: '山田^太郎' },
  { Alphabetic: ' ', Phonetic: 'Yamada^Taro' },
  { value: 'Yamada^Taro' }
])('DICOM PN object %j uses the first nonblank available representation', name => {
  const { result } = mapRecord(new DicomToFHIRImagingStudyMapping(), record({ '00100010': name }));
  expect(json(result).contained[0].name.length).toBe(1);
  expect(json(result).contained[0].name[0].family).toBeDefined();
});

test.each([
  '#patient', '#missing', 'Endpoint/wrong',
  { identifier: { value: 123 } },
  { identifier: { value: 'P-1', system: 123 } },
  { reference: 'Patient/example', type: 123 }
])('invalid subject Reference %j cannot create a dangling or ill-typed resource', subject => {
  expect(() => new DicomToFHIRImagingStudyMapping({ subject })).toThrow('Reference');
});

test('known wrong endpoint target types are rejected', () => {
  expect(() => new DicomToFHIRImagingStudyMapping({ endpoints: { study: 'Patient/wrong' } })).toThrow('Reference target');
  expect(() => new DicomToFHIRImagingStudyMapping({ endpoints: { study: { identifier: { value: 123 } } } })).toThrow('Reference identifier');
});


test.each([
  [{ '0020000D': '1.2.4', '00080018': '1.2.4.1.1' }, 'SeriesInstanceUID'],
  [{ '0020000D': '1.2.4', '0020000E': '1.2.4.1' }, 'SOPInstanceUID']
])('globally unique DICOM child identity reuse %j fails without creating another study', (changes, message) => {
  const mapping = new DicomToFHIRImagingStudyMapping();
  const context = {};
  const { result } = mapRecord(mapping, record(), context);
  const baseline = json(result);
  expect(() => mapRecord(mapping, record(changes), context)).toThrow(message);
  expect(context.studiesByUID.size).toBe(1);
  expect(json(result)).toEqual(baseline);
});


function nativeAttributes(values) {
  return Object.entries(values).map(([id, value]) => {
    const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
    return new Attribute(Tag.find(id), bytes.length, bytes, TransferSyntax.ExplicitVRLittleEndian);
  });
}

function mapNativeRecord(mapping, values) {
  const context = {};
  mapping.start(context);
  nativeAttributes(values).forEach(attribute => mapping.mapAttribute(context, attribute));
  return mapping.end(context);
}

function nativeBytes(values) {
  const parts = nativeAttributes(values).sort((left, right) => left.tag.ID.localeCompare(right.tag.ID)).map(attribute => {
    const raw = attribute.access();
    const bytes = new Uint8Array(8 + raw.length + (raw.length % 2));
    const view = new DataView(bytes.buffer);
    view.setUint16(0, parseInt(attribute.tag.ID.substring(0, 4), 16), true);
    view.setUint16(2, parseInt(attribute.tag.ID.substring(4), 16), true);
    bytes.set(new TextEncoder().encode(attribute.tag.VR.ID), 4);
    view.setUint16(6, bytes.length - 8, true);
    bytes.set(raw, 8);
    if (raw.length % 2) bytes[bytes.length - 1] = attribute.tag.VR.ID === 'UI' ? 0 : 32;
    return bytes;
  });
  const bytes = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  parts.forEach(part => { bytes.set(part, offset); offset += part.length; });
  return bytes;
}

test('fluent subject configuration selects external Reference output', () => {
  const mapping = new DicomToFHIRImagingStudyMapping().setSubject('Patient/example');
  const resource = json(mapRecord(mapping, record()).result);
  expect(resource.subject).toEqual({ reference: 'Patient/example' });
  expect(resource).not.toHaveProperty('contained');
});

test('PN whitespace representation falls back to a nonblank script group', () => {
  const resource = json(mapRecord(new DicomToFHIRImagingStudyMapping(), record({ '00100010': '   =Yamada^Taro' })).result);
  expect(resource.contained[0].name[0]).toMatchObject({ family: 'Yamada', given: ['Taro'] });
});

test.each([null, 'https://example.test/patient-ids'])('Patient identifier issuer enrichment survives dedup with namespace %s', system => {
  const mapping = new DicomToFHIRImagingStudyMapping({ identifierSystems: { patient: system } });
  const context = {};
  mapRecord(mapping, record({ '00100020': 'P-1' }), context);
  const { result } = mapRecord(mapping, record({ '00100020': 'P-1', '00100021': 'HOSPITAL-A' }), context);
  expect(json(result).contained[0].identifier).toEqual([
    { ...(system == null ? {} : { system }), value: 'P-1', assigner: { display: 'HOSPITAL-A' } }
  ]);
});

test('invalid late Endpoint template fails before aggregate contents or counts change', () => {
  const mapping = new DicomToFHIRImagingStudyMapping({ referenceTemplates: { study: 'Endpoint/{dicom.StudyDescription}' } });
  const context = {};
  const { result } = mapRecord(mapping, record({ '00081030': 'first' }), context);
  const baseline = json(result);
  expect(() => mapRecord(mapping, record({ '00080018': '1.2.3.1.2', '00081030': 'invalid space' }), context)).toThrow('Reference string');
  expect(json(result)).toEqual(baseline);
  expect(context.instanceSeriesUIDs.has('1.2.3.1.2')).toBe(false);
});

test.each(['garbage', '250000', '126000'])('invalid native DICOM time %s is rejected even without timezone', time => {
  expect(() => mapRecord(new DicomToFHIRImagingStudyMapping(), record({ '00080020': '20240101', '00080030': time }))).toThrow('invalid DICOM time');
});

test.each([
  ['ISO_IR 192', new TextEncoder().encode('Müller^Jörg'), 'Müller', 'Jörg'],
  ['ISO_IR 100', Uint8Array.from([77, 252, 108, 108, 101, 114, 94, 74, 246, 114, 103]), 'Müller', 'Jörg'],
  ['ISO_IR 6', new TextEncoder().encode('Example^Jane'), 'Example', 'Jane']
])('native %s text maps names, identifiers, descriptions and template values correctly independent of declaration order', (charset, name, family, given) => {
  const mapping = new DicomToFHIRImagingStudyMapping({ referenceTemplates: { study: 'Endpoint/{dicom.PatientID}' } });
  const result = mapNativeRecord(mapping, record({
    '00100010': name, '00100020': name, '00100021': name, '00081030': name, '0008103E': name,
    // Place the declaration last to exercise the mapper's deferred decoding.
    '00080005': charset
  }));
  const resource = json(result);
  expect(resource.contained[0].name[0]).toMatchObject({ family, given: [given] });
  expect(resource.contained[0].identifier[0]).toEqual({ value: family + '^' + given, assigner: { display: family + '^' + given } });
  expect(resource.description).toBe(family + '^' + given);
  expect(resource.series[0].description).toBe(family + '^' + given);
  expect(resource.endpoint[0].reference).toBe('Endpoint/' + family + '^' + given);
});

test.each([1, 7, 1024])('fragmented native UTF-8 FHIR mapping preserves names at chunk size %s', async chunkSize => {
  const bytes = nativeBytes(record({ '00080005': 'ISO_IR 192', '00100010': 'Müller^Jörg', '00100020': 'PATIENT-Ä' }));
  const stream = new ReadableStream({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += chunkSize) controller.enqueue(bytes.subarray(offset, offset + chunkSize));
      controller.close();
    }
  });
  const result = await EASI.pipelineBuilder().fromPartStream().ofDicomData().
    toMapping(new DicomToFHIRImagingStudyMapping()).build().process({ source: stream });
  expect(json(result.first()).contained[0].name[0]).toMatchObject({ family: 'Müller', given: ['Jörg'] });
  expect(json(result.first()).contained[0].identifier[0].value).toBe('PATIENT-Ä');
});

test.each(['ISO 2022 IR 100', 'ISO_IR 100\\ISO_IR 144', 'GB18030'])('unsupported native charset %s fails even without PatientName', charset => {
  expect(() => mapNativeRecord(new DicomToFHIRImagingStudyMapping(), record({ '00080005': charset }))).toThrow('unsupported native DICOM SpecificCharacterSet');
});

test.each([
  [undefined, Uint8Array.from([65, 255]), 'ISO_IR 6'],
  ['ISO_IR 192', Uint8Array.from([65, 195, 40]), 'ISO_IR 192'],
  [undefined, Uint8Array.from([65, 27, 66]), 'ISO 2022 escape']
])('malformed native text rejects declared charset %s without replacement characters', (charset, name, expected) => {
  const values = record({ '00100010': name });
  if (charset != null) values['00080005'] = charset;
  expect(() => mapNativeRecord(new DicomToFHIRImagingStudyMapping(), values)).toThrow(expected);
});

test('Latin-1 native decoder preserves ISO-8859-1 codepoints instead of Windows-1252 aliases', () => {
  const mapping = new DicomToFHIRImagingStudyMapping();
  expect(mapping.decodeNativeText(Uint8Array.from([128]), 'ISO_IR 100', Tag.PatientID)).toBe('\u0080');
});

test('decoded metadata remains Unicode regardless of its original unsupported charset declaration', async () => {
  const result = await mapJson(record({ '00080005': 'ISO 2022 IR 87', '00100010': { Alphabetic: '山田^太郎' } }));
  expect(json(result).contained[0].name[0]).toMatchObject({ family: '山田', given: ['太郎'] });
});


test.each(['-1300', '-1201', '+1401', '-0000'])('invalid DICOM timezone offset %s is rejected', offset => {
  expect(() => mapRecord(new DicomToFHIRImagingStudyMapping(), record({ '00080020': '20240101', '00080030': '130000', '00080201': offset }))).toThrow('invalid DICOM time or timezone offset');
});

test('DICOM minimum timezone offset -1200 remains valid', () => {
  const { result } = mapRecord(new DicomToFHIRImagingStudyMapping(), record({ '00080020': '20240101', '00080030': '130000', '00080201': '-1200' }));
  expect(json(result).started).toBe('2024-01-01T13:00:00-12:00');
});


test.each(['full', 'study-summary'])('changing a subject template in %s fails before overwriting the aggregate even without PatientID', profile => {
  const mapping = new DicomToFHIRImagingStudyMapping({ profile, subjectMode: 'reference',
    referenceTemplates: { subject: 'Patient/{dicom.StudyDescription}' } });
  const context = {};
  const { result } = mapRecord(mapping, record({ '00081030': 'first' }), context);
  const baseline = json(result);
  expect(() => mapRecord(mapping, record({ '00081030': 'second', '00080018': '1.2.3.1.2' }), context)).toThrow('Conflicting subject Reference');
  expect(json(result)).toEqual(baseline);
  expect(result.subject.reference).toBe('Patient/first');
  expect(context.instanceSeriesUIDs.has('1.2.3.1.2')).toBe(false);
});

test.each([
  { identifier: { system: 'https://example.test/patients', value: 'P-2' } },
  { identifier: { system: 'https://other.test/patients', value: 'P-1' } },
  { reference: 'Patient/example' }
])('changing logical subject identity to %j fails before modifying the aggregate', subject => {
  const mapping = new DicomToFHIRImagingStudyMapping({ subject: {
    identifier: { system: 'https://example.test/patients', value: 'P-1' } } });
  const context = {};
  const { result } = mapRecord(mapping, record(), context);
  const baseline = json(result);
  mapping.setSubject(subject);
  expect(() => mapRecord(mapping, record({ '00080018': '1.2.3.1.2' }), context)).toThrow('Conflicting subject Reference');
  expect(json(result)).toEqual(baseline);
});

test('the same subject identity can enrich display text while preserving valid aggregation', () => {
  const mapping = new DicomToFHIRImagingStudyMapping({ subject: { reference: 'Patient/example',
    identifier: { system: 'https://example.test/patients', value: 'P-1' } } });
  const context = {};
  mapRecord(mapping, record(), context);
  mapping.setSubject({ reference: 'Patient/example', identifier: {
    system: 'https://example.test/patients', value: 'P-1' }, display: 'Example patient' });
  const { result } = mapRecord(mapping, record({ '00080018': '1.2.3.1.2' }), context);
  expect(result.subject.display).toBe('Example patient');
  expect(json(result).numberOfInstances).toBe(2);
});
