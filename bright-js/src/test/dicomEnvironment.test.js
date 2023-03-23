import DicomEnvironment from '../dicomEnvironment.js';

test('Test: isRuntimeLittleEndian Method', () => {

    // Alternate method to determining endianness
    let uInt32 = new Uint32Array([0x11223344]);
    let uInt8 = new Uint8Array(uInt32.buffer);
    let isLittle = (uInt8[0] === 0x44);

    // Test the endianness
    expect(DicomEnvironment.isRuntimeLittleEndian()).toBe(isLittle);
    
});

test('Test: isRuntimeLittleEndian Property', () => {

    // Alternate method to determining endianness
    let uInt32 = new Uint32Array([0x11223344]);
    let uInt8 = new Uint8Array(uInt32.buffer);
    let isLittle = (uInt8[0] === 0x44);

    // Test the endianness
    expect(DicomEnvironment.isLittleEndian).toBe(isLittle);
    
});