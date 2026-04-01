//
// Data.js
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

    static searchSequenceCache = new WeakMap();

    /**
     * Refreshes the public data view from the current internal range.
     */
    _refreshDataView() {
        this.data = this._buffer.subarray(this._start, this._end);
        this._nativeDataView = null;
        this._nativeDataSource = null;
    }

    /**
     * Convert one source sequence value to an addressable Uint8Array view.
     * @param {Uint8Array | ArrayBuffer | Array<number>} sequence The source sequence.
     * @returns {Uint8Array} The normalized byte view.
     */
    static normalizeSequenceBytes(sequence) {

        if (sequence instanceof Uint8Array)
            return sequence;

        if (sequence instanceof ArrayBuffer)
            return new Uint8Array(sequence);

        if (ArrayBuffer.isView(sequence))
            return new Uint8Array(sequence.buffer, sequence.byteOffset, sequence.byteLength);

        return new Uint8Array(sequence);

    }

    /**
     * Resolve a heuristic byte penalty used to avoid common low-entropy anchors.
     * @param {number} value The target byte value.
     * @returns {number} A relative penalty score where lower is better.
     */
    static getSearchBytePenalty(value) {

        if (value == 0)
            return 3;

        if ((value == 10) || (value == 13) || (value == 32) || (value == 45))
            return 2;

        return 0;

    }

    /**
     * Compile and cache one sequence search plan.
     * @param {Uint8Array | ArrayBuffer | Array<number>} sequence The source sequence.
     * @returns {object | null} The compiled search plan, or null when unavailable.
     */
    static compileSearchSequence(sequence) {

        if (sequence == null)
            return null;

        var cacheable = ((typeof sequence == "object") || (typeof sequence == "function"));
        if (cacheable == true) {
            var cached = Data.searchSequenceCache.get(sequence);
            if (cached != null)
                return cached;
        }

        var bytes = null;
        try {
            bytes = Data.normalizeSequenceBytes(sequence);
        }
        catch {
            return null;
        }
        var target = Uint8Array.from(bytes);
        var targetLength = target.length;

        var anchorIndex = 0;
        var firstBytePenalty = 0;

        if (targetLength > 1) {

            var counts = new Uint32Array(256);
            for (var i = 0; i < targetLength; i++) {
                counts[target[i]]++;
            }

            var bestCount = counts[target[0]];
            var bestPenalty = Data.getSearchBytePenalty(target[0]);
            firstBytePenalty = bestPenalty;

            for (var i = 1; i < targetLength; i++) {

                var value = target[i];
                var valueCount = counts[value];
                var valuePenalty = Data.getSearchBytePenalty(value);

                if ((valueCount < bestCount) || ((valueCount == bestCount) && (valuePenalty < bestPenalty))) {
                    anchorIndex = i;
                    bestCount = valueCount;
                    bestPenalty = valuePenalty;
                }

            }

        }

        var nativeTarget = null;

        if ((targetLength > 1) && (typeof Buffer != "undefined") && (typeof Buffer.from == "function")) {
            nativeTarget = Buffer.from(target.buffer, target.byteOffset, target.byteLength);
        }

        var compiled = {
            target: target,
            targetLength: targetLength,
            anchorIndex: anchorIndex,
            anchorByte: ((targetLength > 0) ? target[anchorIndex] : -1),
            nativeTarget: nativeTarget,
            enableDenseFallback: ((anchorIndex == 0) && (firstBytePenalty > 0) && (nativeTarget != null))
        };

        if (cacheable == true) {
            Data.searchSequenceCache.set(sequence, compiled);
        }

        return compiled;

    }

    /**
     * Resolve a node-native data view when Buffer support exists.
     * @returns {Buffer | null} The native data view.
     */
    _getNativeDataView() {

        if ((typeof Buffer == "undefined") || (typeof Buffer.from != "function"))
            return null;

        if ((this._nativeDataView != null) && (this._nativeDataSource === this.data))
            return this._nativeDataView;

        this._nativeDataView = Buffer.from(this.data.buffer, this.data.byteOffset, this.data.byteLength);
        this._nativeDataSource = this.data;

        return this._nativeDataView;

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

        // Validate source.
        if (sequence == null)
            return -1;

        var source = this.data;
        var sourceLength = source.length;
        if (sourceLength === 0)
            return -1;

        var offset = Math.max(0, begin | 0);
        if (offset >= sourceLength)
            return -1;

        var search = Data.compileSearchSequence(sequence);
        if (search == null)
            return -1;

        var target = search.target;
        var targetLength = search.targetLength;
        if (targetLength === 0)
            return -1;

        // Fast path for single-byte sequence.
        if (targetLength === 1)
            return source.indexOf(target[0], offset);

        // If there are not enough bytes remaining, the sequence cannot be found.
        var maxStart = (sourceLength - targetLength);
        if (offset > maxStart)
            return -1;

        var anchorIndex = search.anchorIndex;

        // Fast path for first-byte anchored sequences. Includes guarded native fallback for dense candidates.
        if (anchorIndex == 0) {

            var first = target[0];
            var lastOffset = (targetLength - 1);
            var last = target[lastOffset];
            var candidate = source.indexOf(first, offset);

            // Keep DICOM end-sequence-like paths on the tight original loop.
            if (search.enableDenseFallback != true) {

                while ((candidate != -1) && (candidate <= maxStart)) {

                    // Quickly reject when last byte does not match.
                    if (source[candidate + lastOffset] == last) {

                        var isMatch = true;
                        for (var i = 1; i < lastOffset; i++) {
                            if (source[candidate + i] != target[i]) {
                                isMatch = false;
                                break;
                            }
                        }

                        if (isMatch == true)
                            return candidate;

                    }

                    candidate = source.indexOf(first, candidate + 1);

                }

                return -1;

            }

            var attempts = 0;

            while ((candidate != -1) && (candidate <= maxStart)) {

                // If candidate spacing is extremely dense, switch to native memmem-style search when available.
                if ((attempts == 64) && ((candidate - offset) < 1024)) {
                    var nativeSource = this._getNativeDataView();
                    if (nativeSource != null)
                        return nativeSource.indexOf(search.nativeTarget, offset);
                }

                // Quickly reject when last byte does not match.
                if (source[candidate + lastOffset] == last) {

                    var isMatch = true;
                    for (var i = 1; i < lastOffset; i++) {
                        if (source[candidate + i] != target[i]) {
                            isMatch = false;
                            break;
                        }
                    }

                    if (isMatch == true)
                        return candidate;

                }

                attempts++;
                candidate = source.indexOf(first, candidate + 1);

            }

            return -1;

        }

        // Adaptive anchor path: search on a lower-entropy target byte, then verify around that anchor.
        var anchor = search.anchorByte;
        var searchStart = (offset + anchorIndex);
        var maxCandidate = (maxStart + anchorIndex);
        var candidate = source.indexOf(anchor, searchStart);

        while ((candidate != -1) && (candidate <= maxCandidate)) {

            var start = (candidate - anchorIndex);
            var isMatch = true;

            for (var i = 0; i < anchorIndex; i++) {
                if (source[start + i] != target[i]) {
                    isMatch = false;
                    break;
                }
            }

            if (isMatch == true) {

                for (var i = (anchorIndex + 1); i < targetLength; i++) {
                    if (source[start + i] != target[i]) {
                        isMatch = false;
                        break;
                    }
                }

                if (isMatch == true)
                    return start;

            }

            candidate = source.indexOf(anchor, candidate + 1);

        }

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
