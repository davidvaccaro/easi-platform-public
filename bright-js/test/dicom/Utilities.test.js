import Runtime from '../../src/environment/Runtime.js';
import Constants from '../../src/dicom/Constants.js';
import Utilities from '../../src/dicom/Utilities.js';

test('Test: 2 bytesToUnsignedInteger', () => {
    expect(Utilities.bytesToUnsignedInteger(new Uint8Array([1, 1]))).toBe(257);
});

test('Test: 4 bytesToUnsignedInteger', () => {
    expect(Utilities.bytesToUnsignedInteger(new Uint8Array([1, 1, 1, 1]))).toBe(16843009);
});

test('Test: bytesToUnsignedInteger undefined', () => {
    expect(Utilities.bytesToUnsignedInteger(new Uint8Array([1, 1, 1, 1, 1]))).toBe(undefined);
});

test('Test: bytesToString', () => {
    expect(Utilities.bytesToString(new Uint8Array([68, 73, 67, 77]))).toBe(Constants.PrefixValue);    
});

test('Test: Swap 2 Bytes', () => {

    // Create the initial buffers
    var bytes = new Uint8Array([0, 1]);
    var right = new Uint8Array([1, 0]);

    // Swap
    var swapped = Utilities.swapBytes(bytes);

    // Test the swap
    expect(swapped[0]).toBe(right[0]);
    expect(swapped[1]).toBe(right[1]);
    
});

test('Test: Swap 4 Bytes', () => {

    // Create the initial buffers
    var bytes = new Uint8Array([0, 1, 0, 1]);
    var right = new Uint8Array([1, 0, 1, 0]);

    // Swap
    var swapped = Utilities.swapBytes(bytes);

    // Test the swap
    expect(swapped[0]).toBe(right[0]);
    expect(swapped[1]).toBe(right[1]);
    expect(swapped[2]).toBe(right[2]);
    expect(swapped[3]).toBe(right[3]);
    
});

test('Test: deepCopyArray', () => {
    expect(Utilities.deepCopyArray([{ id: 10, text: 'test' }])).toStrictEqual([{ id: 10, text: 'test' }]);
});

test('Test: getEndSequence and isEndSequence', () => {

    // Establish the standard DICOM Squence End signature
    var endSequence = null;
    if (Runtime.isLittleEndian == true)
        endSequence = [254, 255, 221, 224, 0, 0, 0, 0];
    else
        endSequence = [255, 254, 224, 221, 0, 0, 0, 0];

    expect(Utilities.getEndSequence()).toStrictEqual(endSequence);
});

test('Test: createDeterministicUID is stable for the same seed', () => {

    const first = Utilities.createDeterministicUID('00100010|JOHN^DOE');
    const second = Utilities.createDeterministicUID('00100010|JOHN^DOE');

    expect(first).toBe(second);
    expect(first.startsWith('2.25.')).toBe(true);
    expect(first.length).toBeLessThanOrEqual(64);

});

test('Test: createDeterministicUID varies by seed', () => {

    const first = Utilities.createDeterministicUID('00100010|JOHN^DOE');
    const second = Utilities.createDeterministicUID('00100010|JANE^DOE');

    expect(first).not.toBe(second);

});

test('Test: newUID returns a DICOM-compatible 2.25 OID string', () => {

    const uid = Utilities.newUID();

    expect(uid.startsWith('2.25.')).toBe(true);
    expect(/^[0-9]+$/.test(uid.substring('2.25.'.length))).toBe(true);
    expect(uid.length).toBeLessThanOrEqual(64);

});

test('Test: newUID returns different values across multiple calls', () => {

    const values = new Set();
    for (var i = 0; i < 20; i++) {
        values.add(Utilities.newUID());
    }

    expect(values.size).toBe(20);

});
