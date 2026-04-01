//
// Pipeline.js
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

export default class Pipeline {

    /**
     * Process one source through the configured reader/parser/handler pipeline.
     * @param {any} source The input source passed to the configured reader.
     * @param {any} options Optional source options passed to the configured reader (for example reader-specific `onEmit`).
     * @returns {Promise<any>} The terminal pipeline output.
     */
    process(source, options = null) {

        const execute = async () => {

            const result = await this._reader.read(source, options);

            if (this._onResult == null)
                return result;

            return this._onResult(result, options);

        };

        // Serialize process calls on one pipeline instance so parser/handler state
        // remains transaction-safe even when callers invoke process concurrently.
        const current = this._processQueue.then(execute, execute);

        // Keep the queue alive regardless of failures from this transaction.
        this._processQueue = current.then(
            () => undefined,
            () => undefined
        );

        return current;

    }

    /**
     * Get the configured reader.
     * @returns {object} The configured reader.
     */
    get reader() {
        return this._reader;
    }

    /**
     * Get the configured parser.
     * @returns {object | null} The configured parser.
     */
    get parser() {
        return (this._reader != null) ? this._reader.parser : null;
    }

    /**
     * Get the configured top-level handler.
     * @returns {object | null} The configured handler.
     */
    get handler() {
        var parser = this.parser;
        return (parser != null) ? parser.handler : null;
    }

    /**
     * Create a pipeline.
     * @param {object} reader The configured reader.
     * @param {Function | null} onResult Optional result sink invoked after each process call result.
     */
    constructor(reader, onResult = null) {
        this._reader = reader;
        this._onResult = onResult;
        this._processQueue = Promise.resolve();
    }

};
