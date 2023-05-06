import Runtime from '../../environment/Runtime.js';
import Constants from '../../dicom/Constants.js';
import Utilities from '../../dicom/Utilities.js';

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