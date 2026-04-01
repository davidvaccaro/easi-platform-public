//
// NodeStreamAdapterWriter.js
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
