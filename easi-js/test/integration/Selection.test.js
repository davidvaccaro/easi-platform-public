import EASI from '../../src/EASI.js';
import DicomSelection from '../../src/handlers/selections/DicomSelection.js';
import Tag from '../../src/dicom/Tag.js';

const path = require('path');
const fs = require('fs');

test("Test: Selection parse returns selected attributes for single DICOM source", async () => {

    // Establish the root path to BrightDicom
    var brightDicomRoot = process.cwd().split('easi-js')[0];

    // Build the full DICOM path
    const dicomFullPath = path.join(brightDicomRoot, '/data/dicoms/0002.DCM');

    // Setup the selection for a known tag
    var selection = new DicomSelection();
    selection.addTag(Tag.SOPInstanceUID);

    // Build the DICOM selection reader
    const reader = EASI.newStreamingDicomSelectionReaderBuilder(selection).build();

    // Parse the DICOM instance
    const result = await reader.read(fs.readFileSync(dicomFullPath));

    // Validate the selected output
    expect(result).not.toBeNull();
    expect(result.has(Tag.SOPInstanceUID)).toBe(true);

});
