import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';

const path = require('path');
const fs = require('fs');

function readDicomBytes(name = '0002.DCM') {

    var brightDicomRoot = process.cwd().split('easi-js')[0];
    return fs.readFileSync(path.join(brightDicomRoot, '/data/dicoms/' + name));

}

function writeUint32LE(target, offset, value) {

    target[offset + 0] = (value & 0xFF);
    target[offset + 1] = ((value >> 8) & 0xFF);
    target[offset + 2] = ((value >> 16) & 0xFF);
    target[offset + 3] = ((value >> 24) & 0xFF);

}

function findFileMetaGroupLengthValueOffset(bytes) {

    // (0002,0000) UL with explicit-VR little-endian header:
    // 02 00 00 00 55 4C 04 00 [value(4)]
    for (var i = 0; i <= (bytes.length - 12); i++) {
        if (
            (bytes[i + 0] == 0x02)
            && (bytes[i + 1] == 0x00)
            && (bytes[i + 2] == 0x00)
            && (bytes[i + 3] == 0x00)
            && (bytes[i + 4] == 0x55)
            && (bytes[i + 5] == 0x4C)
            && (bytes[i + 6] == 0x04)
            && (bytes[i + 7] == 0x00)
        ) {
            return (i + 8);
        }
    }

    return -1;

}

function withCorruptedFileMetaGroupLength(bytes, malformedValue) {

    var mutated = new Uint8Array(bytes);
    var offset = findFileMetaGroupLengthValueOffset(mutated);
    if (offset < 0) {
        throw new Error('Could not locate (0002,0000) File Meta Information Group Length in test payload.');
    }

    writeUint32LE(mutated, offset, malformedValue >>> 0);
    return mutated;

}

async function parseInstance(bytes) {

    return await EASI.pipelineBuilder()
        .fromPartStream().ofDicomData()
        .toInstances()
        .build()
        .process(bytes);

}

test('Test: DicomDataParser tolerates malformed File Meta Information Group Length of zero', async () => {

    var bytes = readDicomBytes('0002.DCM');
    var baseline = await parseInstance(bytes);
    var malformed = withCorruptedFileMetaGroupLength(bytes, 0);
    var instance = await parseInstance(malformed);

    expect(instance).toBeDefined();
    expect(instance.metaSet).toBeDefined();
    expect(instance.metaSet.transferSyntaxUID.ID).toBe(baseline.metaSet.transferSyntaxUID.ID);
    expect(instance.dataSet.find(Tag.PatientName)).toBeDefined();
    expect(instance.dataSet.find(Tag.PixelData)).toBeDefined();

});

test('Test: DicomDataParser tolerates malformed File Meta Information Group Length that is too large', async () => {

    var bytes = readDicomBytes('0002.DCM');
    var baseline = await parseInstance(bytes);
    var malformed = withCorruptedFileMetaGroupLength(bytes, 0x7FFFFFFF);
    var instance = await parseInstance(malformed);

    expect(instance).toBeDefined();
    expect(instance.metaSet).toBeDefined();
    expect(instance.metaSet.transferSyntaxUID.ID).toBe(baseline.metaSet.transferSyntaxUID.ID);
    expect(instance.dataSet.find(Tag.PatientID)).toBeDefined();
    expect(instance.dataSet.find(Tag.PixelData)).toBeDefined();

});
