/**
 * Base stage for staged pipeline builder interfaces.
 *
 * This base intentionally hosts only shared accessors and cloning behavior.
 * Stage-specific public methods are declared in each concrete stage class.
 */
export default class PipelineBuilderStage {

    /**
     * Creates a new stage reference of the same stage type.
     * @returns {PipelineBuilderStage} A new stage object with the same shared operations object.
     */
    cloneStage() {
        return new this.constructor(this._operations);
    }

    /**
     * Get the configured reader.
     * @returns {object | null} The configured reader.
     */
    get reader() {
        return this._operations?.reader ?? null;
    }

    /**
     * Get the configured parser.
     * @returns {object | null} The configured parser.
     */
    get parser() {
        return this._operations?.parser ?? null;
    }

    /**
     * Get the configured handler.
     * @returns {object | null} The configured handler.
     */
    get handler() {
        return this._operations?.handler ?? null;
    }

    /**
     * Construct a stage wrapper.
     * @param {object} operations Shared operations object.
     */
    constructor(operations) {
        this._operations = operations;
    }

}
