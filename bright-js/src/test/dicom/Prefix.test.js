import Prefix from '../../dicom/Prefix.js';
import Constants from '../../dicom/Constants.js'

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