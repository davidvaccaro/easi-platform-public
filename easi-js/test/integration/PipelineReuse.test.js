import EASI from '../../src/EASI.js';
import DicomSelection from '../../src/handlers/selections/DicomSelection.js';
import Tag from '../../src/dicom/Tag.js';

const path = require('path');
const fs = require('fs');

function readDicomBytes(name = '0002.DCM') {
    var brightDicomRoot = process.cwd().split('easi-js')[0];
    return fs.readFileSync(path.join(brightDicomRoot, '/data/dicoms/' + name));
}

test('Test: one built toInstances pipeline can process repeatedly without result accumulation', async () => {

    const pipeline = EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toInstances()
        .build();

    const first = await pipeline.process(readDicomBytes('0002.DCM'));
    const second = await pipeline.process(readDicomBytes('0002.DCM'));

    expect(Array.isArray(first)).toBe(false);
    expect(Array.isArray(second)).toBe(false);
    expect(first).not.toBe(second);
    expect(first.dataSet).toBeDefined();
    expect(second.dataSet).toBeDefined();

});

test('Test: one built toSelection pipeline can process repeatedly without result accumulation', async () => {

    const selection = new DicomSelection();
    selection.addTag(Tag.SOPInstanceUID);

    const pipeline = EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toSelection(selection)
        .build();

    const first = await pipeline.process(readDicomBytes('0002.DCM'));
    const second = await pipeline.process(readDicomBytes('0002.DCM'));

    expect(Array.isArray(first)).toBe(false);
    expect(Array.isArray(second)).toBe(false);
    expect(first).not.toBe(second);
    expect(first.find(Tag.SOPInstanceUID)).toBeDefined();
    expect(second.find(Tag.SOPInstanceUID)).toBeDefined();

});

