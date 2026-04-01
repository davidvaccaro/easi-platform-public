//
// NodeStreamAdapterReader.js
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

export default class NodeStreamAdapterReader {

    /**
     * Convert a Node/async-iterable stream source to a reader contract.
     * @param {object} source A Node readable stream or async iterable.
     * @returns {ReadableStreamDefaultReader<Uint8Array>} The normalized reader contract.
     */
    toReader(source) {

        if ((source != null) && (typeof source.read === 'function') && (typeof source.releaseLock === 'function')) {
            return source;
        }

        if ((source == null) || (typeof source[Symbol.asyncIterator] !== 'function')) {
            throw new Exception('Invalid Node stream source. Expected async iterable readable stream.', GeneralErrorCodes.InvalidParameter);
        }

        var iterator = source[Symbol.asyncIterator]();
        var that = this;

        return {
            read: async function () {

                var next = await iterator.next();
                if (next.done == true) {
                    return { done: true, value: null };
                }

                return { done: false, value: that._partReader.toBytes(next.value) };

            },
            releaseLock: function () { }
        };

    }

    /**
     * Read one Node/async-iterable stream source.
     * @param {object} source A Node readable stream or async iterable.
     * @param {{ contentType?: string | object, contentLength?: number | string | null, onEmit?: Function | null } | null} options Optional content metadata.
     * @returns {Promise<object>} The parser result.
     */
    read(source, options = null) {

        if ((source != null) && (typeof source.getReader === 'function')) {
            return this._partReader.readStream(source, options);
        }

        return this._partReader.readStream(this.toReader(source), options);

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
     * Create one Node stream adapter reader.
     * @param {PartStreamReader | null} partReader Optional part reader.
     */
    constructor(partReader = null) {
        this._partReader = (partReader != null) ? partReader : new PartStreamReader();
    }

}
