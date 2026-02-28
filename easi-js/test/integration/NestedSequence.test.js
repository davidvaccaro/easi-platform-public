import EASI from '../../src/EASI.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import Tag from '../../src/dicom/Tag.js';

const path = require('path');
const fs = require('fs');

test("Test: Nested sequence parsing keeps PixelData at dataset level", async () => {

    // Establish the root path to BrightDicom
    var brightDicomRoot = process.cwd().split('easi-js')[0];

    // Build the full DICOM path
    const dicomFullPath = path.join(brightDicomRoot, '/data/dicoms/NESTED_SEQUENCE.dcm');

    // Build the DICOM streaming reader
    const reader = EASI.pipelineBuilder()
        .withParser(new DicomDataParser())
        .withHandler(new DicomInstanceHandler())
        .build();

    // Parse the DICOM instance
    const instance = await reader.read(fs.readFileSync(dicomFullPath));

    // Validate that PixelData remains in the top-level dataset
    expect(instance.dataSet.has(Tag.PixelData)).toBe(true);
    expect(instance.dataSet.find(Tag.PixelData)).toBeDefined();

});
