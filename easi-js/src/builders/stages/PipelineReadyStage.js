import PipelineBuilderStage from "./PipelineBuilderStage.js";
import Tag from "../../dicom/Tag.js";

/**
 * Ready stage.
 *
 * Final stage exposing terminal configuration (`with*`) and `build()`.
 */
export default class PipelineReadyStage extends PipelineBuilderStage {

    /**
     * Set the codec registry used by codec-dependent handlers.
     * @param {object} codecRegistry The codec registry.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withCodecRegistry(codecRegistry) {
        return this.cloneCurrentStage(
            (session) => session.withCodecRegistry(codecRegistry)
        );
    }

    /**
     * Sets the `onEmit` callback for the stream-read session.
     * @param {Function | null} onEmit The callback invoked whenever the pipeline emits a parsed result.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withOnEmit(onEmit) {
        return this.cloneCurrentStage(
            (session) => session.withOnEmit(onEmit)
        );
    }

    /**
     * Sets strict parser behavior.
     * @param {boolean} isStrict Indicates strict parse behavior.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withIsStrict(isStrict) {
        return this.cloneCurrentStage(
            (session) => session.withIsStrict(isStrict)
        );
    }

    /**
     * Sets the de-identification mask map.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null} mask The tag mask map.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withMask(mask) {
        return this.cloneCurrentStage(
            (session) => session.withMask(mask)
        );
    }

    /**
     * Enables de-identification using a mask.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null} [mask=Tag.DefaultDeIdentificationMask] The tag mask map.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withDeIdentification(mask = Tag.DefaultDeIdentificationMask) {
        return this.cloneCurrentStage((session) => {

            if (typeof session.withDeIdentification === "function") {
                session.withDeIdentification(mask);
            }
            else {
                session.withMask(mask);
            }

        });
    }

    /**
     * Sets the parser bulk-data policy (when supported by the parser).
     * @param {{ mode?: 'materialize' | 'auto' | 'stream', knownLengthThreshold?: number, hardSafetyCap?: number } | string | null} policy The bulk-data policy.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withBulkDataPolicy(policy) {
        return this.cloneCurrentStage(
            (session) => session.withBulkDataPolicy(policy)
        );
    }

    /**
     * Enables/configures validation filtering in the canonical DICOM semantic chain.
     * @param {boolean | string | object | null} validation Validation configuration.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withValidation(validation = true) {
        return this.cloneCurrentStage(
            (session) => session.withValidation(validation)
        );
    }

    /**
     * Build a new pipeline instance.
     * @returns {object} The built pipeline.
     */
    build() {
        return this.buildCurrentPipeline();
    }

}
