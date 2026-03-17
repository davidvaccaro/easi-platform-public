import DicomDataParser from "../../parsers/DicomDataParser.js";
import JsonDataParser from "../../parsers/JsonDataParser.js";
import XmlDataParser from "../../parsers/XmlDataParser.js";
import Tag from "../../dicom/Tag.js";

import DicomToFHIRImagingStudyMapping from "../../handlers/mappings/DicomToFHIRImagingStudyMapping.js";

import DicomInstanceHandler from "../../handlers/terminals/DicomInstanceHandler.js";
import DicomEntityHandler from "../../handlers/terminals/DicomEntityHandler.js";
import DicomMappingHandler from "../../handlers/terminals/DicomMappingHandler.js";
import DicomSelectingHandler from "../../handlers/terminals/DicomSelectingHandler.js";
import DicomDataWriterHandler from "../../handlers/terminals/DicomDataWriterHandler.js";
import DicomAssetsHandler from "../../handlers/terminals/DicomAssetsHandler.js";
import DicomAssetArchiveHandler from "../../handlers/terminals/DicomAssetArchiveHandler.js";
import DicomJsonMetadataAdapter from "../../handlers/adapters/DicomJsonMetadataAdapter.js";
import DicomXmlMetadataAdapter from "../../handlers/adapters/DicomXmlMetadataAdapter.js";
import JsonDataHandler from "../../handlers/terminals/syntax/JsonDataHandler.js";
import XmlDataHandler from "../../handlers/terminals/syntax/XmlDataHandler.js";

import PipelineBuilderStage from "./PipelineBuilderStage.js";
import PipelineOutputStage from "./PipelineOutputStage.js";

/**
 * Transform/target stage.
 *
 * Responsible for transform configuration (`with*`) and terminal output declaration (`to*`).
 */
export default class PipelineTargetStage extends PipelineBuilderStage {

    /**
     * Set the codec registry used by codec-dependent handlers.
     * @param {object} codecRegistry The codec registry.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withCodecRegistry(codecRegistry) {
        return this.cloneCurrentStage(
            (session) => session.withCodecRegistry(codecRegistry)
        );
    }

    /**
     * Sets the `onEmit` callback for the stream-read session.
     * @param {Function | null} onEmit The callback invoked whenever the pipeline emits a parsed result.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withOnEmit(onEmit) {
        return this.cloneCurrentStage(
            (session) => session.withOnEmit(onEmit)
        );
    }

    /**
     * Sets strict parser behavior.
     * @param {boolean} isStrict Indicates strict parse behavior.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withIsStrict(isStrict) {
        return this.cloneCurrentStage(
            (session) => session.withIsStrict(isStrict)
        );
    }

    /**
     * Sets the de-identification mask map.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null} mask The tag mask map.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withMask(mask) {
        return this.cloneCurrentStage(
            (session) => session.withMask(mask)
        );
    }

    /**
     * Enables de-identification using a mask.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null} [mask=Tag.DefaultDeIdentificationMask] The tag mask map.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withDeIdentification(mask = Tag.DefaultDeIdentificationMask) {
        return this.cloneCurrentStage(
            (session) => session.withDeIdentification(mask)
        );
    }

    /**
     * Sets the parser bulk-data policy (when supported by the parser).
     * @param {{ mode?: 'materialize' | 'auto' | 'stream', knownLengthThreshold?: number, hardSafetyCap?: number } | string | null} policy The bulk-data policy.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withBulkDataPolicy(policy) {
        return this.cloneCurrentStage(
            (session) => session.withBulkDataPolicy(policy)
        );
    }

    /**
     * Enables/configures validation filtering in the canonical DICOM semantic chain.
     * @param {boolean | string | object | null} validation Validation configuration.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withValidation(validation = true) {
        return this.cloneCurrentStage(
            (session) => session.withValidation(validation)
        );
    }

    /**
     * Enables/configures transfer-syntax transcoding in the canonical DICOM semantic chain.
     * @param {string | object | null | false} transcoding Transcoding configuration.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withTranscoding(transcoding) {
        return this.cloneCurrentStage(
            (session) => session.withTranscoding(transcoding)
        );
    }

    /**
     * Enables/configures burned-in pixel redaction.
     * @param {boolean | object | Function | Array<object> | null | false} redaction Redaction configuration.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withBurnedInRedaction(redaction = true) {
        return this.cloneCurrentStage(
            (session) => session.withBurnedInRedaction(redaction)
        );
    }

    /**
     * Set the current terminal handler.
     * @param {object} handler The terminal handler.
     * @returns {PipelineOutputStage} An output stage reference.
     */
    withHandler(handler) {
        return this.nextStage(
            (session) => session.withHandler(handler),
            PipelineOutputStage
        );
    }

    /**
     * Wraps canonical DICOM semantic handlers in metadata adapters when needed.
     * @param {object} handler The canonical handler.
     * @returns {object} Wrapped or original handler.
     */
    wrapDicomMetadataAdapterIfNeeded(handler) {

        if (this.isParserType(JsonDataParser) === true) {
            return new DicomJsonMetadataAdapter(handler);
        }

        if (this.isParserType(XmlDataParser) === true) {
            return new DicomXmlMetadataAdapter(handler);
        }

        return handler;

    }

    /** @returns {PipelineOutputStage} */
    toInstances() {

        if (this.isParserType(DicomDataParser) === true) {
            return this.withHandler(new DicomInstanceHandler());
        }

        if (this.isParserType(JsonDataParser) === true) {
            return this.withHandler(new DicomJsonMetadataAdapter(new DicomInstanceHandler()));
        }

        if (this.isParserType(XmlDataParser) === true) {
            return this.withHandler(new DicomXmlMetadataAdapter(new DicomInstanceHandler()));
        }

        return this.withHandler(new DicomInstanceHandler());

    }

    /** @returns {PipelineOutputStage} */
    toEntities() {

        if (this.isParserType(DicomDataParser) === true) {
            return this.withHandler(new DicomEntityHandler());
        }

        if (this.isParserType(JsonDataParser) === true) {
            return this.withHandler(new DicomJsonMetadataAdapter(new DicomEntityHandler()));
        }

        if (this.isParserType(XmlDataParser) === true) {
            return this.withHandler(new DicomXmlMetadataAdapter(new DicomEntityHandler()));
        }

        return this.withHandler(new DicomEntityHandler());

    }

    /**
     * @param {object} mapping Mapping strategy.
     * @returns {PipelineOutputStage}
     */
    toMapping(mapping) {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomMappingHandler(mapping)
        ));
    }

    /**
     * @param {object} selection Selection strategy.
     * @returns {PipelineOutputStage}
     */
    toSelection(selection) {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomSelectingHandler(selection)
        ));
    }

    /** @returns {PipelineOutputStage} */
    toFHIRImagingStudy() {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomMappingHandler(new DicomToFHIRImagingStudyMapping())
        ));
    }

    /**
     * @param {{ onChunk?: Function, collectOutput?: boolean } | null} options Writer options.
     * @returns {PipelineOutputStage}
     */
    toDicomData(options = null) {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomDataWriterHandler(options)
        ));
    }

    /** @returns {PipelineOutputStage} */
    toJsonValue() {

        if (this.isParserType(XmlDataParser) === true) {
            return this.withHandler(new XmlDataHandler());
        }

        return this.withHandler(new JsonDataHandler());

    }

    /**
     * @param {object | null} options Asset extraction options.
     * @returns {PipelineOutputStage}
     */
    toAssets(options = null) {
        return this.withHandler(new DicomAssetsHandler(options, this.getCodecRegistry()));
    }

    /**
     * @param {object | null} options Asset archive options.
     * @returns {PipelineOutputStage}
     */
    toAssetArchive(options = null) {
        return this.withHandler(new DicomAssetArchiveHandler(options, this.getCodecRegistry()));
    }

}
