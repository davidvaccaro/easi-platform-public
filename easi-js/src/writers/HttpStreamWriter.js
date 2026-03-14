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
     * Write one payload to an HTTP endpoint.
     * @param {string | object} request The request URL or request descriptor.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async write(request, source, options = null) {

        var normalized = this.normalizeRequest(request);
        var requestOptions = normalized.options;
        var requestHeaders = this.normalizeHeaders(requestOptions.headers || null);

        var writerOptions = Object.assign({}, options || {}, {
            collectOutput: true
        });

        var writeResult = await this._partWriter.write(source, writerOptions);
        var body = writeResult.body || new Uint8Array(0);

        if ((writeResult.contentType != null) && (this.hasHeader(requestHeaders, 'Content-Type') == false)) {
            requestHeaders['Content-Type'] = writeResult.contentType;
        }

        if ((body != null) && (this.hasHeader(requestHeaders, 'Content-Length') == false)) {
            requestHeaders['Content-Length'] = String(body.length);
        }

        var response = await fetch(normalized.url, Object.assign({
            method: 'POST',
            headers: requestHeaders,
            body: body
        }, requestOptions, {
            headers: requestHeaders
        }));

        return {
            request: normalized.url,
            response: response,
            status: (response != null) ? response.status : null,
            ok: (response != null) ? response.ok : false,
            bytesWritten: writeResult.bytesWritten,
            contentType: writeResult.contentType,
            body: body
        };

    }

    /**
     * Create one HTTP stream writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     */
    constructor(options = null) {
        this._partWriter = new PartStreamWriter(options);
    }

}

