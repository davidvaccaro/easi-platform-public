//
// DicomData.js - 1.0.0
//
// DICOM Data Class 
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
import DicomUtilities from './dicomUtilities.js';
import DicomException from './dicomException.js';
import { TransferSyntax } from './dicomTransferSyntax.js'

export default class DicomData {

    /**
     * Accesses the DICOM data buffer.
     * @returns The DICOM data buffer.
     */
    access() {

        // Check the state
        if (this.data == null)
            return null;

        // Return the data buffer
        return this.data;

    }

    /**
     * Determins the length (in bytes) of the DICOM data buffer.
     * @returns The length (in bytes) of the DICOM data buffer.
     */
    length() {

        // Check the state
        if (this.data == null)
            return 0;

        // Return the data buffer length
        return this.data.length;

    }

    /**
     * Convert the current DICOM data buffer to the specified transfer-syntax.
     * @param {*} newTransferSyntax The new transfer-syntax to convert to.
     */
    convert(newTransferSyntax) {

        // Check for NOOP
        if (this.transferSyntax == newTransferSyntax)
            return;

        // If there currently is data in the buffer and the new transfer-syntax endian-ness does NOT agree, flip the bytes
        if ((this.length() > 0)
            && (newTransferSyntax != TransferSyntax.NONE)
            && (this.transferSyntax != TransferSyntax.NONE)
            && (this.transferSyntax.IsLittleEndian != newTransferSyntax.IsLittleEndian)) {
            this.data = DicomUtilities.swapBytes(this.data);
        }

        // Set the transfer-syntax
        this.transferSyntax = newTransferSyntax;

    }

    /**
     * Append the specified raw bytes to the DICOM data buffer.
     * @param {*} raw The raw byts to append.
     */
    append(raw) {

        // Validate the appended data
        if (raw == null)
            throw new DicomException("Invalid raw DICOM data. Cannot append undefind or null data.", DicomErrorCodes.InvalidParameter);

        // Establish the new data
        var newData = null;

        // Prepare the new data (with a endian-swap if needed)
        if ((this.transferSyntax != TransferSyntax.NONE) && (this.transferSyntax.IsLittleEndian != DicomEnvironment.isLittleEndian))
            newData = DicomUtilities.swapBytes(raw);
        else
            newData = raw;

        if (this.length() == 0) {

            // set the new data buffer
            this.data = (typeof newData === 'Uint8Array') ? newData : new Uint8Array(newData);

        }
        else if (newData != null) {

            // Create a buffer large enough to accomadate the prior data and the new chunk
            var appendedArray = new Uint8Array(this.data.length + newData.length);
            
            // Append the current data and the new data
            appendedArray.set(this.data);
            appendedArray.set(newData, this.data.length);

            // Set the new data buffer
            this.data = appendedArray;

        }

    }

    /**
     * Consume "count" length of bytes from the DICOM data buffer.
     * @param {*} count The count of bytes to consume.
     * @returns An array of the bytes consumed or an empty array if there are no more bytes within the buffer.
     */
    consume(count) {

        // Read the "consumed" sub-data
        var consumed = this.data.subarray(0, count);

        // Consume the sub-data bytes
        this.data = this.data.subarray(count, this.data.length);

        // Return the "consumed" data
        return consumed;

    }

    /**
     * Peak the current DICOM data buffer at a given "begin" offset and for a "count" length of bytes.
     * @param {*} begin The offset to start peeking within the DICOM data buffer.
     * @param {*} count The count of bytes to peek.
     * @returns An array of the bytes peaked or an empty array if begin is beyond the end of the array.
     */
    peek(begin, count) {

        // Return the "peeked" sub-data
        return this.data.subarray(begin, (begin + count));

    }

    /**
     * Determines the index of a specific byte sequence witin the data buffer,
     * @param {*} begin The offset to start peeking within the DICOM data buffer. 
     * @param {*} sequence The sequence to find.
     */
    indexOf(begin, sequence) {

        // Loop over the buffer bytes
        while (begin < this.data.length) {
            
            // If there are NOT enough remining bytes, the sequence can NOT be found
            if ((this.data.length - begin) < sequence.length)
                return -1;

            // If the first sequence byte was found,
            if (this.data[begin] == sequence[0]) {

                // Loop over the remaining sequence bytes
                for (var i = 1; i < sequence.length; i++) {

                    // If the sequence is violated, break and continue searching
                    if (this.data[begin + i] != sequence[i]) {
                        break;
                    }

                    // The sequence WAS found, return
                    if (i == sequence.length - 1) {
                        return begin;
                    }

                }

            }

            begin++;

        }

        // The sequence was NOT found
        return -1;

    }

    /**
     * Clear the current buffer state.
     */
    clear() {

        // Clear the buffer
        this.data = new Uint8Array(0);

    }

    /**
     * Determins if this DICOM data buffer is empty.
     * @returns true if the DICOM data buffer is empty.
     */
    get isEmpty() {
        return (this.length() == 0);
    }

    /**
     * Determins if the data is only filled with zeros.
     * @returns TRU of the data is zero-space, FALSE otherwise.
     */
    get isZeroSpace() {

        // First check the state
        if ((this.data == undefined) || (this.data == null))
            return true;

        // Check is every byte is 0
        return this.data.every(function (v) {
            return v === 0;
        });

    }

    /**
     * Construct the new DICOM data buffer.
     */
    constructor(raw = null, transferSyntax = TransferSyntax.NONE) {

        // Check the params
        if (raw == null)
            raw = new Uint8Array(0);

        // Set the transfer-syntax
        this.transferSyntax = transferSyntax;

        // Append the new buffer
        this.append(raw);

    }

};