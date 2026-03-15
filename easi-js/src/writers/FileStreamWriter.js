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
     * Write one chunk to a writable stream respecting backpressure.
     * @param {object} writable The writable stream.
     * @param {Uint8Array} chunk The bytes to write.
     * @returns {Promise<void>} Completion promise.
     */
    async writeChunk(writable, chunk) {

        if ((writable == null) || (typeof writable.write !== 'function'))
            throw new Exception('Invalid writable stream target.', GeneralErrorCodes.InvalidParameter);

        var canWrite = writable.write(Buffer.from(chunk));
        if (canWrite == true)
            return;

        await new Promise((resolve, reject) => {

            var onDrain = () => {
                cleanup();
                resolve();
            };

            var onError = (error) => {
                cleanup();
                reject(error ?? new Exception('Failed writing file stream chunk.', GeneralErrorCodes.GeneralError));
            };

            var cleanup = () => {
                if (typeof writable.removeListener === 'function') {
                    writable.removeListener('drain', onDrain);
                    writable.removeListener('error', onError);
                }
            };

            if (typeof writable.once === 'function') {
                writable.once('drain', onDrain);
                writable.once('error', onError);
                return;
            }

            resolve();

        });

    }

    /**
     * Finalize a writable stream and await completion.
     * @param {object} writable The writable stream.
     * @returns {Promise<void>} Completion promise.
     */
    async finalizeWritable(writable) {

        if ((writable == null) || (typeof writable.end !== 'function'))
            return;

        await new Promise((resolve, reject) => {

            var onFinish = () => {
                cleanup();
                resolve();
            };

            var onError = (error) => {
                cleanup();
                reject(error ?? new Exception('Failed finalizing file stream writer.', GeneralErrorCodes.GeneralError));
            };

            var cleanup = () => {
                if (typeof writable.removeListener === 'function') {
                    writable.removeListener('finish', onFinish);
                    writable.removeListener('error', onError);
                }
            };

            if (typeof writable.once === 'function') {
                writable.once('finish', onFinish);
                writable.once('error', onError);
            }

            writable.end();

        });

    }

    /**
     * Attempt a true streaming write path to file.
     * @param {string} filePath The destination file path.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async writeStreaming(filePath, source, options = null) {

        var fs = await this.loadNodeModule('node:fs');
        if ((fs == null) || (typeof fs.createWriteStream !== 'function'))
            throw new Exception('Node stream writer is unavailable in this runtime.', GeneralErrorCodes.NotImplemented);

        var writable = fs.createWriteStream(filePath);
        var existingOnChunk = options?.onChunk ?? null;

        var writerOptions = Object.assign({}, options || {}, {
            collectOutput: false,
            onChunk: async (chunk) => {
                await this.writeChunk(writable, chunk);
                if (existingOnChunk != null) {
                    await existingOnChunk(chunk);
                }
            }
        });

        try {

            var result = await this._partWriter.write(source, writerOptions);
            await this.finalizeWritable(writable);

            return Object.assign({}, result, {
                path: filePath
            });

        }
        catch (error) {

            try {
                if (typeof writable.destroy === 'function') {
                    writable.destroy(error);
                }
            }
            catch (destroyError) {
            }

            throw error;

        }

    }

    /**
     * Fallback write path that buffers output before writing to file.
     * @param {string} filePath The destination file path.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async writeBuffered(filePath, source, options = null) {

        var fsPromises = await this.loadNodeModule('node:fs/promises');
        var writerOptions = Object.assign({}, options || {}, { collectOutput: true });
        var result = await this._partWriter.write(source, writerOptions);

        await fsPromises.writeFile(filePath, Buffer.from(result.body || new Uint8Array(0)));

        return Object.assign({}, result, {
            path: filePath
        });

    }

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
     * @param {{ stream?: boolean } | object | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async write(filePath, source, options = null) {

        if ((filePath == null) || (typeof filePath !== 'string') || (filePath.length === 0)) {
            throw new Exception('Invalid file path destination.', GeneralErrorCodes.InvalidParameter);
        }

        if (options == null)
            options = {};

        var useStreaming = (options.stream !== false);
        if (useStreaming == true) {
            try {
                return await this.writeStreaming(filePath, source, options);
            }
            catch (streamError) {
                if ((streamError?.code == GeneralErrorCodes.NotImplemented) || (streamError?.message?.includes('Node stream writer is unavailable') == true)) {
                    return this.writeBuffered(filePath, source, options);
                }
                throw streamError;
            }
        }

        return this.writeBuffered(filePath, source, options);

    }

    /**
     * Create one file stream writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     */
    constructor(options = null) {
        this._partWriter = new PartStreamWriter(options);
    }

}
