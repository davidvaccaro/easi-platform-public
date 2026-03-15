//
// HttpStreamWriter.js - 1.0.0
//
// HttpStreamWriter Class
//

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';
import PartStreamWriter from './PartStreamWriter.js';

export default class HttpStreamWriter {

    /**
     * Normalize request input.
     * @param {string | object} request The request URL or request descriptor.
     * @returns {{ url: string, options: object }} Normalized request info.
     */
    normalizeRequest(request) {

        if (typeof request === 'string') {
            if (request.length === 0) {
                throw new Exception('Invalid HTTP request URL.', GeneralErrorCodes.InvalidParameter);
            }

            return {
                url: request,
                options: {}
            };
        }

        if ((request != null) && (typeof request === 'object')) {

            const url = request.url || request.href || null;
            if ((typeof url !== 'string') || (url.length === 0)) {
                throw new Exception('Invalid HTTP request URL.', GeneralErrorCodes.InvalidParameter);
            }

            var options = Object.assign({}, request);
            delete options.url;
            delete options.href;

            return {
                url: url,
                options: options
            };

        }

        throw new Exception('Invalid HTTP request target.', GeneralErrorCodes.InvalidParameter);

    }

    /**
     * Convert Headers-like input into a plain header object.
     * @param {object | Headers | null} headers The source headers.
     * @returns {object} The normalized headers object.
     */
    normalizeHeaders(headers) {

        if (headers == null) {
            return {};
        }

        if ((typeof Headers !== 'undefined') && (headers instanceof Headers)) {
            return Object.fromEntries(headers.entries());
        }

        return Object.assign({}, headers);

    }

    /**
     * Determine if one header exists using case-insensitive matching.
     * @param {object} headers The header map.
     * @param {string} name The header name.
     * @returns {boolean} TRUE when the header exists.
     */
    hasHeader(headers, name) {

        var lowerName = String(name).toLowerCase();
        return Object.keys(headers).some((key) => String(key).toLowerCase() == lowerName);

    }

    /**
     * Determine whether true streaming upload is supported in the current runtime.
     * @returns {boolean} TRUE when ReadableStream upload can be attempted.
     */
    supportsStreamingUpload() {
        return ((typeof ReadableStream !== 'undefined') && (typeof fetch === 'function'));
    }

    /**
     * Determine if the source should be emitted as multipart.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object | null} writerOptions Writer options.
     * @returns {boolean} TRUE when multipart output should be emitted.
     */
    isMultiPartSource(source, writerOptions = null) {

        if (writerOptions?.isMultiPart == true)
            return true;

        if (Array.isArray(source) == false)
            return false;

        return ((source.length == 0) || (this._partWriter.isPartDescriptor(source[0]) == true));

    }

    /**
     * Prepare writer options and infer output content-type before writing.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object | null} options Optional write options.
     * @returns {{ writerOptions: object, inferredContentType: string }} Prepared options and inferred content-type.
     */
    prepareWriterOptions(source, options = null) {

        var writerOptions = Object.assign({}, options || {});
        var inferredContentType = null;

        if (this.isMultiPartSource(source, writerOptions) == true) {

            if (writerOptions.boundary == null) {
                writerOptions.boundary = this._partWriter.createBoundary();
            }

            inferredContentType = this._partWriter.buildMultiPartContentType(
                writerOptions.boundary,
                writerOptions
            );

            return {
                writerOptions: writerOptions,
                inferredContentType: inferredContentType
            };

        }

        inferredContentType = (writerOptions.contentType != null)
            ? String(writerOptions.contentType)
            : 'application/dicom';

        return {
            writerOptions: writerOptions,
            inferredContentType: inferredContentType
        };

    }

    /**
     * Create a ReadableStream upload body sourced from part-writer chunk callbacks.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object} writerOptions Writer options.
     * @param {Function | null} existingOnChunk Existing chunk callback.
     * @returns {{ body: ReadableStream, writePromise: Promise<object> }} Streaming body and write completion promise.
     */
    createStreamingBody(source, writerOptions, existingOnChunk = null) {

        var resolveWrite = null;
        var rejectWrite = null;
        var writePromise = new Promise((resolve, reject) => {
            resolveWrite = resolve;
            rejectWrite = reject;
        });

        var body = new ReadableStream({
            start: async (controller) => {
                try {

                    var streamResult = await this._partWriter.write(source, Object.assign({}, writerOptions, {
                        collectOutput: false,
                        onChunk: async (chunk) => {
                            controller.enqueue(chunk);
                            if (existingOnChunk != null) {
                                await existingOnChunk(chunk);
                            }
                        }
                    }));

                    controller.close();
                    resolveWrite(streamResult);

                }
                catch (error) {

                    try {
                        controller.error(error);
                    }
                    catch (ignoreError) {
                    }

                    rejectWrite(error);

                }
            }
        });

        return {
            body: body,
            writePromise: writePromise
        };

    }

    /**
     * Write one payload using true streaming request body upload.
     * @param {string} url The request URL.
     * @param {object} requestOptions Request options.
     * @param {object} requestHeaders Request headers.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object} writerOptions Writer options.
     * @param {string | null} inferredContentType Inferred content-type.
     * @returns {Promise<object>} The write result.
     */
    async writeStreaming(url, requestOptions, requestHeaders, source, writerOptions, inferredContentType = null) {

        var existingOnChunk = writerOptions.onChunk ?? null;
        var streaming = this.createStreamingBody(source, writerOptions, existingOnChunk);

        var fetchOptions = Object.assign({
            method: 'POST',
            headers: requestHeaders,
            body: streaming.body
        }, requestOptions, {
            headers: requestHeaders
        });

        // Node.js fetch currently requires duplex=half when body is a stream.
        if (fetchOptions.duplex == null) {
            fetchOptions.duplex = 'half';
        }

        var response = await fetch(url, fetchOptions);
        var writeResult = await streaming.writePromise;

        return {
            request: url,
            response: response,
            status: (response != null) ? response.status : null,
            ok: (response != null) ? response.ok : false,
            bytesWritten: writeResult.bytesWritten,
            contentType: writeResult.contentType ?? inferredContentType,
            body: writeResult.body ?? null
        };

    }

    /**
     * Write one payload using buffered request body upload.
     * @param {string} url The request URL.
     * @param {object} requestOptions Request options.
     * @param {object} requestHeaders Request headers.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object} writerOptions Writer options.
     * @returns {Promise<object>} The write result.
     */
    async writeBuffered(url, requestOptions, requestHeaders, source, writerOptions) {

        var writeResult = await this._partWriter.write(source, Object.assign({}, writerOptions, {
            collectOutput: true
        }));

        var body = writeResult.body || new Uint8Array(0);

        if ((body != null) && (this.hasHeader(requestHeaders, 'Content-Length') == false)) {
            requestHeaders['Content-Length'] = String(body.length);
        }

        var response = await fetch(url, Object.assign({
            method: 'POST',
            headers: requestHeaders,
            body: body
        }, requestOptions, {
            headers: requestHeaders
        }));

        return {
            request: url,
            response: response,
            status: (response != null) ? response.status : null,
            ok: (response != null) ? response.ok : false,
            bytesWritten: writeResult.bytesWritten,
            contentType: writeResult.contentType,
            body: body
        };

    }

    /**
     * Write one payload to an HTTP endpoint.
     * @param {string | object} request The request URL or request descriptor.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {{ stream?: boolean } | object | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async write(request, source, options = null) {

        var normalized = this.normalizeRequest(request);
        var requestOptions = normalized.options;
        var requestHeaders = this.normalizeHeaders(requestOptions.headers || null);
        var prepared = this.prepareWriterOptions(source, options);
        var writerOptions = prepared.writerOptions;
        var inferredContentType = prepared.inferredContentType;

        if ((inferredContentType != null) && (this.hasHeader(requestHeaders, 'Content-Type') == false)) {
            requestHeaders['Content-Type'] = inferredContentType;
        }

        var useStreaming = ((options?.stream !== false) && (this.supportsStreamingUpload() == true));
        if (useStreaming == true) {
            return this.writeStreaming(
                normalized.url,
                requestOptions,
                requestHeaders,
                source,
                writerOptions,
                inferredContentType
            );
        }

        return this.writeBuffered(
            normalized.url,
            requestOptions,
            requestHeaders,
            source,
            writerOptions
        );

    }

    /**
     * Create one HTTP stream writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     */
    constructor(options = null) {
        this._partWriter = new PartStreamWriter(options);
    }

}
