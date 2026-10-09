//
// PartStreamReader.js
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

import { Status } from '../parsers/Status.js';

import PartContentType from './parts/PartContentType.js';
import MultipartDemuxer from './parts/MultipartDemuxer.js';

export default class PartStreamReader {

    /**
     * Parse the content-type from a response/header source.
     * @param {Response | Headers | string | object | null} source The source containing the content-type header.
     * @returns {object} Parsed content-type metadata.
     */
    parseContentType(source) {
        return PartContentType.parse(source);
    }

    /**
     * Normalize one value to bytes.
     * @param {Uint8Array | ArrayBuffer | DataView | Array<number>} value The source value.
     * @returns {Uint8Array} Normalized bytes.
     */
    toBytes(value) {

        if (value == null)
            throw new Exception('Invalid source data. Expected bytes.', GeneralErrorCodes.InvalidParameter);

        if (value instanceof Uint8Array)
            return value;

        if (value instanceof ArrayBuffer)
            return new Uint8Array(value);

        if (ArrayBuffer.isView(value))
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

        if (Array.isArray(value))
            return Uint8Array.from(value);

        throw new Exception('Invalid source data. Expected bytes.', GeneralErrorCodes.InvalidParameter);

    }

    /**
     * Normalize stream source to ReadableStream reader.
     * @param {ReadableStream | ReadableStreamDefaultReader} source The stream source.
     * @returns {ReadableStreamDefaultReader<Uint8Array>} The stream reader.
     */
    toStreamReader(source) {

        if ((source != null) && (typeof source.getReader === 'function')) {
            var reader = source.getReader();
            this._ownedReaders.add(reader);
            return reader;
        }

        if ((source != null) && (typeof source.read === 'function')) {
            return source;
        }

        throw new Exception('Invalid stream source. Expected ReadableStream or stream reader.', GeneralErrorCodes.InvalidParameter);

    }

    /**
     * Close unread input acquired by this reader and release its lock.
     * Caller-supplied readers retain ownership of their unread input.
     */
    async _releaseStreamReader(reader, exhausted, failed, error) {

        var owned = this._ownedReaders.delete(reader);
        var cleanupFailed = false;
        var cleanupError;

        try {
            if ((owned === true) && (exhausted !== true) && (typeof reader.cancel === 'function')) {
                await reader.cancel(error);
            }
        }
        catch (err) {
            cleanupFailed = true;
            cleanupError = err;
        }

        try {
            if ((reader != null) && (typeof reader.releaseLock === 'function')) {
                reader.releaseLock();
            }
        }
        catch (err) {
            if (cleanupFailed === false) {
                cleanupFailed = true;
                cleanupError = err;
            }
        }

        if ((failed === false) && (cleanupFailed === true)) {
            throw cleanupError;
        }

    }

    /**
     * Resolve effective emission callback for one read transaction.
     * Priority:
     * 1. Per-read options.onEmit when explicitly provided (including null to disable).
     * 2. Reader-level internal onPart callback configured via builder.
     * @param {object | null} options Read options.
     * @returns {Function | null} Effective emission callback.
     */
    resolveOnEmit(options = null) {

        if ((options == null) || (typeof options !== 'object')) {
            return this.onPart;
        }

        if (Object.prototype.hasOwnProperty.call(options, 'onEmit') == false) {
            return this.onPart;
        }

        var onEmit = options.onEmit;

        if ((onEmit != null) && (typeof onEmit !== 'function')) {
            throw new Exception('Invalid "onEmit" option. Expected function or null.', GeneralErrorCodes.InvalidParameter);
        }

        return onEmit;

    }

    /**
     * Emit one parsed result through the active emission callback.
     * @param {*} result The parsed result.
     * @param {Function | null} onEmit The emission callback.
     */
    async emitResult(result, onEmit = null) {

        if (onEmit == null)
            return;

        var emitStatus = await onEmit(result);
        if (emitStatus === Status.FAIL) {
            throw new Exception('Failed processing emitted result.', GeneralErrorCodes.GeneralError);
        }

    }

    /**
     * Parse one single-part stream.
     * @param {ReadableStreamDefaultReader<Uint8Array>} reader The source reader.
     * @param {object} contentType Parsed content-type metadata.
     * @param {number | string | null} contentLength Optional content length.
     * @param {Function | null} onEmit Effective emission callback for this read transaction.
     * @returns {Promise<object>} The parser result.
     */
    async processSinglePart(reader, contentType, contentLength, onEmit = null) {

        var status = Status.CONTINUE;
        var contentRead = 0;
        var exhausted = false;
        var failed = false;
        var error;

        try {

            this._parser.reset();

            while (status === Status.CONTINUE) {

                const { done, value } = await reader.read();
                exhausted = (done === true);
                contentRead += ((value != null) ? value.length : 0);

                status = await this._parser.parse(value, done, contentRead, contentLength, contentType);

                if (done === true)
                    break;

            }

            if ((status === Status.SUCCESS) || (status === Status.STOP) || (status === Status.JUMP)) {
                var result = this._parser.result;
                await this.emitResult(result, onEmit);
                return result;
            }

            if (this._parser.error != null)
                throw this._parser.error;

            throw new Exception('Failed parsing single DICOM data-set.', GeneralErrorCodes.GeneralError);

        }
        catch (err) {
            failed = true;
            error = err;
            throw err;
        }
        finally {
            await this._releaseStreamReader(reader, exhausted, failed, error);
        }

    }

    /**
     * Parse one multipart stream.
     * @param {ReadableStreamDefaultReader<Uint8Array>} reader The source reader.
     * @param {object} contentType Parsed content-type metadata.
     * @param {number | string | null} contentLength Optional content length.
     * @param {Function | null} onEmit Effective emission callback for this read transaction.
     * @returns {Promise<object>} The parser result.
     */
    async processMultiPart(reader, contentType, contentLength, onEmit = null) {

        var status = Status.CONTINUE;
        var contentRead = 0;
        var exhausted = false;
        var failed = false;
        var error;
        var skipCurrentPart = false;
        var skipNextPart = false;
        var partFinalized = false;
        var lastResult = null;

        try {

            if ((contentType == null) || (contentType.boundary == null) || (contentType.boundary.length === 0)) {
                throw new Exception('Invalid multipart stream. Missing boundary parameter.', GeneralErrorCodes.InvalidParameter);
            }

            this._parser.reset();

            var parsePartData = async (bytes, isFinalChunk) => {

                if ((status === Status.FAIL) || (status === Status.STOP))
                    return;

                if (skipCurrentPart === true)
                    return;

                if (isFinalChunk === true)
                    partFinalized = true;

                var parseStatus = await this._parser.parse(bytes, isFinalChunk, contentRead, contentLength, contentType);

                if (parseStatus === Status.FAIL) {
                    status = Status.FAIL;
                    if (this._parser.error != null)
                        throw this._parser.error;
                    throw new Exception('Failed parsing multiple DICOM data-sets.', GeneralErrorCodes.GeneralError);
                }

                if (parseStatus === Status.SUCCESS) {
                    lastResult = this._parser.result;
                }

                if (parseStatus === Status.STOP) {
                    status = Status.STOP;
                    return;
                }

                if (parseStatus === Status.JUMP) {
                    skipCurrentPart = true;
                    status = Status.CONTINUE;
                    return;
                }

                status = parseStatus;

            };

            var demuxer = new MultipartDemuxer(contentType.boundary, {

                onPartStart: async () => {

                    if ((status === Status.FAIL) || (status === Status.STOP))
                        return;

                    skipCurrentPart = (skipNextPart === true);
                    skipNextPart = false;
                    partFinalized = false;

                    if (skipCurrentPart === true) {
                        this._parser.reset();
                    }

                },

                onPartData: parsePartData,

                onPartEnd: async () => {

                    // A split boundary can arrive after all part bytes have been flushed.
                    if ((status === Status.CONTINUE) && (skipCurrentPart === false) && (partFinalized === false)) {
                        await parsePartData(null, true);
                    }

                    if ((status === Status.FAIL) || (status === Status.STOP))
                        return;

                    if (skipCurrentPart === true) {
                        this._parser.reset();
                        skipCurrentPart = false;
                        status = Status.CONTINUE;
                        return;
                    }

                    if (status === Status.SUCCESS) {

                        var partResult = this._parser.result;
                        this._parser.reset();

                        if (onEmit != null) {

                            var partStatus = await onEmit(partResult);

                            if (partStatus === Status.STOP) {
                                status = Status.STOP;
                                return;
                            }

                            if (partStatus === Status.FAIL) {
                                status = Status.FAIL;
                                throw new Exception('Failed parsing multiple DICOM data-sets.', GeneralErrorCodes.GeneralError);
                            }

                            if (partStatus === Status.JUMP) {
                                skipNextPart = true;
                                status = Status.CONTINUE;
                                return;
                            }

                        }

                        status = Status.CONTINUE;
                        return;

                    }

                    if (status !== Status.CONTINUE)
                        return;

                    throw new Exception('Failed parsing multiple DICOM data-sets.', GeneralErrorCodes.GeneralError);

                }

            });

            while ((status === Status.CONTINUE) || (status === Status.JUMP)) {

                const { done, value } = await reader.read();
                exhausted = (done === true);
                contentRead += ((value != null) ? value.length : 0);

                try {
                    await demuxer.push(value, done === true);
                }
                catch (err) {
                    // STOP completes the requested parse before the remaining envelope.
                    if (status !== Status.STOP)
                        throw err;
                }

                if ((done === true) || (status === Status.STOP) || (status === Status.FAIL))
                    break;

            }

            if (status === Status.FAIL) {
                if (this._parser.error != null)
                    throw this._parser.error;
                throw new Exception('Failed parsing multiple DICOM data-sets.', GeneralErrorCodes.GeneralError);
            }

            if ((status === Status.SUCCESS) || (status === Status.STOP) || (status === Status.JUMP) || (status === Status.CONTINUE)) {
                return (lastResult != null) ? lastResult : this._parser.result;
            }

            throw new Exception('Failed parsing multiple DICOM data-sets.', GeneralErrorCodes.GeneralError);

        }
        catch (err) {
            failed = true;
            error = err;
            throw err;
        }
        finally {
            await this._releaseStreamReader(reader, exhausted, failed, error);
        }

    }

    /**
     * Read and parse one stream source.
     * @param {ReadableStream | ReadableStreamDefaultReader<Uint8Array>} source The source stream.
     * @param {{ contentType?: Response | Headers | string | object, contentLength?: number | string | null, onEmit?: Function | null } | null} streamOptions Optional stream metadata.
     * @returns {Promise<object>} The parser result.
     */
    async readStream(source, streamOptions = null) {

        var reader;
        var onEmit;
        var contentType;
        var contentLength = null;

        try {

            onEmit = this.resolveOnEmit(streamOptions);

            // Reset parser transaction state for this top-level read.
            if ((this._parser != null) && (typeof this._parser.resetSession === "function")) {
                this._parser.resetSession();
            }

            var contentTypeSource = null;

            if (streamOptions != null) {
                contentTypeSource = ((streamOptions.contentType != null) ? streamOptions.contentType : streamOptions);
                contentLength = ((streamOptions.contentLength != null) ? streamOptions.contentLength : null);
            }

            contentType = this.parseContentType(contentTypeSource);
            reader = this.toStreamReader(source);

        }
        catch (error) {

            // Streams supplied to readStream are owned even before a lock is acquired.
            if ((source != null) && (typeof source.getReader === 'function') && (typeof source.cancel === 'function')) {
                try {
                    await source.cancel(error);
                }
                catch (_) {
                    // Preserve the transaction error if cleanup fails.
                }
            }

            throw error;
        }

        if (contentType.isMultiPart === true)
            return this.processMultiPart(reader, contentType, contentLength, onEmit);

        return this.processSinglePart(reader, contentType, contentLength, onEmit);

    }

    /**
     * Read and parse one byte source as a single-part payload.
     * @param {Uint8Array | ArrayBuffer | DataView | Array<number>} data The source data.
     * @param {{ onEmit?: Function | null } | null} readOptions Optional read options.
     * @returns {Promise<object>} The parser result.
     */
    async readData(data, readOptions = null) {

        var status = Status.CONTINUE;
        var onEmit = this.resolveOnEmit(readOptions);

        try {

            // Reset parser transaction state for this top-level read.
            if ((this._parser != null) && (typeof this._parser.resetSession === "function")) {
                this._parser.resetSession();
            }

            this._parser.reset();
            status = await this._parser.parse(this.toBytes(data), true);

            if ((status === Status.SUCCESS) || (status === Status.STOP) || (status === Status.JUMP)) {
                var result = this._parser.result;
                await this.emitResult(result, onEmit);
                return result;
            }

            if (this._parser.error != null)
                throw this._parser.error;

            throw new Exception('Failed parsing single DICOM data-set.', GeneralErrorCodes.GeneralError);

        }
        catch (err) {
            throw err;
        }

    }

    /**
     * Read and parse one source.
     * @param {ReadableStream | ReadableStreamDefaultReader<Uint8Array> | Uint8Array | ArrayBuffer | DataView | Array<number>} source The source data.
     * @param {{ contentType?: Response | Headers | string | object, contentLength?: number | string | null, onEmit?: Function | null } | null} options Stream metadata options for stream sources.
     * @returns {Promise<object>} The parser result.
     */
    read(source, options = null) {

        if (typeof source === 'string') {
            throw new Exception('Invalid source data. Use HttpStreamReader for URL sources.', GeneralErrorCodes.InvalidParameter);
        }

        if ((source != null) && ((typeof source.getReader === 'function') || (typeof source.read === 'function'))) {
            return this.readStream(source, options);
        }

        return this.readData(source, options);

    }

    /**
     * Sets the current parser for this reader.
     * @param {DataParser} parser The parser used to parse source bytes.
     */
    set parser(parser) {
        this._parser = parser;
    }

    /**
     * Gets the current parser for this reader.
     * @returns {DataParser} The parser used to parse source bytes.
     */
    get parser() {
        return this._parser;
    }

    /**
     * Sets the "onPart" option for the stream-read session.
     * @param {Function | null} onPart The onPart callback.
     */
    set onPart(onPart) {
        this._onPart = onPart;
    }

    /**
     * Gets the "onPart" option for the stream-read session.
     * @returns {Function | null} The onPart callback.
     */
    get onPart() {
        return this._onPart;
    }

    /**
     * Create one reader instance.
     */
    constructor() {
        this._parser = null;
        this._onPart = null;
        this._ownedReaders = new WeakSet();
    }

};
