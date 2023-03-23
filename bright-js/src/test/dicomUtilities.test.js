import DicomConstants from '../dicomConstants.js';
import DicomEnvironment from '../dicomEnvironment.js';
import DicomUtilities from '../dicomUtilities.js';

test('Test: 2 bytesToUnsignedInteger', () => {
    expect(DicomUtilities.bytesToUnsignedInteger(new Uint8Array([1, 1]))).toBe(257);
});

test('Test: 4 bytesToUnsignedInteger', () => {
    expect(DicomUtilities.bytesToUnsignedInteger(new Uint8Array([1, 1, 1, 1]))).toBe(16843009);
});

test('Test: bytesToUnsignedInteger undefined', () => {
    expect(DicomUtilities.bytesToUnsignedInteger(new Uint8Array([1, 1, 1, 1, 1]))).toBe(undefined);
});

test('Test: bytesToString', () => {
    expect(DicomUtilities.bytesToString(new Uint8Array([68, 73, 67, 77]))).toBe(DicomConstants.PrefixValue);    
});

test('Test: Swap 2 Bytes', () => {

    // Create the initial buffers
    var bytes = new Uint8Array([0, 1]);
    var right = new Uint8Array([1, 0]);

    // Swap
    var swapped = DicomUtilities.swapBytes(bytes);

    // Test the swap
    expect(swapped[0]).toBe(right[0]);
    expect(swapped[1]).toBe(right[1]);
    
});

test('Test: Swap 4 Bytes', () => {

    // Create the initial buffers
    var bytes = new Uint8Array([0, 1, 0, 1]);
    var right = new Uint8Array([1, 0, 1, 0]);

    // Swap
    var swapped = DicomUtilities.swapBytes(bytes);

    // Test the swap
    expect(swapped[0]).toBe(right[0]);
    expect(swapped[1]).toBe(right[1]);
    expect(swapped[2]).toBe(right[2]);
    expect(swapped[3]).toBe(right[3]);
    
});

test('Test: deepCopyArray', () => {
    expect(DicomUtilities.deepCopyArray([{ id: 10, text: 'test' }])).toStrictEqual([{ id: 10, text: 'test' }]);
});

test('Test: getEndSequence and isEndSequence', () => {

    // Establish the standard DICOM Squence End signature
    var endSequence = null;
    if (DicomEnvironment.isLittleEndian == true)
        endSequence = [254, 255, 221, 224, 0, 0, 0, 0];
    else
        endSequence = [255, 254, 224, 221, 0, 0, 0, 0];

    expect(DicomUtilities.getEndSequence()).toStrictEqual(endSequence);
});