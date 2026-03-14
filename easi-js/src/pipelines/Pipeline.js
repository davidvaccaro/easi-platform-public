//
// Pipeline.js - 1.0.0
//
// Pipeline Class
//

export default class Pipeline {

    /**
     * Process one source through the configured reader/parser/handler pipeline.
     * @param {any} source The input source passed to the configured reader.
     * @param {any} options Optional source options passed to the configured reader (for example reader-specific `onEmit`).
     * @returns {Promise<any>} The terminal pipeline output.
     */
    process(source, options = null) {

        const execute = () => this._reader.read(source, options);

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
     */
    constructor(reader) {
        this._reader = reader;
        this._processQueue = Promise.resolve();
    }

};
