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
        this._operations.withCodecRegistry(codecRegistry);
        return this.cloneStage();
    }

    /**
     * Sets the `onEmit` callback for the stream-read session.
     * @param {Function | null} onEmit The callback invoked whenever the pipeline emits a parsed result.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withOnEmit(onEmit) {
        this._operations.withOnEmit(onEmit);
        return this.cloneStage();
    }

    /**
     * Sets strict parser behavior.
     * @param {boolean} isStrict Indicates strict parse behavior.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withIsStrict(isStrict) {
        this._operations.withIsStrict(isStrict);
        return this.cloneStage();
    }

    /**
     * Sets the de-identification mask map.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null} mask The tag mask map.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withMask(mask) {
        this._operations.withMask(mask);
        return this.cloneStage();
    }

    /**
     * Enables de-identification using a mask.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null} [mask=Tag.DefaultDeIdentificationMask] The tag mask map.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withDeIdentification(mask = Tag.DefaultDeIdentificationMask) {
        if (typeof this._operations.withDeIdentification === "function") {
            this._operations.withDeIdentification(mask);
        }
        else {
            this._operations.withMask(mask);
        }
        return this.cloneStage();
    }

    /**
     * Sets the parser bulk-data policy (when supported by the parser).
     * @param {{ mode?: 'materialize' | 'auto' | 'stream', knownLengthThreshold?: number, hardSafetyCap?: number } | string | null} policy The bulk-data policy.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withBulkDataPolicy(policy) {
        this._operations.withBulkDataPolicy(policy);
        return this.cloneStage();
    }

    /**
     * Enables/configures validation filtering in the canonical DICOM semantic chain.
     * @param {boolean | string | object | null} validation Validation configuration.
     * @returns {PipelineReadyStage} A new ready stage object.
     */
    withValidation(validation = true) {
        this._operations.withValidation(validation);
        return this.cloneStage();
    }

    /**
     * Build a new pipeline instance.
     * @returns {object} The built pipeline.
     */
    build() {
        return this._operations.build();
    }

}
