//
// ByteStreamReader.js - 1.0.0
//
// ByteStreamReader Class
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
     * @param {{ contentType?: string | object, contentLength?: number | string | null } | null} options Optional content metadata.
     * @returns {Promise<object>} The parser result.
     */
    read(source, options = null) {

        var bytes = this._partReader.toBytes(source);

        // When content metadata is provided, route through readStream so multipart framing can be honored.
        if ((options != null) && (options.contentType != null)) {
            return this._partReader.readStream(this.toSingleChunkReader(bytes), options);
        }

        return this._partReader.readData(bytes);

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

