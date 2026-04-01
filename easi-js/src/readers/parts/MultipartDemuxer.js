//
// MultipartDemuxer.js
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

import Data from '../../data/Data.js';
import Exception from '../../environment/Exception.js';
import { GeneralErrorCodes } from '../../environment/Exception.js';

const MultipartDemuxerStates = {
    SeekBoundary: 0,
    ReadHeaders: 1,
    ReadPartData: 2,
    Ended: 3
};

export default class MultipartDemuxer {

    /**
     * Normalize incoming chunk source to bytes.
     * @param {Uint8Array | ArrayBuffer | DataView | Array<number> | null} value The source value.
     * @returns {Uint8Array} The normalized bytes.
     */
    toBytes(value) {

        if (value == null)
            return new Uint8Array(0);

        if (value instanceof Uint8Array)
            return value;

        if (value instanceof ArrayBuffer)
            return new Uint8Array(value);

        if (ArrayBuffer.isView(value))
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

        if (Array.isArray(value))
            return Uint8Array.from(value);

        throw new Exception('Invalid multipart chunk source. Expected bytes.', GeneralErrorCodes.InvalidParameter);

    }

    /**
     * Determine if the first 2 bytes of the current buffer match the specified pair.
     * @param {number} first The first byte.
     * @param {number} second The second byte.
     * @returns {boolean} TRUE if the pair matches.
     */
    startsWithPair(first, second) {
        return ((this.buffer.length() >= 2) && (this.buffer.peekOne(0) === first) && (this.buffer.peekOne(1) === second));
    }

    /**
     * Parse one multipart header block.
     * @param {Uint8Array} headerBytes The raw header bytes.
     * @returns {object} Parsed header map.
     */
    parsePartHeaders(headerBytes) {

        var text = (new TextDecoder()).decode(headerBytes);
        var lines = text.split(/\r?\n|\r|\n/g);
        var headers = {};

        for (var i = 0; i < lines.length; i++) {

            var line = lines[i];
            if ((line == null) || (line.trim().length === 0))
                continue;

            var index = line.indexOf(':');
            if (index < 0)
                continue;

            var name = line.substring(0, index).trim().toLowerCase();
            var value = line.substring(index + 1).trim();
            headers[name] = value;

        }

        return headers;

    }

    /**
     * Safely invoke one callback if present.
     * @param {string} name Callback property name.
     * @param {Array<any>} args Callback arguments.
     */
    async fire(name, ...args) {

        if ((this.callbacks == null) || (typeof this.callbacks[name] !== 'function'))
            return;

        await this.callbacks[name](...args);

    }

    /**
     * Process buffered bytes until blocked on additional input.
     * @param {boolean} done Indicates whether no additional bytes will arrive.
     */
    async process(done) {

        while (true) {

            if (this.state === MultipartDemuxerStates.Ended) {
                this.buffer.consume(this.buffer.length());
                return;
            }

            if (this.state === MultipartDemuxerStates.SeekBoundary) {

                var boundaryIndex = this.buffer.indexOf(0, this.startBoundaryBytes);

                if (boundaryIndex < 0) {

                    if (done) {
                        if (this.buffer.length() > 0)
                            throw new Exception('Invalid multipart payload. Missing boundary.', GeneralErrorCodes.GeneralError);
                        return;
                    }

                    // Keep enough trailing bytes for one boundary prefix match.
                    var keep = this.startBoundaryBytes.length - 1;
                    var consumeLength = this.buffer.length() - keep;
                    if (consumeLength > 0) {
                        this.buffer.consume(consumeLength);
                    }
                    return;

                }

                if (boundaryIndex > 0)
                    this.buffer.consume(boundaryIndex);

                // Need at least boundary + 2 bytes for either CRLF (next part) or -- (final boundary)
                if (this.buffer.length() < (this.startBoundaryBytes.length + 2)) {
                    if (done)
                        throw new Exception('Invalid multipart payload. Truncated boundary marker.', GeneralErrorCodes.GeneralError);
                    return;
                }

                this.buffer.consume(this.startBoundaryBytes.length);

                if (this.startsWithPair(45, 45)) {
                    this.buffer.consume(2);
                    this.state = MultipartDemuxerStates.Ended;
                    await this.fire('onEnd');
                    continue;
                }

                if (this.startsWithPair(13, 10)) {
                    this.buffer.consume(2);
                    this.state = MultipartDemuxerStates.ReadHeaders;
                    continue;
                }

                throw new Exception('Invalid multipart payload. Boundary suffix is malformed.', GeneralErrorCodes.GeneralError);

            }

            if (this.state === MultipartDemuxerStates.ReadHeaders) {

                var headerBreakIndex = this.buffer.indexOf(0, this.headerBreakBytes);

                if (headerBreakIndex < 0) {
                    if (done)
                        throw new Exception('Invalid multipart payload. Missing part header terminator.', GeneralErrorCodes.GeneralError);
                    return;
                }

                var headerBytes = this.buffer.consume(headerBreakIndex);
                this.buffer.consume(this.headerBreakBytes.length);

                this.currentPartHeaders = this.parsePartHeaders(headerBytes);
                await this.fire('onPartStart', this.currentPartHeaders);
                this.state = MultipartDemuxerStates.ReadPartData;
                continue;

            }

            if (this.state === MultipartDemuxerStates.ReadPartData) {

                var partBoundaryIndex = this.buffer.indexOf(0, this.partBoundaryBytes);

                if (partBoundaryIndex < 0) {

                    if (done) {
                        if (this.buffer.length() > 0) {
                            await this.fire('onPartData', this.buffer.consume(this.buffer.length()), true);
                        }
                        await this.fire('onPartEnd', this.currentPartHeaders);
                        this.state = MultipartDemuxerStates.Ended;
                        await this.fire('onEnd');
                        return;
                    }

                    // Emit flushable bytes while retaining enough bytes to detect split boundary.
                    var retainLength = this.partBoundaryBytes.length - 1;
                    var flushLength = this.buffer.length() - retainLength;
                    if (flushLength > 0) {
                        await this.fire('onPartData', this.buffer.consume(flushLength), false);
                    }
                    return;

                }

                if (this.buffer.length() < (partBoundaryIndex + this.partBoundaryBytes.length + 2)) {

                    if (done)
                        throw new Exception('Invalid multipart payload. Truncated boundary marker after part data.', GeneralErrorCodes.GeneralError);

                    // Emit bytes up to the boundary start and wait for more data to classify boundary suffix.
                    if (partBoundaryIndex > 0) {
                        await this.fire('onPartData', this.buffer.consume(partBoundaryIndex), false);
                    }
                    return;

                }

                if (partBoundaryIndex > 0) {
                    await this.fire('onPartData', this.buffer.consume(partBoundaryIndex), true);
                }

                this.buffer.consume(this.partBoundaryBytes.length);

                if (this.startsWithPair(45, 45)) {
                    this.buffer.consume(2);
                    await this.fire('onPartEnd', this.currentPartHeaders);
                    this.state = MultipartDemuxerStates.Ended;
                    await this.fire('onEnd');
                    continue;
                }

                if (this.startsWithPair(13, 10)) {
                    this.buffer.consume(2);
                    await this.fire('onPartEnd', this.currentPartHeaders);
                    this.state = MultipartDemuxerStates.ReadHeaders;
                    continue;
                }

                throw new Exception('Invalid multipart payload. Boundary suffix is malformed.', GeneralErrorCodes.GeneralError);

            }

        }

    }

    /**
     * Push one chunk into the demuxer.
     * @param {Uint8Array | ArrayBuffer | DataView | Array<number> | null} chunk One chunk of multipart bytes.
     * @param {boolean} done Indicates this is the final push.
     */
    async push(chunk, done = false) {

        if (this.state === MultipartDemuxerStates.Ended) {
            return;
        }

        var bytes = this.toBytes(chunk);
        if (bytes.length > 0) {
            this.buffer.append(bytes);
        }

        await this.process(done);

    }

    /**
     * Create one multipart demuxer instance.
     * @param {string} boundary The multipart boundary token.
     * @param {object | null} callbacks Callback map:
     *  - onPartStart(headers)
     *  - onPartData(bytes, isFinalChunk)
     *  - onPartEnd(headers)
     *  - onEnd()
     */
    constructor(boundary, callbacks = null) {

        if ((boundary == null) || (String(boundary).trim().length === 0)) {
            throw new Exception('Invalid multipart boundary.', GeneralErrorCodes.InvalidParameter);
        }

        this.callbacks = callbacks || {};

        this.boundary = String(boundary);
        this.startBoundaryBytes = (new TextEncoder()).encode('--' + this.boundary);
        this.partBoundaryBytes = (new TextEncoder()).encode('\r\n--' + this.boundary);
        this.headerBreakBytes = (new TextEncoder()).encode('\r\n\r\n');

        this.buffer = new Data();
        this.state = MultipartDemuxerStates.SeekBoundary;
        this.currentPartHeaders = {};

    }

}
