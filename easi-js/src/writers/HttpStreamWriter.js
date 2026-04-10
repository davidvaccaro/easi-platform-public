//
// HttpStreamWriter.js
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
import PartStreamWriter from './PartStreamWriter.js';

export default class HttpStreamWriter {

    /**
     * Normalize STOW-RS options.
     * @param {object | null} options Optional write options.
     * @returns {object | null} Normalized STOW-RS options or null when disabled.
     */
    normalizeStowOptions(options = null) {

        var stowOptions = options?.stow;
        if ((stowOptions == null) || (stowOptions === false))
            return null;

        if (stowOptions === true) {
            stowOptions = {};
        }
        else if (typeof stowOptions !== 'object') {
            throw new Exception(
                'Invalid STOW options. Expected true, false, null, or object.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        var normalized = Object.assign({
            strict: true,
            requirePostMethod: true,
            enforceMultipart: true,
            requestType: 'application/dicom',
            partContentType: 'application/dicom',
            accept: 'application/dicom+json, application/json',
            enforceSuccessfulStatus: true,
            allowedStatuses: [200, 202]
        }, stowOptions || {});

        if (Array.isArray(normalized.allowedStatuses) == false) {
            throw new Exception(
                'Invalid STOW options.allowedStatuses. Expected array of HTTP status codes.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        normalized.allowedStatuses = normalized.allowedStatuses
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value));

        if (normalized.allowedStatuses.length == 0) {
            throw new Exception(
                'Invalid STOW options.allowedStatuses. Expected at least one HTTP status code.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        return normalized;

    }

    /**
     * Get one header value by case-insensitive name.
     * @param {object} headers The header map.
     * @param {string} name Header name.
     * @returns {string | null} Header value or null.
     */
    getHeaderValue(headers, name) {

        var lowerName = String(name).toLowerCase();
        var match = Object.keys(headers).find((key) => String(key).toLowerCase() == lowerName);
        if (match == null)
            return null;

        return String(headers[match]);

    }

    /**
     * Validate one explicit STOW-RS request content-type header in strict mode.
     * @param {string} contentType Header value.
     * @param {object} stowOptions STOW options.
     */
    validateExplicitStowContentType(contentType, stowOptions) {

        if (stowOptions?.strict !== true)
            return;

        var normalized = String(contentType || '').toLowerCase();
        var expectsType = String(stowOptions.requestType || 'application/dicom').toLowerCase();

        if (normalized.indexOf('multipart/related') != 0) {
            throw new Exception(
                'Invalid STOW request content-type. Expected multipart/related.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        if (normalized.indexOf('type="' + expectsType + '"') < 0
            && normalized.indexOf('type=' + expectsType) < 0) {
            throw new Exception(
                `Invalid STOW request content-type. Expected type=${expectsType}.`,
                GeneralErrorCodes.InvalidParameter
            );
        }

    }

    /**
     * Apply STOW-safe defaults and validation to request and writer options.
     * @param {object} requestOptions Request options.
     * @param {object} requestHeaders Request headers.
     * @param {object} writerOptions Writer options.
     * @param {object | null} stowOptions STOW options.
     */
    applyStowOptions(requestOptions, requestHeaders, writerOptions, stowOptions = null) {

        if (stowOptions == null)
            return;

        if (stowOptions.enforceMultipart === true) {
            writerOptions.isMultiPart = true;
            if (writerOptions.type == null) {
                writerOptions.type = stowOptions.requestType;
            }
            if (writerOptions.partContentType == null) {
                writerOptions.partContentType = stowOptions.partContentType;
            }
        }

        if (stowOptions.requirePostMethod === true) {

            var explicitMethod = (requestOptions.method != null)
                ? String(requestOptions.method).toUpperCase()
                : null;

            if ((stowOptions.strict === true) && (explicitMethod != null) && (explicitMethod != 'POST')) {
                throw new Exception(
                    'Invalid STOW request method. Expected POST.',
                    GeneralErrorCodes.InvalidParameter
                );
            }

            requestOptions.method = 'POST';

        }

        if ((stowOptions.accept != null) && (this.hasHeader(requestHeaders, 'Accept') == false)) {
            requestHeaders.Accept = String(stowOptions.accept);
        }

        var explicitContentType = this.getHeaderValue(requestHeaders, 'Content-Type');
        if (explicitContentType != null) {
            this.validateExplicitStowContentType(explicitContentType, stowOptions);
        }

    }

    /**
     * Normalize source payload shape for multipart requests.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object} writerOptions Writer options.
     * @returns {Uint8Array | Array<unknown> | object} Normalized source.
     */
    normalizeSource(source, writerOptions = {}) {

        if ((writerOptions?.isMultiPart === true) && (Array.isArray(source) == false)) {
            return [source];
        }

        return source;

    }

    /**
     * Validate STOW response status in strict mode.
     * @param {object | null} response Fetch response.
     * @param {object | null} stowOptions STOW options.
     */
    validateStowResponse(response, stowOptions = null) {

        if (stowOptions == null)
            return;

        if (stowOptions.enforceSuccessfulStatus !== true)
            return;

        var status = Number(response?.status);
        if (stowOptions.allowedStatuses.includes(status) == true)
            return;

        throw new Exception(
            `STOW request failed with HTTP status ${status}.`,
            GeneralErrorCodes.GeneralError
        );

    }

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
    async writeStreaming(url, requestOptions, requestHeaders, source, writerOptions, inferredContentType = null, stowOptions = null) {

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
        this.validateStowResponse(response, stowOptions);
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
    async writeBuffered(url, requestOptions, requestHeaders, source, writerOptions, stowOptions = null) {

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
        this.validateStowResponse(response, stowOptions);

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
     * @param {{ stream?: boolean, stow?: boolean | object } | object | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async write(request, source, options = null) {

        var normalized = this.normalizeRequest(request);
        var requestOptions = Object.assign({}, normalized.options || {});
        var requestHeaders = this.normalizeHeaders(requestOptions.headers || null);
        var prepared = this.prepareWriterOptions(source, options);
        var writerOptions = prepared.writerOptions;
        var inferredContentType = prepared.inferredContentType;
        var stowOptions = this.normalizeStowOptions(options);

        this.applyStowOptions(requestOptions, requestHeaders, writerOptions, stowOptions);
        var normalizedSource = this.normalizeSource(source, writerOptions);

        if (this.isMultiPartSource(normalizedSource, writerOptions) == true) {
            if (writerOptions.boundary == null) {
                writerOptions.boundary = this._partWriter.createBoundary();
            }

            inferredContentType = this._partWriter.buildMultiPartContentType(
                writerOptions.boundary,
                writerOptions
            );
        }
        else {
            inferredContentType = (writerOptions.contentType != null)
                ? String(writerOptions.contentType)
                : 'application/dicom';
        }

        if ((inferredContentType != null) && (this.hasHeader(requestHeaders, 'Content-Type') == false)) {
            requestHeaders['Content-Type'] = inferredContentType;
        }

        var useStreaming = ((options?.stream !== false) && (this.supportsStreamingUpload() == true));
        if (useStreaming == true) {
            return this.writeStreaming(
                normalized.url,
                requestOptions,
                requestHeaders,
                normalizedSource,
                writerOptions,
                inferredContentType,
                stowOptions
            );
        }

        return this.writeBuffered(
            normalized.url,
            requestOptions,
            requestHeaders,
            normalizedSource,
            writerOptions,
            stowOptions
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
