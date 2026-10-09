import EASI from '../../src/EASI.js';
import path from 'node:path';
import { createFhirR4Validator } from '../validation/fhir-r4/validate.js';

const encode = (value) => new TextEncoder().encode(value);
const CT_STORAGE = '1.2.840.10008.5.1.4.1.1.2';
const validateFhir = createFhirR4Validator(path.resolve(process.cwd(), 'test/validation/fhir-r4/fhir.schema.json'));

// Synthetic identifiers and demographics; no repository DICOM samples are used.
function metadata(study = '1.2.3', series = `${study}.1`, instance = `${series}.1`, modality = 'CT') {
    return {
        '00080016': { vr: 'UI', Value: [CT_STORAGE] },
        '00080018': { vr: 'UI', Value: [instance] },
        '00080060': { vr: 'CS', Value: [modality] },
        '00100010': { vr: 'PN', Value: [{ Alphabetic: 'Example^Jane^Marie' }] },
        '00100020': { vr: 'LO', Value: ['SYNTHETIC-1'] },
        '00100021': { vr: 'LO', Value: ['EXAMPLE-HOSPITAL'] },
        '00100030': { vr: 'DA', Value: ['19800229'] },
        '00100040': { vr: 'CS', Value: ['F'] },
        '0020000D': { vr: 'UI', Value: [study] },
        '0020000E': { vr: 'UI', Value: [series] },
        '00200011': { vr: 'IS', Value: ['1'] },
        '00200013': { vr: 'IS', Value: ['1'] }
    };
}

function pipeline(options = 'full', syntax = 'json') {
    const builder = EASI.pipelineBuilder().fromPartStream();
    const target = syntax === 'xml' ? builder.ofDicomXmlMetadata() :
        syntax === 'dicom' ? builder.ofDicomData() : builder.ofDicomMetadata();
    return target.toFHIRImagingStudy(options).build();
}

async function mapJson(value, options = 'full') {
    return pipeline(options).process({ source: encode(JSON.stringify(value)) });
}

function fragmented(bytes) {
    let offset = 0;
    return new ReadableStream({
        pull(controller) {
            if (offset === bytes.length) {
                controller.close();
                return;
            }
            controller.enqueue(bytes.subarray(offset, offset + 7));
            offset = Math.min(offset + 7, bytes.length);
        }
    });
}

test('FHIR mapping aggregates interleaved studies and deduplicates series and instances', async () => {
    const first = metadata();
    const result = await mapJson([
        first,
        metadata('1.2.4'),
        metadata('1.2.3', '1.2.3.2', '1.2.3.2.1', 'MR'),
        metadata('1.2.3', '1.2.3.1', '1.2.3.1.2'),
        first
    ]);
    expect(result.count).toBe(2);
    const studies = result.toArray().map((study) => JSON.parse(JSON.stringify(study)));
    expect(studies[0].identifier).toContainEqual({ system: 'urn:dicom:uid', value: 'urn:oid:1.2.3' });
    expect(studies[0].numberOfSeries).toBe(2);
    expect(studies[0].numberOfInstances).toBe(3);
    expect(studies[0].series.map((series) => series.instance.length)).toEqual([2, 1]);
    expect(studies[0].modality.map((coding) => coding.code).sort()).toEqual(['CT', 'MR']);
    expect(studies[0].series[0]).not.toHaveProperty('instances');
    expect(studies[1].numberOfInstances).toBe(1);
});

test('FHIR mapping connects to existing Patient and Endpoint resources through pipeline options', async () => {
    const value = metadata();
    value['00080050'] = { vr: 'SH', Value: ['ACC-EXAMPLE'] };
    value['00200010'] = { vr: 'SH', Value: ['STUDY-EXAMPLE'] };
    const result = await mapJson(value, {
        subjectMode: 'reference',
        subject: { reference: 'Patient/example', display: 'Example patient' },
        status: 'registered',
        endpoints: { study: 'Endpoint/dicomweb', series: [{ reference: 'Endpoint/dicomweb' }] },
        identifierSystems: {
            patient: 'https://example.org/patient-id',
            accession: 'https://example.org/accession',
            study: 'https://example.org/study-id'
        }
    });
    const study = JSON.parse(JSON.stringify(result.first()));
    expect(study.status).toBe('registered');
    expect(study.subject).toEqual({ reference: 'Patient/example', display: 'Example patient' });
    expect(study).not.toHaveProperty('contained');
    expect(study.endpoint).toEqual([{ reference: 'Endpoint/dicomweb' }]);
    expect(study.series[0].endpoint).toEqual([{ reference: 'Endpoint/dicomweb' }]);
    expect(study.identifier).toEqual(expect.arrayContaining([
        { system: 'urn:dicom:uid', value: 'urn:oid:1.2.3' },
        expect.objectContaining({ system: 'https://example.org/accession', value: 'ACC-EXAMPLE' }),
        expect.objectContaining({ system: 'https://example.org/study-id', value: 'STUDY-EXAMPLE' })
    ]));
});

test('FHIR mapping produces equivalent resources from fragmented JSON, XML, and native DICOM', async () => {
    const value = metadata();
    const writer = EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().toDicomData().build();
    const native = (await writer.process({ source: encode(JSON.stringify(value)) })).first();
    const attributes = Object.entries(value).map(([tag, attribute]) => {
        const content = attribute.vr === 'PN' ?
            '<PersonName number="1"><Alphabetic><FamilyName>Example</FamilyName><GivenName>Jane</GivenName><MiddleName>Marie</MiddleName></Alphabetic></PersonName>' :
            `<Value number="1">${attribute.Value[0]}</Value>`;
        return `<DicomAttribute tag="${tag}" vr="${attribute.vr}">${content}</DicomAttribute>`;
    }).join('');
    const sources = [
        ['json', encode(JSON.stringify(value))],
        ['xml', encode(`<NativeDicomModel>${attributes}</NativeDicomModel>`)],
        ['dicom', native]
    ];
    const studies = [];
    for (const [syntax, bytes] of sources) {
        const result = await pipeline('full', syntax).process({ source: fragmented(bytes) });
        studies.push(JSON.parse(JSON.stringify(result.first())));
    }
    expect(studies[1]).toEqual(studies[0]);
    expect(studies[2]).toEqual(studies[0]);
    for (const study of studies)
        expect(validateFhir(study)).toEqual({ valid: true, schemaErrors: [], semanticErrors: [] });
    expect(studies[0].subject.reference).toBe('#patient');
    expect(studies[0].contained[0]).toMatchObject({
        resourceType: 'Patient', id: 'patient', birthDate: '1980-02-29', gender: 'female',
        identifier: [expect.objectContaining({ value: 'SYNTHETIC-1' })],
        name: [expect.objectContaining({ family: 'Example', given: ['Jane', 'Marie'] })]
    });
});

test('FHIR aggregation spans fragmented multipart native DICOM instances', async () => {
    const writer = EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().toDicomData().build();
    const inputs = [metadata(), metadata('1.2.3', '1.2.3.1', '1.2.3.1.2'), metadata()];
    const chunks = [];
    for (const input of inputs) {
        chunks.push(encode('--FHIRBoundary\r\nContent-Type: application/dicom\r\n\r\n'));
        chunks.push((await writer.process({ source: encode(JSON.stringify(input)) })).first());
        chunks.push(encode('\r\n'));
    }
    chunks.push(encode('--FHIRBoundary--\r\n'));
    const bytes = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    const result = await pipeline('full', 'dicom').process({
        source: fragmented(bytes),
        sourceOptions: { contentType: 'multipart/related; type="application/dicom"; boundary=FHIRBoundary' }
    });
    expect(result.count).toBe(1);
    const study = JSON.parse(JSON.stringify(result.first()));
    expect(study).toMatchObject({ numberOfSeries: 1, numberOfInstances: 2 });
    expect(study.series[0].instance).toHaveLength(2);
    expect(validateFhir(study)).toEqual({ valid: true, schemaErrors: [], semanticErrors: [] });
});

test('FHIR aggregation stays within one pipeline process call', async () => {
    const reader = pipeline();
    const first = await reader.process({ source: encode(JSON.stringify([metadata(), metadata('1.2.4')])) });
    expect(first.count).toBe(2);
    const second = await reader.process({ source: encode(JSON.stringify(metadata('1.2.5'))) });
    expect(second.count).toBe(1);
    expect(second.first().identifier[0].value).toBe('urn:oid:1.2.5');
    expect(first.first().numberOfInstances).toBe(1);
});

test('FHIR study summaries retain declared totals without inventing series or summing repeats', async () => {
    const value = {
        '0020000D': { vr: 'UI', Value: ['1.2.3'] },
        '00080061': { vr: 'CS', Value: ['CT', 'MR'] },
        '00201206': { vr: 'IS', Value: ['4'] },
        '00201208': { vr: 'IS', Value: ['228'] }
    };
    const result = await mapJson([value, value], {
        profile: 'study-summary', subjectMode: 'reference', subject: 'Patient/example'
    });
    expect(result.count).toBe(1);
    const study = JSON.parse(JSON.stringify(result.first()));
    expect(study).toMatchObject({ numberOfSeries: 4, numberOfInstances: 228, subject: { reference: 'Patient/example' } });
    expect(study).not.toHaveProperty('series');
});

test('FHIR mapping rejects incomplete full-instance input through the public pipeline', async () => {
    const value = metadata();
    delete value['00080060'];
    await expect(mapJson(value)).rejects.toThrow(/Modality/);
});
