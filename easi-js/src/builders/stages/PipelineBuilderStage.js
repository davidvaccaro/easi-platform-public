const StageSession = new WeakMap();

/**
 * Base stage for staged pipeline builder interfaces.
 *
 * This base intentionally hides the shared build session and exposes only
 * internal transition helpers for concrete stages.
 */
export default class PipelineBuilderStage {

    /**
     * Resolve the shared build session for the current stage.
     * @returns {object} The shared build session.
     */
    getSession() {
        return StageSession.get(this);
    }

    /**
     * Apply one session mutation and transition to the requested stage type.
     * @param {Function} mutation A callback that mutates the shared session.
     * @param {Function} StageType The target stage class.
     * @returns {PipelineBuilderStage} The next stage.
     */
    nextStage(mutation, StageType) {

        const session = this.getSession();
        mutation(session);

        return new StageType(session);

    }

    /**
     * Apply one session mutation and return a cloned reference of the current stage type.
     * @param {Function} mutation A callback that mutates the shared session.
     * @returns {PipelineBuilderStage} The next stage of the same type.
     */
    cloneCurrentStage(mutation) {
        return this.nextStage(mutation, this.constructor);
    }

    /**
     * Build the current configured pipeline.
     * @returns {object} The built pipeline.
     */
    buildCurrentPipeline() {
        return this.getSession().build();
    }

    /**
     * Determine if the configured parser is an instance of the supplied type.
     * @param {Function} ParserType The parser type.
     * @returns {boolean} TRUE when the current parser matches the supplied type.
     */
    isParserType(ParserType) {
        return (this.getSession()?.parser instanceof ParserType);
    }

    /**
     * Get the configured codec registry from the shared session.
     * @returns {object | null} The configured codec registry.
     */
    getCodecRegistry() {
        return this.getSession()?.codecRegistry ?? null;
    }

    /**
     * Construct a stage wrapper.
     * @param {object} session Shared build session.
     */
    constructor(session) {

        if ((session == null) || (typeof session.build !== "function")) {
            throw new Error("Invalid builder stage session.");
        }

        StageSession.set(this, session);

        // Stage wrappers are immutable references to a shared build session.
        Object.freeze(this);

    }

}
