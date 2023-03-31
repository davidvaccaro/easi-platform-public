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

import DicomEnvironment from './dicomEnvironment.js';

export default class DicomUtilities {

    /**
     * Convert the specified byte array (2 or 4 bytes) to an unsigned integer value.
     * @param {*} bytes The specified byte array.
     * @returns The unsigned integer value of the byte array.
     */
    static bytesToUnsignedInteger(bytes) {
        var dv = new DataView(bytes.buffer);
        if (bytes.length == 2)
            return dv.getUint16(bytes.byteOffset, DicomEnvironment.isLittleEndian);
        else if (bytes.length == 4)
            return dv.getUint32(bytes.byteOffset, DicomEnvironment.isLittleEndian);
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

        return bytes;
        
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
     * Get the byte buffer containing the DICOM Item.
     * @returns The Item byte buffer.
     */
    static getItem() {
        if (DicomEnvironment.isLittleEndian == true) {
            return [254, 255, 0, 224];
        }
        return [255, 254, 224, 0];
    }

    /**
     * Get the byte buffer containing the DICOM End Sequence.
     * @returns The End Sequence byte buffer.
     */
    static getEndSequence() {
        if (DicomEnvironment.isLittleEndian == true) {
            return [254, 255, 221, 224, 0, 0, 0, 0];
        }
        return [255, 254, 224, 221, 0, 0, 0, 0];
    }

    constructor() {
    }

};