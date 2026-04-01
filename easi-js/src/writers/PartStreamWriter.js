//
// PartStreamWriter.js
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

export default class PartStreamWriter {

    /**
     * Convert a value to Uint8Array.
     * @param {Uint8Array | ArrayBuffer | DataView | Array<number>} value The value to normalize.
     * @returns {Uint8Array} The normalized bytes.
     */
    toBytes(value) {

        if (value == null)
            throw new Exception("Invalid source data. Expected bytes.", GeneralErrorCodes.InvalidParameter);

        if (value instanceof Uint8Array)
            return value;

        if (value instanceof ArrayBuffer)
            return new Uint8Array(value);

        if (ArrayBuffer.isView(value))
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

        if (Array.isArray(value))
            return Uint8Array.from(value);

        throw new Exception("Invalid source data. Expected bytes.", GeneralErrorCodes.InvalidParameter);

    }

    /**
     * Determine if the value is likely a multipart part descriptor.
     * @param {unknown} value The value to inspect.
     * @returns {boolean} TRUE if the value appears to be a part descriptor.
     */
    isPartDescriptor(value) {

        if (value == null)
            return false;

        if (value instanceof Uint8Array)
            return true;

        if (value instanceof ArrayBuffer)
            return true;

        if (ArrayBuffer.isView(value))
            return true;

        if ((typeof value === 'object') && (value.data != null))
            return true;

        return false;

    }

    /**
     * Determine if a header exists using case-insensitive matching.
     * @param {object} headers The header map.
     * @param {string} name The header name.
     * @returns {boolean} TRUE if the header exists.
     */
    hasHeader(headers, name) {
        var lowerName = name.toLowerCase();
        return Object.keys(headers).some((key) => key.toLowerCase() == lowerName);
    }

    /**
     * Set a default header when the key is missing.
     * @param {object} headers The header map.
     * @param {string} name The header name.
     * @param {string} value The header value.
     */
    setDefaultHeader(headers, name, value) {
        if (this.hasHeader(headers, name) == false) {
            headers[name] = value;
        }
    }

    /**
     * Encode text to bytes.
     * @param {string} value The text value.
     * @returns {Uint8Array} The encoded bytes.
     */
    encodeText(value) {
        return (new TextEncoder()).encode(value);
    }

    /**
     * Generate a multipart boundary token.
     * @returns {string} The generated boundary token.
     */
    createBoundary() {

        if ((globalThis.crypto != null) && (typeof globalThis.crypto.randomUUID === 'function')) {
            return "easi-boundary-" + globalThis.crypto.randomUUID();
        }

        return "easi-boundary-" + Date.now().toString(16) + "-" + Math.floor(Math.random() * 0xFFFFFF).toString(16);

    }

    /**
     * Create one write session state from default and per-call options.
     * @param {object | null} options Optional per-call options.
     * @returns {object} The write-state.
     */
    createWriteState(options = null) {

        if (options == null) {
            options = {};
        }

        var onChunk = (options.onChunk != null)
            ? options.onChunk
            : this.onChunk;

        var collectOutput = null;
        if (options.collectOutput != null) {
            collectOutput = (options.collectOutput == true);
        }
        else if (this.collectOutput != null) {
            collectOutput = (this.collectOutput == true);
        }
        else {
            collectOutput = (onChunk == null);
        }

        var chunkSize = (options.chunkSize != null)
            ? Number(options.chunkSize)
            : Number(this.chunkSize || 0);

        if (Number.isFinite(chunkSize) == false) {
            chunkSize = 0;
        }

        if (chunkSize < 0) {
            chunkSize = 0;
        }

        return {
            onChunk: onChunk,
            collectOutput: collectOutput,
            chunkSize: Math.floor(chunkSize),
            bytesWritten: 0,
            outputChunks: []
        };

    }

    /**
     * Emit one output chunk for the current write-state.
     * @param {object} state The current write-state.
     * @param {Uint8Array} chunk The chunk to emit.
     */
    async emit(state, chunk) {

        if ((chunk == null) || (chunk.length == 0))
            return;

        state.bytesWritten += chunk.length;

        if (state.onChunk != null) {
            const result = state.onChunk(chunk);
            if (result instanceof Promise) {
                await result;
            }
        }

        if (state.collectOutput == true) {
            state.outputChunks.push(chunk);
        }

    }

    /**
     * Emit bytes honoring chunk-size splitting when configured.
     * @param {object} state The current write-state.
     * @param {Uint8Array} bytes The bytes to emit.
     */
    async emitBytes(state, bytes) {

        if ((bytes == null) || (bytes.length == 0))
            return;

        if ((state.chunkSize == null) || (state.chunkSize <= 0)) {
            await this.emit(state, bytes);
            return;
        }

        for (var offset = 0; offset < bytes.length; offset += state.chunkSize) {
            await this.emit(state, bytes.subarray(offset, Math.min(bytes.length, offset + state.chunkSize)));
        }

    }

    /**
     * Combine collected chunks into one contiguous array.
     * @param {object} state The current write-state.
     * @returns {Uint8Array} The combined bytes.
     */
    toOutputBytes(state) {

        if (state.outputChunks.length == 0)
            return new Uint8Array(0);

        if (state.outputChunks.length == 1)
            return state.outputChunks[0];

        var output = new Uint8Array(state.bytesWritten);
        var offset = 0;

        for (var i = 0; i < state.outputChunks.length; i++) {
            output.set(state.outputChunks[i], offset);
            offset += state.outputChunks[i].length;
        }

        return output;

    }

    /**
     * Build a normalized result object.
     * @param {object} state The current write-state.
     * @param {boolean} isMultiPart Whether this write emitted multipart bytes.
     * @param {string} contentType The output content-type.
     * @param {string | null} boundary The multipart boundary, if any.
     * @param {number} partCount The count of emitted parts.
     * @returns {object} The write result.
     */
    buildResult(state, isMultiPart, contentType, boundary = null, partCount = 1) {

        return {
            isMultiPart: (isMultiPart == true),
            contentType: contentType,
            boundary: boundary,
            partCount: partCount,
            bytesWritten: state.bytesWritten,
            body: (state.collectOutput == true) ? this.toOutputBytes(state) : null
        };

    }

    /**
     * Normalize one multipart part description.
     * @param {Uint8Array | object} part The part source.
     * @returns {{ data: Uint8Array, headers: object }} The normalized part.
     */
    normalizePart(part) {

        if (part == null)
            throw new Exception("Invalid multipart part. Expected bytes or { data, headers }.", GeneralErrorCodes.InvalidParameter);

        if ((typeof part === 'object') && (part.data != null)) {
            return {
                data: this.toBytes(part.data),
                headers: Object.assign({}, part.headers || {})
            };
        }

        return {
            data: this.toBytes(part),
            headers: {}
        };

    }

    /**
     * Serialize multipart part headers to bytes.
     * @param {object} headers The part header map.
     * @returns {Uint8Array} The serialized header bytes.
     */
    serializePartHeaders(headers) {

        var lines = Object.entries(headers).map((entry) => entry[0] + ": " + entry[1]);
        var text = ((lines.length > 0) ? (lines.join("\r\n")) : "") + "\r\n\r\n";

        return this.encodeText(text);

    }

    /**
     * Build a multipart/related content-type value.
     * @param {string} boundary The multipart boundary.
     * @param {object | null} options Multipart options.
     * @returns {string} The content-type value.
     */
    buildMultiPartContentType(boundary, options = null) {

        if (options == null) {
            options = {};
        }

        var type = (options.type != null) ? String(options.type) : "application/dicom";

        var contentType = "multipart/related; type=\"" + type + "\"; boundary=" + boundary;

        if (options.transferSyntax != null) {
            contentType += "; transfer-syntax=" + options.transferSyntax;
        }

        if (options.start != null) {
            contentType += "; start=\"" + options.start + "\"";
        }

        if (options.startInfo != null) {
            contentType += "; start-info=\"" + options.startInfo + "\"";
        }

        return contentType;

    }

    /**
     * Write a single-part payload.
     * @param {Uint8Array | ArrayBuffer | DataView | Array<number>} data The data to emit.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async writeSinglePart(data, options = null) {

        var bytes = this.toBytes(data);
        var state = this.createWriteState(options);

        await this.emitBytes(state, bytes);

        var contentType = (options?.contentType != null)
            ? String(options.contentType)
            : "application/dicom";

        this.lastBoundary = null;
        this.lastContentType = contentType;

        return this.buildResult(state, false, contentType, null, 1);

    }

    /**
     * Write a multipart/related payload.
     * @param {Array<Uint8Array | object>} parts The part list to emit.
     * @param {object | null} options Optional multipart write options.
     * @returns {Promise<object>} The write result.
     */
    async writeMultiPart(parts, options = null) {

        if (Array.isArray(parts) == false)
            throw new Exception("Invalid multipart source. Expected an array of parts.", GeneralErrorCodes.InvalidParameter);

        if (options == null) {
            options = {};
        }

        var boundary = (options.boundary != null)
            ? String(options.boundary)
            : this.createBoundary();

        var contentType = this.buildMultiPartContentType(boundary, options);
        var partContentType = (options.partContentType != null)
            ? String(options.partContentType)
            : "application/dicom";

        var state = this.createWriteState(options);

        for (var i = 0; i < parts.length; i++) {

            var part = this.normalizePart(parts[i]);
            var headers = Object.assign({}, options.partHeaders || {}, part.headers || {});

            this.setDefaultHeader(headers, "Content-Type", partContentType);
            if (options.includeContentLength == true) {
                this.setDefaultHeader(headers, "Content-Length", String(part.data.length));
            }

            await this.emit(state, this.encodeText("--" + boundary + "\r\n"));
            await this.emit(state, this.serializePartHeaders(headers));
            await this.emitBytes(state, part.data);
            await this.emit(state, this.encodeText("\r\n"));

        }

        await this.emit(state, this.encodeText("--" + boundary + "--\r\n"));

        this.lastBoundary = boundary;
        this.lastContentType = contentType;

        return this.buildResult(state, true, contentType, boundary, parts.length);

    }

    /**
     * Write one payload, automatically selecting single-part versus multipart.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async write(source, options = null) {

        var isMultiPart = (options?.isMultiPart == true);

        if ((isMultiPart == false) && Array.isArray(source)) {
            isMultiPart = ((source.length == 0) || this.isPartDescriptor(source[0]));
        }

        if (isMultiPart == true)
            return this.writeMultiPart(source, options);

        return this.writeSinglePart(source, options);

    }

    /**
     * Create a streaming writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     */
    constructor(options = null) {

        if (options == null) {
            options = {};
        }

        this.onChunk = options.onChunk || null;
        this.collectOutput = options.collectOutput;
        this.chunkSize = options.chunkSize || 0;

        this.lastContentType = null;
        this.lastBoundary = null;

    }

};
