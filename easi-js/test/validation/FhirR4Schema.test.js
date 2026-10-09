import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import { createFhirR4Validator } from './fhir-r4/validate.js';

const schemaPath = path.join(__dirname, 'fhir-r4', 'fhir.schema.json');
const validate = createFhirR4Validator(schemaPath);
const DCM = 'http://dicom.nema.org/resources/ontology/DCM';
const CT = '1.2.840.10008.5.1.4.1.1.2';
const MR = '1.2.840.10008.5.1.4.1.1.4';

function metadata(overrides = {}) {
    const values = {
        '0020000D': '1.2.3', '0020000E': '1.2.3.1',
        '00080016': CT, '00080018': '1.2.3.1.1', '00080060': 'CT',
        ...overrides
    };
    const result = {};
    Object.entries(values).forEach(([id, value]) => {
        if (value != null)
            result[id] = { vr: Tag.find(id).VR.ID, Value: Array.isArray(value) ? value : [value] };
    });
    return result;
}

async function mapped(records, options = {}) {
    const reader = EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().toFHIRImagingStudy(options).build();
    const bytes = new TextEncoder().encode(JSON.stringify(records));
    const stream = new ReadableStream({
        start(controller) {
            for (let offset = 0; offset < bytes.length; offset += 23)
                controller.enqueue(bytes.slice(offset, offset + 23));
            controller.close();
        }
    });
    const result = await reader.process({ source: stream });
    expect(result.count).toBe(1);
    return JSON.parse(JSON.stringify(result.first()));
}

function control() {
    return {
        resourceType: 'ImagingStudy',
        identifier: [{ system: 'urn:dicom:uid', value: 'urn:oid:1.2.3' }],
        status: 'available',
        subject: { reference: '#patient' },
        contained: [{ resourceType: 'Patient', id: 'patient' }],
        numberOfSeries: 1, numberOfInstances: 1,
        series: [{
            uid: '1.2.3.1', modality: { system: DCM, code: 'CT' }, numberOfInstances: 1,
            instance: [{ uid: '1.2.3.1.1', sopClass: { system: 'urn:ietf:rfc:3986', code: 'urn:oid:' + CT } }]
        }]
    };
}

function expectValid(resource) {
    expect(validate(resource)).toEqual({ valid: true, schemaErrors: [], semanticErrors: [] });
    for (const patient of resource.contained ?? [])
        expect(validate(patient)).toEqual({ valid: true, schemaErrors: [], semanticErrors: [] });
}

test('pins the unmodified official HL7 FHIR R4 4.0.1 schema bytes', () => {
    const bytes = fs.readFileSync(schemaPath);
    expect(bytes.length).toBe(3386892);
    expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe('2230406893b4cf002a4ee1e5e2bbeca22ac5d2d4931b3e9ef7b9594bbc376a01');
});

test('official schema and semantic checks accept a minimal valid control', () => {
    expectValid(control());
});

test('validates actual streamed mapping with demographics, dates, numbers, and Endpoints', async () => {
    const resource = await mapped(metadata({
        '00100020': 'SYNTHETIC-001', '00100021': 'SYNTHETIC ISSUER',
        '00100010': { Alphabetic: 'Synthetic^Patient^Example^Dr^Jr' },
        '00100030': '19800229', '00100040': 'F',
        '00102154': ['555-0101', '555-0102'], '00102155': 'synthetic@example.test',
        '00080020': '20240229', '00080030': '134501.1234',
        '00080021': '20240229', '00080031': '134502', '00080201': '-0500',
        '00200011': '2', '00200013': '3', '00081030': 'SYNTHETIC STUDY'
    }), {
        identifierSystems: { patient: 'https://example.test/patients' },
        endpoints: { study: ['Endpoint/study', 'Endpoint/backup'], series: 'Endpoint/series' }
    });
    expectValid(resource);
    expect(resource.started).toBe('2024-02-29T13:45:01.1234-05:00');
    expect(resource.contained[0].birthDate).toBe('1980-02-29');
    expect(resource.contained[0].identifier[0].system).toBe('https://example.test/patients');
    expect(resource.contained[0].name[0].given).toEqual(['Patient', 'Example']);
    expect(resource.contained[0].telecom).toHaveLength(3);
    expect(resource.endpoint).toHaveLength(2);
});

test('validates anonymous contained Patient and date-only output without a source timezone', async () => {
    const resource = await mapped(metadata({ '00080020': '20240229', '00080030': '134501' }));
    expectValid(resource);
    expect(resource.started).toBe('2024-02-29');
    expect(resource.contained).toEqual([{ resourceType: 'Patient', id: 'patient' }]);
    expect(resource.subject.reference).toBe('#patient');
});

test.each([
    [{ subject: 'Patient/synthetic-001' }, { reference: 'Patient/synthetic-001' }],
    [{ subject: { identifier: { system: 'https://example.test/patients', value: 'SYNTHETIC-001' }, type: 'Patient' } },
        { identifier: { system: 'https://example.test/patients', value: 'SYNTHETIC-001' }, type: 'Patient' }],
    [{ subjectMode: 'reference', referenceTemplates: { subject: 'Patient/{dicom.PatientID}' } }, { reference: 'Patient/SYNTHETIC-001' }]
])('validates configured external or logical subject %j', async (options, subject) => {
    const resource = await mapped(metadata({ '00100020': 'SYNTHETIC-001' }), options);
    expectValid(resource);
    expect(resource.subject).toEqual(subject);
    expect(resource).not.toHaveProperty('contained');
});

test('validates study-summary with reported totals and omitted series', async () => {
    const resource = await mapped(metadata({
        '0020000E': null, '00080016': null, '00080018': null, '00080060': null,
        '00080061': ['CT', 'MR'], '00201206': '4', '00201208': '228'
    }), { profile: 'study-summary' });
    expectValid(resource);
    expect(resource).not.toHaveProperty('series');
    expect(resource.numberOfSeries).toBe(4);
    expect(resource.numberOfInstances).toBe(228);
});

test('validates aggregation with multiple series and duplicate SOP records', async () => {
    const resource = await mapped([
        metadata(), metadata({ '00080018': '1.2.3.1.2' }),
        metadata({ '00080018': '1.2.3.1.2' }),
        metadata({ '0020000E': '1.2.3.2', '00080018': '1.2.3.2.1', '00080016': MR, '00080060': 'MR' })
    ]);
    expectValid(resource);
    expect(resource.numberOfSeries).toBe(2);
    expect(resource.numberOfInstances).toBe(3);
    expect(resource.series[0].instance).toHaveLength(2);
    expect(resource.modality).toEqual([{ system: DCM, code: 'CT' }, { system: DCM, code: 'MR' }]);
});

test.each([
    ['unknown study property', resource => { resource.unexpected = 'value'; }],
    ['plural instance wire property', resource => { resource.series[0].instances = resource.series[0].instance; }],
    ['CodeableConcept series modality', resource => { resource.series[0].modality = { coding: [resource.series[0].modality] }; }],
    ['instance Endpoint property', resource => { resource.series[0].instance[0].endpoint = [{ reference: 'Endpoint/instance' }]; }],
    ['scalar study identifier', resource => { resource.identifier = resource.identifier[0]; }],
    ['scalar Endpoint', resource => { resource.endpoint = { reference: 'Endpoint/study' }; }],
    ['misspelled Patient telecom', resource => { resource.contained[0].telcom = [{ system: 'phone', value: '555-0101' }]; }],
    ['scalar Patient identifier', resource => { resource.contained[0].identifier = { value: 'SYNTHETIC-001' }; }],
    ['scalar HumanName given', resource => { resource.contained[0].name = [{ given: 'Synthetic' }]; }],
    ['datetime without timezone', resource => { resource.started = '2024-02-29T13:45:01'; }],
    ['empty optional string', resource => { resource.description = ''; }],
    ['unknown status code', resource => { resource.status = 'unsupported-status'; }],
    ['unknown administrative gender', resource => { resource.contained[0].gender = 'unsupported-gender'; }]
])('official schema rejects %s', (label, mutate) => {
    const resource = control();
    mutate(resource);
    const result = validate(resource);
    expect(result.valid).toBe(false);
    expect(result.schemaErrors.length).toBeGreaterThan(0);
});

test.each([
    ['missing status', resource => { delete resource.status; }],
    ['missing series uid', resource => { delete resource.series[0].uid; }],
    ['missing instance uid', resource => { delete resource.series[0].instance[0].uid; }],
    ['empty subject', resource => { resource.subject = {}; }],
    ['empty required Coding', resource => { resource.series[0].modality = {}; }],
    ['scalar SOP class Coding', resource => { resource.series[0].instance[0].sopClass = CT; }],
    ['scalar contained Patient name', resource => { resource.contained[0].name = ['Synthetic']; }],
    ['scalar Endpoint Reference', resource => { resource.endpoint = ['Endpoint/study']; }],
    ['negative/fractional unsignedInt', resource => { resource.numberOfInstances = -1.5; }],
    ['unsignedInt overflow', resource => { resource.series[0].number = 2147483648; }],
    ['count below represented series', resource => { resource.numberOfSeries = 0; }],
    ['count below represented instances', resource => { resource.series[0].numberOfInstances = 0; }],
    ['duplicate series UID', resource => { resource.series.push(JSON.parse(JSON.stringify(resource.series[0]))); }],
    ['duplicate SOP Instance UID', resource => { resource.series[0].instance.push(JSON.parse(JSON.stringify(resource.series[0].instance[0]))); }],
    ['missing DICOM study identifier', resource => { delete resource.identifier; }],
    ['unresolved contained reference', resource => { resource.subject.reference = '#missing'; }],
    ['contained Patient missing id', resource => { delete resource.contained[0].id; }],
    ['empty repeating array', resource => { resource.endpoint = []; }],
    ['impossible calendar date', resource => { resource.contained[0].birthDate = '2023-02-29'; }]
])('semantic checks detect schema limitation: %s', (label, mutate) => {
    const resource = control();
    mutate(resource);
    const result = validate(resource);
    expect(result.schemaErrors).toEqual([]);
    expect(result.semanticErrors.length).toBeGreaterThan(0);
    expect(result.valid).toBe(false);
});

test('accepts counts larger than represented subsets as permitted by R4', () => {
    const resource = control();
    resource.numberOfSeries = 4;
    resource.numberOfInstances = 228;
    resource.series[0].numberOfInstances = 57;
    expectValid(resource);
});
