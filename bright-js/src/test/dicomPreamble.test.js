import DicomPreamble from '../dicomPreamble.js';
import DicomConstants from '../dicomConstants.js'

var preamble = null;

beforeAll(() => {

    var data = [];
    
    // Populate the preamble data
    for (var i = 0; i < DicomConstants.PreambleLength; i++) {
        data.push(i);
    }

    // Create the preamble
    preamble = new DicomPreamble(data);

});

test("Test: Preamble Value Length", () => {
    expect(preamble.valueLength).toBe(DicomConstants.PreambleLength);
});

test("Test: Preamble Data 0", () => {
    expect(preamble.access()[0]).toBe(0);
});

test("Test: Preamble Data 64", () => {
    expect(preamble.access()[64]).toBe(64);
});

test("Test: Preamble Data 127", () => {
    expect(preamble.access()[127]).toBe(127);
});