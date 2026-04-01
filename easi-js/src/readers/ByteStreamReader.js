//
// ByteStreamReader.js
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

import PartStreamReader from './PartStreamReader.js';

export default class ByteStreamReader {

    /**
     * Create a one-shot stream reader from one byte buffer.
     * @param {Uint8Array} bytes The byte source.
     * @returns {ReadableStreamDefaultReader<Uint8Array>} A reader contract.
     */
    toSingleChunkReader(bytes) {

        var emitted = false;

        return {
            read: async function () {

                if (emitted == true) {
                    return { done: true, value: null };
                }

                emitted = true;
                return { done: false, value: bytes };

            },
            releaseLock: function () { }
        };

    }

    /**
     * Read one byte source.
     * @param {Uint8Array | ArrayBuffer | DataView | Array<number>} source The source bytes.
     * @param {{ contentType?: string | object, contentLength?: number | string | null, onEmit?: Function | null } | null} options Optional content metadata.
     * @returns {Promise<object>} The parser result.
     */
    read(source, options = null) {

        var bytes = this._partReader.toBytes(source);

        // When content metadata is provided, route through readStream so multipart framing can be honored.
        if ((options != null) && (options.contentType != null)) {
            return this._partReader.readStream(this.toSingleChunkReader(bytes), options);
        }

        return this._partReader.readData(bytes, options);

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
     * Create one byte-stream reader.
     * @param {PartStreamReader | null} partReader Optional part reader.
     */
    constructor(partReader = null) {
        this._partReader = (partReader != null) ? partReader : new PartStreamReader();
    }

}
