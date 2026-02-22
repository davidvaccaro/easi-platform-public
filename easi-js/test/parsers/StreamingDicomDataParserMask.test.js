import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import StreamingDicomInstanceHandler from '../../src/handlers/StreamingDicomInstanceHandler.js';
import StreamingDicomDeIdentificationHandler from '../../src/handlers/StreamingDicomDeIdentificationHandler.js';
import { Status } from '../../src/parsers/Status.js';

const path = require('path');
const fs = require('fs');

function readDicomBytes(name = '0002.DCM') {

    // Establish the root path to BrightDicom.
    var brightDicomRoot = process.cwd().split('easi-js')[0];

    // Read the requested DICOM file.
    return fs.readFileSync(path.join(brightDicomRoot, '/data/dicoms/' + name));

}

async function parseInstanceWithHandler(handler, bytes) {

    const reader = EASI.newStreamingReaderBuilder()
        .fromDicomData()
        .withHandler(handler)
        .build();

    return await reader.read(bytes);

}

test('Test: StreamingDicomDeIdentificationHandler tagMask applies literal masked values', async () => {

    const handler = new StreamingDicomDeIdentificationHandler(new StreamingDicomInstanceHandler());
    handler.tagMask = new Map([
        [Tag.PatientName, '[MASKED NAME]'],
        [Tag.PatientID, '[MASKED ID]']
    ]);

    const result = await parseInstanceWithHandler(handler, readDicomBytes('0002.DCM'));

    expect(result.dataSet.find(Tag.PatientName).value).toBe('[MASKED NAME]');
    expect(result.dataSet.find(Tag.PatientID).value).toBe('[MASKED ID]');
    expect(result.dataSet.find(Tag.Modality).value).toBe('XA');

});

test('Test: StreamingDicomDeIdentificationHandler tagMask supports function resolvers', async () => {

    const handler = new StreamingDicomDeIdentificationHandler(new StreamingDicomInstanceHandler());
    handler.tagMask = new Map([
        [Tag.PatientName, (attribute) => ('MASK:' + attribute.tag.ID)]
    ]);

    const result = await parseInstanceWithHandler(handler, readDicomBytes('0002.DCM'));

    expect(result.dataSet.find(Tag.PatientName).value).toBe('MASK:00100010');

});

test('Test: StreamingDicomDeIdentificationHandler mask alias supports object keys', async () => {

    const handler = new StreamingDicomDeIdentificationHandler(new StreamingDicomInstanceHandler());
    handler.mask = {
        '(0010,0010)': '[HIDDEN]'
    };

    const result = await parseInstanceWithHandler(handler, readDicomBytes('0002.DCM'));

    expect(result.dataSet.find(Tag.PatientName).value).toBe('[HIDDEN]');

});

test('Test: Tag default de-identification mask applies DICOM action-code behavior via handler chain', async () => {

    const handler = new StreamingDicomDeIdentificationHandler(new StreamingDicomInstanceHandler());
    handler.mask = Tag.DefaultDeIdentificationMask;

    const result = await parseInstanceWithHandler(handler, readDicomBytes('0002.DCM'));

    // PatientName is action "Z" in the default profile.
    expect(result.dataSet.find(Tag.PatientName).value).toBe('');
    // PatientID is action "Z/D" and this handler resolves to a non-empty dummy.
    expect(result.dataSet.find(Tag.PatientID).value).toBe('[MASKED]');
    expect(result.dataSet.find(Tag.Modality).value).toBe('XA');

});

test('Test: StreamingReaderBuilder withMask applies de-identification handler chain', async () => {

    const bytes = readDicomBytes('0002.DCM');

    const reader = EASI.newStreamingReaderBuilder()
        .fromDicomData()
        .toInstances()
        .withMask(new Map([
            [Tag.PatientName, '[BUILDER MASK]']
        ]))
        .build();

    const result = await reader.read(bytes);

    expect(result.dataSet.find(Tag.PatientName).value).toBe('[BUILDER MASK]');

});

test('Test: Action code X removes the masked attribute from the emitted data set', async () => {

    const handler = new StreamingDicomDeIdentificationHandler(new StreamingDicomInstanceHandler());
    handler.mask = new Map([
        [Tag.PatientName, { ID: Tag.PatientName.ID, Action: 'X' }]
    ]);

    const result = await parseInstanceWithHandler(handler, readDicomBytes('0002.DCM'));

    expect(result.dataSet.find(Tag.PatientName)).toBe(undefined);

});

test('Test: Action code U replaces a UID value with a deterministic replacement UID', async () => {

    const baseline = await parseInstanceWithHandler(
        new StreamingDicomInstanceHandler(),
        readDicomBytes('0002.DCM')
    );

    const handler = new StreamingDicomDeIdentificationHandler(new StreamingDicomInstanceHandler());
    handler.mask = new Map([
        [Tag.SOPInstanceUID, { ID: Tag.SOPInstanceUID.ID, Action: 'U' }]
    ]);

    const result = await parseInstanceWithHandler(handler, readDicomBytes('0002.DCM'));

    const originalUID = baseline.dataSet.find(Tag.SOPInstanceUID).value;
    const maskedUID = result.dataSet.find(Tag.SOPInstanceUID).value;

    expect(maskedUID).not.toBe(originalUID);
    expect(maskedUID.startsWith('2.25.')).toBe(true);

});

test('Test: Action code U creates stable replacement UID across repeated reads', async () => {

    const handler = new StreamingDicomDeIdentificationHandler(new StreamingDicomInstanceHandler());
    handler.mask = new Map([
        [Tag.SOPInstanceUID, { ID: Tag.SOPInstanceUID.ID, Action: 'U' }]
    ]);

    const bytes = readDicomBytes('0002.DCM');
    const first = await parseInstanceWithHandler(handler, bytes);
    const second = await parseInstanceWithHandler(handler, bytes);

    const firstUID = first.dataSet.find(Tag.SOPInstanceUID).value;
    const secondUID = second.dataSet.find(Tag.SOPInstanceUID).value;

    expect(firstUID).toBe(secondUID);

});

test('Test: mask array input applies default [MASKED] action', async () => {

    const handler = new StreamingDicomDeIdentificationHandler(new StreamingDicomInstanceHandler());
    handler.mask = [
        Tag.PatientName,
        '(0010,0020)'
    ];

    const result = await parseInstanceWithHandler(handler, readDicomBytes('0002.DCM'));

    expect(result.dataSet.find(Tag.PatientName).value).toBe('[MASKED]');
    expect(result.dataSet.find(Tag.PatientID).value).toBe('[MASKED]');

});

test('Test: normalizeMaskActionCode handles whitespace and optional star suffix', () => {

    const handler = new StreamingDicomDeIdentificationHandler();
    expect(handler.normalizeMaskActionCode(' x / z / u * ')).toBe('X/Z/U');
    expect(handler.normalizeMaskActionCode('  z / d  ')).toBe('Z/D');

});

test('Test: setTagMask and clearTagMask operate on normalized identifiers', () => {

    const handler = new StreamingDicomDeIdentificationHandler();
    handler.mask = null;

    handler.setTagMask('(0010,0010)', 'X');
    expect(handler.mask.get('00100010').Action).toBe('X');

    handler.clearTagMask(Tag.PatientName);
    expect(handler.mask.has('00100010')).toBe(false);

});

test('Test: applyMask defers function action until attribute is complete', async () => {

    var resolverCalls = 0;
    const handler = new StreamingDicomDeIdentificationHandler();
    handler.mask = new Map([
        [Tag.PatientName, () => { resolverCalls++; return '[FUNCTION MASK]'; }]
    ]);

    var context = {};
    await handler.onStartDataSet(context);

    var attribute = {
        tag: Tag.PatientName,
        value: 'ORIGINAL',
        isComplete: false
    };

    handler.applyMask(context, attribute);
    expect(resolverCalls).toBe(0);
    expect(attribute.value).toBe('ORIGINAL');

    attribute.isComplete = true;
    handler.applyMask(context, attribute);
    expect(resolverCalls).toBe(1);
    expect(attribute.value).toBe('[FUNCTION MASK]');

});

test('Test: action code K keeps the original value', async () => {

    const handler = new StreamingDicomDeIdentificationHandler();
    handler.mask = new Map([
        [Tag.PatientName, { ID: Tag.PatientName.ID, Action: 'K' }]
    ]);

    var context = {};
    await handler.onStartDataSet(context);

    var attribute = {
        tag: Tag.PatientName,
        value: 'ORIGINAL VALUE',
        isComplete: true
    };

    handler.applyMask(context, attribute);
    expect(attribute.value).toBe('ORIGINAL VALUE');

});

test('Test: action code Z uses zero-length replacement for binary attributes', async () => {

    const binaryTag = { ID: 'DEADBEEF', VR: { ID: 'OB' } };
    const handler = new StreamingDicomDeIdentificationHandler();
    handler.mask = new Map([
        [binaryTag, { ID: binaryTag.ID, Action: 'Z' }]
    ]);

    var context = {};
    await handler.onStartDataSet(context);

    var attribute = {
        tag: binaryTag,
        value: new Uint8Array([1, 2, 3]),
        isComplete: true
    };

    handler.applyMask(context, attribute);
    expect(attribute.value).toBeInstanceOf(Uint8Array);
    expect(attribute.value.length).toBe(0);

});

test('Test: action code X causes start-sequence to be skipped', async () => {

    const sequenceTag = { ID: 'DEADBE00', VR: { ID: 'SQ' } };
    const handler = new StreamingDicomDeIdentificationHandler();
    handler.mask = new Map([
        [sequenceTag, { ID: sequenceTag.ID, Action: 'X' }]
    ]);

    var context = {};
    await handler.onStartDataSet(context);

    const status = await handler.onStartSequence(context, { tag: sequenceTag });
    expect(status).toBe(Status.SKIP);

});
