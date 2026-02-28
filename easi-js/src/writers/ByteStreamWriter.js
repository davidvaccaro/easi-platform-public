//
// ByteStreamWriter.js - 1.0.0
//
// ByteStreamWriter Class
//

import PartStreamWriter from './PartStreamWriter.js';

export default class ByteStreamWriter {

    /**
     * Write one source payload to bytes.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    write(source, options = null) {
        return this._partWriter.write(source, options);
    }

    /**
     * Create one byte stream writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     */
    constructor(options = null) {
        this._partWriter = new PartStreamWriter(options);
    }

}

