import Prefix from '../../src/dicom/Prefix.js';
import Constants from '../../src/dicom/Constants.js'

var prefix = null;

beforeAll(() => {
    
    let data = (new TextEncoder()).encode(Constants.PrefixValue);

    // Create the prefix
    prefix = new Prefix(data);

});

test("Test: Prefix Value Length", () => {
    expect(prefix.valueLength).toBe(Constants.PrefixLength);
});

test("Test: Prefix Data", () => {
    expect((new TextDecoder()).decode(prefix.access())).toBe(Constants.PrefixValue);
});