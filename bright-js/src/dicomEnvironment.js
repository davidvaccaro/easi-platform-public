//
// DicomEnvironment.js - 1.0.0
//
// DICOM Environment Class 
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

export default class DicomEnvironment {

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

    };

    // Establish the current Little/Big endian-ness
    static isLittleEndian = DicomEnvironment.isRuntimeLittleEndian();

    constructor() {
    }

};