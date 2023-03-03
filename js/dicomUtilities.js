//
// DicomUtilities.js - 1.0.0
//
// DICOM Utilities Class 
//
// Proprietary Notices:
// The Products, Documentation and Materials are proprietary to Xinonix Interactive Development Inc. and its licensors 
// and protected by applicable U.S. and international patent, copyright, trademark and trade secret laws. Xinonix 
// Interactive Development Inc and its licensors shall retain ownership in the Products, Documentation and Materials; 
// all derivatives thereof (in whole or part); and any intellectual property or other rights embodied therein. 
// 
// All proprietary notices incorporated in or affixed to any Products, Documentation or Materials shall be duplicated 
// by you on all copies of the Products, Documentation, or Material, as applicable, and shall not be altered, removed 
// or obliterated. Lease Equipment is, and shall at all times be and remain Our sole and exclusive property; you have 
// no right, title or interest therein or thereto except as expressly set forth in this Agreement. You shall keep the 
// Lease Equipment free and clear of all levies, liens and encumbrances and shall immediately notify us in writing of 
// any circumstances with respect to the location of the Equipment which will adversely affect it or our security 
// interests therein. You shall not install, attach, mount or otherwise house the Lease Equipment in a manner that 
// would render it a fixture under applicable law within the jurisdiction in which the Lease Equipment is located.
//

class DicomUtilities {

    /**
     * Determines the endian-ness of the current runtime
     * @returns true if the current runtime is "little endian" and false otherwise.
     */
    static isRuntimeLittleEndian() {

        // Create 8-bit and 16-bit byte buffers
        var arrayBuffer = new ArrayBuffer(2);
        var uint8Array = new Uint8Array(arrayBuffer);
        var uint16array = new Uint16Array(arrayBuffer);

        // Set the first and second bytes
        uint8Array[0] = 0xAA;
        uint8Array[1] = 0xBB;

        // Is "little" endian, else "big"
        if (uint16array[0] === 0xBBAA)
            return true;
        return false;

    }

    /**
     * Convert the specified byte array (2 or 4 bytes) to an unsigned integer value.
     * @param {*} bytes The specified byte array.
     * @returns The unsigned integer value of the byte array.
     */
    static bytesToUnsignedInteger(bytes) {
        var dv = new DataView(bytes.buffer);
        if (bytes.length == 2)
            return dv.getUint16(bytes.byteOffset, runtimeIsLittleEndian);
        else if (bytes.length == 4)
            return dv.getUint32(bytes.byteOffset, runtimeIsLittleEndian);
        return undefined;
    }

    /**
     * Convert the specified byte array to a string representation.
     * @param {*} bytes The specifide byte array. 
     * @returns The string value of the byte array.
     */
    static bytesToString(bytes) {
        return String.fromCharCode.apply(null, bytes);
    }

    /**
     * Swap bytes in the array for when differences in the endian-ness of the runtime requires data adjustment.
     * @param {*} buf The buffer of data bytes
     */
    static swapBytes(buf) {

        // Create a new array for the swapped bytes
        var bytes = new Uint8Array(buf);
        var len = bytes.length;
        var holder;

        // Swap the bytes
        for (var i = 0; i < len; i += 2) {
            holder = bytes[i];
            bytes[i] = bytes[i + 1];
            bytes[i + 1] = holder;
        }

    }

    /**
     * Performs a "deep" compy of the specified array.
     * @param {*} arr The specified array.
     * @returns The "deep" copy of the specified array.
     */
    static deepCopyArray(arr) {
        return JSON.parse(JSON.stringify(arr));
    }

    /**
     * Determins if the specified buffer contains the DICOM "Sequence Delimiter"
     * @param {*} buffer The specified buffer.
     * @returns TRUE if the buffer contains the DICOM "Sequence Delimiter", FALSE otherwise.
     */
    static isEndSequence(buffer) {

        // Parse the "Group"
        var group = DicomUtilities.bytesToUnsignedInteger(buffer.subarray(0, 2))

        if (group != Tags.SequenceDelimitationItem.Group)
            return false;

        // Parse the "Element"
        var element = DicomUtilities.bytesToUnsignedInteger(buffer.subarray(2, 4))

        if (element != Tags.SequenceDelimitationItem.Element)
            return false;
    
        return true;

    }

    constructor() {
    }

};

// Establish the current Little/Big endian-ness
let runtimeIsLittleEndian = DicomUtilities.isRuntimeLittleEndian();
