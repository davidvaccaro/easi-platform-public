import DicomConstants from '../dicomConstants.js'
import DicomReader from '../dicomReader.js';
import DicomParser from '../dicomParser.js';
import dicomInstanceStreamHandler from '../handlers/dicomInstanceStreamHandler.js';
import DicomInstance from '../dicomInstance.js';
import DicomDataSet from '../dicomDataSet.js';

const { exec } = require("child_process");
const path = require('path');
const fs = require('fs');
const { Blob } = require("buffer");

var instance = null;

beforeAll(async () => {
    
    // Establish the root path to BrightDicom
    var brightDicomRoot = process.cwd().split('bright-js')[0];

    // Determine if the dicom file is a complete path or simply a filename
    const dicomFullPath = path.join(brightDicomRoot, '/data/dicoms/0002.DCM');

    // Create the DICOM reader
    var reader = new DicomReader(new DicomParser(new dicomInstanceStreamHandler()));

    // Read and parse the DICOM file
    await reader
        .read(fs.readFileSync(dicomFullPath))
        .then(parseResult => {

            // Set the instance
            instance = parseResult;

        });

});

test("Test: Preamble Length", () => {
    expect(instance.preamble.valueLength).toBe(DicomConstants.PreambleLength);
});

test("Test: Prefix Length", () => {
    expect(instance.prefix.valueLength).toBe(DicomConstants.PrefixLength);
});

test("Test: Prefix Data", () => {
    expect((new TextDecoder()).decode(instance.prefix.access())).toBe(DicomConstants.PrefixValue);
});

test("Test: MetaSet IsComplete", () => {
    expect(instance.metaSet.isComplete).toBe(true);
});

test("Test: DataSet IsComplete", () => {
    expect(instance.dataSet.isComplete).toBe(true);
});

test("Test: SOP Instance UID", () => {
    expect(instance.sopInstanceUid).toBe('1.3.12.2.1107.5.4.3.321890.19960124.162922.29');
});

test("Test: SOP Instance UID NOT SET", () => {
    var inst = new DicomInstance();
    inst.dataSet = new DicomDataSet();
    expect(inst.sopInstanceUid).toBe('');
});

test("Test: SOP Instance UID NOT SET", () => {
    var inst = new DicomInstance();
    expect(inst.sopInstanceUid).toBe('');
});