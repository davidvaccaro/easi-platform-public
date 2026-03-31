import EASI from '../../src/EASI.js';
import Constants from '../../src/dicom/Constants.js'
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';

const { exec } = require("child_process");
const path = require('path');
const fs = require('fs');
const { Blob } = require("buffer");

var instance = null;

beforeAll(async () => {
    
    // Establish the root path to BrightDicom
    var brightDicomRoot = process.cwd().split('easi-js')[0];

    // Determine if the dicom file is a complete path or simply a filename
    const dicomFullPath = path.join(brightDicomRoot, '/data/dicoms/0002.DCM');

    // Build the DICOM streaming reader
    const pipeline = EASI.pipelineBuilder()
        .fromPartStream()
        .withParser(new DicomDataParser({ includePart10Header: true }))
        .withHandler(new DicomInstanceHandler())
        .build();

    // Read and parse the DICOM file
    await pipeline
        .process(fs.readFileSync(dicomFullPath))
        .then(parseResult => {

            // Set the instance
            instance = parseResult;

        });

});

test("Test: Preamble Length", () => {
    expect(instance.preamble.valueLength).toBe(Constants.PreambleLength);
});

test("Test: Prefix Length", () => {
    expect(instance.prefix.valueLength).toBe(Constants.PrefixLength);
});

test("Test: Prefix Data", () => {
    expect((new TextDecoder()).decode(instance.prefix.access())).toBe(Constants.PrefixValue);
});

test("Test: MetaSet IsComplete", () => {
    expect(instance.metaSet.isComplete).toBe(true);
});

test("Test: DataSet IsComplete", () => {
    expect(instance.dataSet.isComplete).toBe(true);
});
