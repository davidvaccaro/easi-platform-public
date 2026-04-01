//
// BrowserFileStreamWriter.js
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

export default class BrowserFileStreamWriter {

    /**
     * Resolve a browser writable stream target.
     * @param {object} target The writable stream target or file handle.
     * @returns {Promise<{ writable: object, ownsWritable: boolean }>} The writable stream and ownership flag.
     */
    async resolveWritable(target) {

        if ((target != null) && (typeof target.write === 'function')) {
            return {
                writable: target,
                ownsWritable: false
            };
        }

        if ((target != null) && (typeof target.createWritable === 'function')) {
            var writable = await target.createWritable();

            if ((writable == null) || (typeof writable.write !== 'function')) {
                throw new Exception('Invalid browser file writable stream target.', GeneralErrorCodes.InvalidParameter);
            }

            return {
                writable: writable,
                ownsWritable: true
            };
        }

        throw new Exception(
            'Invalid browser file writable stream target. Expected FileSystemWritableFileStream or FileSystemFileHandle.',
            GeneralErrorCodes.InvalidParameter
        );

    }

    /**
     * Attempt to close one writable stream.
     * @param {object} writable The writable stream.
     */
    async closeWritable(writable) {

        if ((writable != null) && (typeof writable.close === 'function')) {
            await writable.close();
        }

    }

    /**
     * Attempt to abort one writable stream.
     * @param {object} writable The writable stream.
     * @param {Error | null} error The associated write error.
     */
    async abortWritable(writable, error = null) {

        if ((writable != null) && (typeof writable.abort === 'function')) {
            await writable.abort(error);
            return;
        }

        if ((writable != null) && (typeof writable.close === 'function')) {
            await writable.close();
        }

    }

    /**
     * Write one payload to a browser file-writable target.
     * @param {object} target The writable stream target or file handle.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number, closeOnDone?: boolean, abortOnError?: boolean } | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async write(target, source, options = null) {

        if (options == null) {
            options = {};
        }

        var resolved = await this.resolveWritable(target);
        var writable = resolved.writable;
        var ownsWritable = (resolved.ownsWritable == true);

        var existingOnChunk = options.onChunk || null;
        var writerOptions = Object.assign({}, options, {
            collectOutput: false,
            onChunk: async (chunk) => {
                await writable.write(chunk);
                if (existingOnChunk != null) {
                    await existingOnChunk(chunk);
                }
            }
        });

        delete writerOptions.closeOnDone;
        delete writerOptions.abortOnError;

        try {

            var result = await this._partWriter.write(source, writerOptions);

            if ((options.closeOnDone !== false) && (ownsWritable == true)) {
                await this.closeWritable(writable);
            }

            return result;

        }
        catch (error) {

            if ((options.abortOnError !== false) && (ownsWritable == true)) {
                try {
                    await this.abortWritable(writable, error);
                }
                catch (abortError) {
                }
            }

            throw error;

        }

    }

    /**
     * Create one browser file stream writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     */
    constructor(options = null) {
        this._partWriter = new PartStreamWriter(options);
    }

}

