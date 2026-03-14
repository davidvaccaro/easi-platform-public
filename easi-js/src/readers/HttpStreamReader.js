//
// HttpStreamReader.js - 1.0.0
//
// HttpStreamReader Class
//

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';
import PartStreamReader from './PartStreamReader.js';
import PartContentType from './parts/PartContentType.js';

export default class HttpStreamReader {

    /**
     * Read and parse one URL source via HTTP (fetch) transport.
     * @param {string} url The source URL.
     * @param {(RequestInit & { onEmit?: Function | null }) | null} requestOptions Optional request options.
     * @returns {Promise<object>} The parser result.
     */
    async readUrl(url, requestOptions = null) {

        if ((url == null) || (typeof url !== 'string') || (url.length === 0)) {
            throw new Exception('Invalid source URL.', GeneralErrorCodes.InvalidParameter);
        }

        var httpOptions = Object.assign({}, (requestOptions != null) ? requestOptions : {});
        var hasOnEmit = (Object.prototype.hasOwnProperty.call(httpOptions, 'onEmit') == true);
        var onEmit = hasOnEmit ? httpOptions.onEmit : undefined;

        if (hasOnEmit == true) {
            delete httpOptions.onEmit;
        }

        var response = await fetch(url, Object.assign({
            method: 'GET'
        }, httpOptions));

        if ((response == null) || (response.body == null)) {
            throw new Exception('Invalid HTTP response. Missing response body stream.', GeneralErrorCodes.GeneralError);
        }

        var streamOptions = {
            contentType: PartContentType.parse(response),
            contentLength: (response.headers != null) ? response.headers.get('content-length') : null
        };

        if (hasOnEmit == true) {
            streamOptions.onEmit = onEmit;
        }

        return this._partReader.readStream(response.body, streamOptions);

    }

    /**
     * Read and parse one source, routing URL sources through HTTP transport.
     * @param {string | ReadableStream | ReadableStreamDefaultReader<Uint8Array> | Uint8Array | ArrayBuffer | DataView | Array<number>} source The source payload.
     * @param {(RequestInit & { onEmit?: Function | null }) | object | null} options Request options for URL sources or stream metadata for non-URL stream sources.
     * @returns {Promise<object>} The parser result.
     */
    read(source, options = null) {

        if (typeof source === 'string')
            return this.readUrl(source, options);

        return this._partReader.read(source, options);

    }

    /**
     * Set the current parser.
     * @param {DataParser} parser The parser.
     */
    set parser(parser) {
        this._partReader.parser = parser;
    }

    /**
     * Get the current parser.
     * @returns {DataParser} The parser.
     */
    get parser() {
        return this._partReader.parser;
    }

    /**
     * Set the onPart callback.
     * @param {Function | null} onPart The onPart callback.
     */
    set onPart(onPart) {
        this._partReader.onPart = onPart;
    }

    /**
     * Get the onPart callback.
     * @returns {Function | null} The onPart callback.
     */
    get onPart() {
        return this._partReader.onPart;
    }

    /**
     * Create one HTTP reader adapter.
     * @param {PartStreamReader | null} partReader Optional part reader.
     */
    constructor(partReader = null) {
        this._partReader = (partReader != null) ? partReader : new PartStreamReader();
    }

}
