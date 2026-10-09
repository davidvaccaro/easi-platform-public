//
// HttpStreamReader.js
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

        if ((onEmit != null) && (typeof onEmit !== 'function')) {
            throw new Exception('Invalid "onEmit" option. Expected function or null.', GeneralErrorCodes.InvalidParameter);
        }

        var response = await fetch(url, Object.assign({
            method: 'GET'
        }, httpOptions));

        var responseError = null;
        if ((response != null) && ((response.ok === false)
            || ((typeof response.status === 'number') && ((response.status < 200) || (response.status >= 300))))) {
            responseError = new Exception('HTTP request failed for ' + url + ': '
                + ((response.status != null) ? response.status : 'unsuccessful response')
                + ((response.statusText) ? ' ' + response.statusText : '') + '.', GeneralErrorCodes.GeneralError);
        } else if (httpOptions.signal?.aborted === true) {
            responseError = httpOptions.signal.reason;
            if (responseError == null) {
                responseError = new Error('HTTP request aborted for ' + url + '.');
                responseError.name = 'AbortError';
            }
        }

        if (responseError != null) {
            if (typeof response?.body?.cancel === 'function') {
                try {
                    await response.body.cancel(responseError);
                } catch (_) {
                    // Preserve the request failure if cleanup also fails.
                }
            }
            throw responseError;
        }

        if ((response == null) || (response.body == null)) {
            throw new Exception('Invalid HTTP response for ' + url + '. Missing response body stream.', GeneralErrorCodes.GeneralError);
        }

        var streamOptions = {
            contentType: PartContentType.parse(response),
            contentLength: (typeof response.headers?.get === 'function') ? response.headers.get('content-length') : null
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
