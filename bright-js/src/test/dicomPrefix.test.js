import DicomPrefix from '../dicomPrefix.js';
import DicomConstants from '../dicomConstants.js'

var prefix = null;

beforeAll(() => {
    
    let data = (new TextEncoder()).encode(DicomConstants.PrefixValue);

    // Create the prefix
    prefix = new DicomPrefix(data);

});

test("Test: Prefix Value Length", () => {
    expect(prefix.valueLength).toBe(DicomConstants.PrefixLength);
});

test("Test: Prefix Data", () => {
    expect((new TextDecoder()).decode(prefix.access())).toBe(DicomConstants.PrefixValue);
});