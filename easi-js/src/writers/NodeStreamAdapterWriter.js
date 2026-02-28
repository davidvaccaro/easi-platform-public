//
// NodeStreamAdapterWriter.js - 1.0.0
//
// NodeStreamAdapterWriter Class
//

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';
import PartStreamWriter from './PartStreamWriter.js';

export default class NodeStreamAdapterWriter {

    /**
     * Load a Node module in a runtime-compatible way.
     * @param {string} moduleName The Node module name.
     * @returns {Promise<any>} The loaded module.
     */
    async loadNodeModule(moduleName) {

        try {
            if (typeof require === 'function') {
                return require(moduleName);
            }
        }
        catch (err) {
        }

        return await import(moduleName);

    }

    /**
     * Write one chunk to writable stream respecting backpressure.
     * @param {object} writable The Node writable stream.
     * @param {Uint8Array} chunk The bytes to write.
     */
    async writeChunk(writable, chunk) {

        if ((writable == null) || (typeof writable.write !== 'function')) {
            throw new Exception('Invalid writable stream target.', GeneralErrorCodes.InvalidParameter);
        }

        var events = await this.loadNodeModule('node:events');
        var canWrite = writable.write(Buffer.from(chunk));

        if (canWrite == false) {
            await events.once(writable, 'drain');
        }

    }

    /**
     * Write one source payload to a Node writable stream.
     * @param {object} writable The Node writable stream.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {{ end?: boolean } | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async write(writable, source, options = null) {

        if (options == null) {
            options = {};
        }

        var existingOnChunk = options.onChunk || null;
        var writerOptions = Object.assign({}, options, {
            collectOutput: false,
            onChunk: async (chunk) => {
                await this.writeChunk(writable, chunk);
                if (existingOnChunk != null) {
                    await existingOnChunk(chunk);
                }
            }
        });

        var result = await this._partWriter.write(source, writerOptions);

        if ((options.end !== false) && (typeof writable.end === 'function')) {

            var events = await this.loadNodeModule('node:events');
            writable.end();

            if (typeof writable.once === 'function') {
                await events.once(writable, 'finish');
            }

        }

        return result;

    }

    /**
     * Create one Node stream adapter writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     */
    constructor(options = null) {
        this._partWriter = new PartStreamWriter(options);
    }

}
