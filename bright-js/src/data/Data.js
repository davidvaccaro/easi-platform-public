//
// Data.js - 1.0.0
//
// Data Class 
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

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';

export default class Data {

    /**
     * Refreshes the public data view from the current internal range.
     */
    _refreshDataView() {
        this.data = this._buffer.subarray(this._start, this._end);
    }

    /**
     * Replaces the current internal data with the specified data.
     * @param {Uint8Array | Array<number>} raw The new raw data.
     */
    _setData(raw) {
        this._buffer = (raw instanceof Uint8Array) ? raw : new Uint8Array(raw);
        this._start = 0;
        this._end = this._buffer.length;
        this._refreshDataView();
    }

    /**
     * Ensure there is enough space in the internal buffer for appended data.
     * @param {number} additionalLength The number of additional bytes needed.
     */
    _ensureCapacity(additionalLength) {

        if (additionalLength <= 0)
            return;

        // Determine the currently available capacity at the write tail.
        var available = (this._buffer.length - this._end);
        if (available >= additionalLength)
            return;

        // Determine current active data length.
        var activeLength = (this._end - this._start);

        // If compacting the current active data to offset 0 provides enough room, do that first.
        if ((this._start > 0) && ((this._buffer.length - activeLength) >= additionalLength)) {
            this._buffer.set(this._buffer.subarray(this._start, this._end), 0);
            this._start = 0;
            this._end = activeLength;
            this._refreshDataView();
            return;
        }

        // Grow capacity exponentially to keep append amortized O(1).
        var required = (activeLength + additionalLength);
        var newCapacity = this._buffer.length;
        if (newCapacity < 16) {
            newCapacity = 16;
        }
        while (newCapacity < required) {
            newCapacity *= 2;
        }

        // Allocate and copy active data to offset 0.
        var grownBuffer = new Uint8Array(newCapacity);
        if (activeLength > 0) {
            grownBuffer.set(this._buffer.subarray(this._start, this._end), 0);
        }

        this._buffer = grownBuffer;
        this._start = 0;
        this._end = activeLength;
        this._refreshDataView();

    }

    /**
     * Accesses the data buffer.
     * @returns The data buffer.
     */
    access() {

        // Return the data buffer
        return this.data;

    }

    /**
     * Determins the length (in bytes) of the data buffer.
     * @returns The length (in bytes) of the data buffer.
     */
    length() {

        // Return the data buffer length
        return this.data.length;

    }

    /**
     * Append the specified raw bytes to the data buffer.
     * @param {Uint8Array} raw The raw byts to append.
     */
    append(raw) {

        // Validate the appended data
        if (raw == null)
            throw new Exception("Invalid raw data. Cannot append undefind or null data.", GeneralErrorCodes.InvalidParameter);

        // Normalize the appended data.
        var newData = (raw instanceof Uint8Array) ? raw : new Uint8Array(raw);

        // Handle zero-length append as a NOOP.
        if (newData.length == 0)
            return;

        // Fast path for initial append to preserve previous direct-reference behavior for Uint8Array.
        if (this.length() == 0) {
            this._setData(newData);
            return;
        }

        // Ensure there is enough writable space, then append at the internal write tail.
        this._ensureCapacity(newData.length);
        this._buffer.set(newData, this._end);
        this._end += newData.length;
        this._refreshDataView();

    }

    /**
     * Consume "count" length of bytes from the data buffer.
     * @param {number} count The count of bytes to consume.
     * @returns An array of the bytes consumed or an empty array if there are no more bytes within the buffer.
     */
    consume(count) {

        // Read the "consumed" sub-data and the remaining data.
        var consumed = this.data.subarray(0, count);
        var remaining = this.data.subarray(count, this.data.length);

        // Update the active range.
        if (remaining.length == 0) {
            this._start = 0;
            this._end = 0;
        }
        else {
            this._start += (remaining.byteOffset - this.data.byteOffset);
            this._end = (this._start + remaining.length);
        }
        this._refreshDataView();

        // Return the "consumed" data
        return consumed;

    }

    /**
     * Peak the current data buffer at a given "begin" offset and for a "count" length of bytes.
     * @param {number} begin The offset to start peeking within the data buffer.
     * @param {number} count The count of bytes to peek.
     * @returns An array of the bytes peaked or an empty array if begin is beyond the end of the array.
     */
    peek(begin, count) {

        // Return the "peeked" sub-data
        return this.data.subarray(begin, (begin + count));

    }

    /**
     * Peak one byte of the current data buffer at a given "begin" offset.
     * @param {number} begin The offset to start peeking within the data buffer.
     * @returns An single byte peaked from the current array.
     */
    peekOne(begin) {

        // Return the "peeked" sub-data
        return this.data[begin];

    }

    /**
     * Skip forward in the current data buffer by "count" bytes.
     * @param {number} count The count of bytes to skip from the start of the current buffer.
     */
    skip(count) {
        var remaining = this.data.subarray(count);

        // Update the active range.
        if (remaining.length == 0) {
            this._start = 0;
            this._end = 0;
        }
        else {
            this._start += (remaining.byteOffset - this.data.byteOffset);
            this._end = (this._start + remaining.length);
        }
        this._refreshDataView();
    }    

    /**
     * Determines the index of a specific byte sequence within the data buffer,
     * @param {number} begin The offset to start peeking within the data buffer. 
     * @param {Uint8Array} sequence The sequence to find.
     * @returns {number} The index of the sequence, or -1 if not found.
     */
    indexOf(begin, sequence) {

        // Validate inputs
        if (!sequence || sequence.length === 0) 
            return -1;

        if (this.data.length === 0 || begin >= this.data.length) 
            return -1;

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

        // Clear the buffer.
        this._setData(new Uint8Array(0));

    }

    /**
     * Determins if this data buffer is empty.
     * @returns true if the data buffer is empty.
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
     * Construct the new data buffer.
     */
    constructor() {

        // Initialize the internal buffer state.
        this._buffer = new Uint8Array(0);
        this._start = 0;
        this._end = 0;
        this._refreshDataView();

    }

};
