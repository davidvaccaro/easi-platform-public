//
// FileStreamWriter.js - 1.0.0
//
// FileStreamWriter Class
//

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';
import PartStreamWriter from './PartStreamWriter.js';

export default class FileStreamWriter {

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

        try {
            return await import(moduleName);
        }
        catch (err) {
            throw new Exception('FileStreamWriter requires a Node.js runtime.', GeneralErrorCodes.NotImplemented, err);
        }

    }

    /**
     * Write one payload to a Node file path.
     * @param {string} filePath The destination file path.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async write(filePath, source, options = null) {

        if ((filePath == null) || (typeof filePath !== 'string') || (filePath.length === 0)) {
            throw new Exception('Invalid file path destination.', GeneralErrorCodes.InvalidParameter);
        }

        var fsPromises = await this.loadNodeModule('node:fs/promises');
        var writerOptions = Object.assign({}, options || {}, { collectOutput: true });
        var result = await this._partWriter.write(source, writerOptions);

        await fsPromises.writeFile(filePath, Buffer.from(result.body || new Uint8Array(0)));

        return Object.assign({}, result, {
            path: filePath
        });

    }

    /**
     * Create one file stream writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     */
    constructor(options = null) {
        this._partWriter = new PartStreamWriter(options);
    }

}
