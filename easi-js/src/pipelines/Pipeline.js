//
// Pipeline.js - 1.0.0
//
// Pipeline Class
//

export default class Pipeline {

    /**
     * Process one source through the configured reader/parser/handler pipeline.
     * @param {any} source The input source passed to the configured reader.
     * @param {any} options Optional source options passed to the configured reader.
     * @returns {Promise<any>} The terminal pipeline output.
     */
    process(source, options = null) {
        return this._reader.read(source, options);
    }

    /**
     * Backward-compatible alias for process.
     * @param {any} source The input source passed to the configured reader.
     * @param {any} options Optional source options passed to the configured reader.
     * @returns {Promise<any>} The terminal pipeline output.
     */
    read(source, options = null) {
        return this.process(source, options);
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
    }

};
