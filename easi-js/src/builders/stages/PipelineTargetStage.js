//
// PipelineTargetStage.js
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

import DicomDataParser from "../../parsers/DicomDataParser.js";
import JsonDataParser from "../../parsers/JsonDataParser.js";
import XmlDataParser from "../../parsers/XmlDataParser.js";
import Tag from "../../dicom/Tag.js";

import DicomToFHIRImagingStudyMapping from "../../handlers/mappings/DicomToFHIRImagingStudyMapping.js";

import DicomInstanceHandler from "../../handlers/terminals/DicomInstanceHandler.js";
import DicomEntityHandler from "../../handlers/terminals/DicomEntityHandler.js";
import DicomDocumentHandler from "../../handlers/terminals/DicomDocumentHandler.js";
import DicomDocumentWrappingHandler from "../../handlers/terminals/DicomDocumentWrappingHandler.js";
import DicomMappingHandler from "../../handlers/terminals/DicomMappingHandler.js";
import DicomSelectingHandler from "../../handlers/terminals/DicomSelectingHandler.js";
import DicomDataWriterHandler from "../../handlers/terminals/DicomDataWriterHandler.js";
import DicomAssetsHandler from "../../handlers/terminals/DicomAssetsHandler.js";
import DicomAssetArchiveHandler from "../../handlers/terminals/DicomAssetArchiveHandler.js";
import ImageDataHandler from "../../handlers/terminals/ImageDataHandler.js";
import MixedImagingDataHandler from "../../handlers/terminals/MixedImagingDataHandler.js";
import ImagingRoutingHandler from "../../handlers/terminals/ImagingRoutingHandler.js";
import DicomJsonMetadataAdapter from "../../handlers/adapters/DicomJsonMetadataAdapter.js";
import DicomXmlMetadataAdapter from "../../handlers/adapters/DicomXmlMetadataAdapter.js";
import JsonDataHandler from "../../handlers/terminals/syntax/JsonDataHandler.js";
import XmlDataHandler from "../../handlers/terminals/syntax/XmlDataHandler.js";
import ImagingRoutingBuilder from "../ImagingRoutingBuilder.js";

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
     * @param {import("../../codecs/CodecRegistry.js").default} codecRegistry The codec registry.
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
     * Enables de-identification using a mask.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null}
     * [deIdentificationMask=Tag.DefaultDeIdentificationMask] The de-identification mask map.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withDeIdentification(deIdentificationMask = Tag.DefaultDeIdentificationMask) {
        return this.cloneCurrentStage(
            (session) => session.withDeIdentification(deIdentificationMask)
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
     * Enables/configures mixed-imaging normalization.
     * @param {Function | object | import("../ImagingNormalizationBuilder.js").default | null | false} normalization
     * Normalization configuration.
     * @returns {PipelineTargetStage} A new target stage object.
     */
    withNormalization(normalization = null) {
        return this.cloneCurrentStage(
            (session) => session.withNormalization(normalization)
        );
    }

    /**
     * Enables staged routing branches.
     * @param {import("../ImagingRoutingBuilder.js").default | Function | object} definition Routing definition.
     * @returns {PipelineOutputStage} An output stage reference.
     */
    withRouting(definition) {
        return this.withHandler(
            new ImagingRoutingHandler(
                ImagingRoutingBuilder.resolve(definition)
            )
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

    /**
     * Materialize parser output as DICOM instance objects.
     * @returns {PipelineOutputStage}
     */
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

    /**
     * Materialize parser output as normalized entity objects.
     * @returns {PipelineOutputStage}
     */
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
     * Materialize parser output as unwrapped document entities.
     * @param {object | null} options Document unwrap options.
     * @returns {PipelineOutputStage}
     */
    toUnwrappedDocuments(options = null) {
        return this.withHandler(new DicomDocumentHandler(options));
    }

    /**
     * Materialize parser output as wrapped DICOM document entities.
     * @param {object | null} options Document wrapping options.
     * @returns {PipelineOutputStage}
     */
    toWrappedDocuments(options = null) {
        return this.withHandler(new DicomDocumentWrappingHandler(options));
    }

    /**
     * Materialize parser output using a custom mapping strategy.
     * @param {object} mapping Mapping strategy.
     * @returns {PipelineOutputStage}
     */
    toMapping(mapping) {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomMappingHandler(mapping)
        ));
    }

    /**
     * Materialize parser output using a custom selection strategy.
     * @param {object} selection Selection strategy.
     * @returns {PipelineOutputStage}
     */
    toSelection(selection) {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomSelectingHandler(selection)
        ));
    }

    /**
     * Materialize parser output as FHIR ImagingStudy resources.
     * @param {'full' | 'study-summary'} [profile='full'] ImagingStudy mapping profile.
     * @returns {PipelineOutputStage}
     */
    toFHIRImagingStudy(profile = 'full') {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomMappingHandler(new DicomToFHIRImagingStudyMapping({ profile }))
        ));
    }

    /**
     * Materialize parser output as encoded native DICOM byte streams.
     * @param {{ onChunk?: Function, collectOutput?: boolean } | null} options Writer options.
     * @returns {PipelineOutputStage}
     */
    toDicomData(options = null) {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomDataWriterHandler(options)
        ));
    }

    /**
     * Materialize parser output as structured JSON or XML syntax values.
     * @returns {PipelineOutputStage}
     */
    toStructuredValue() {

        if (this.isParserType(XmlDataParser) === true) {
            return this.withHandler(new XmlDataHandler());
        }

        return this.withHandler(new JsonDataHandler());

    }

    /**
     * Materialize parser output as normalized single imaging data values.
     * @returns {PipelineOutputStage}
     */
    toImageData() {
        return this.withHandler(new ImageDataHandler());
    }

    /**
     * Materialize parser output as mixed imaging data values.
     * @param {{ failOnUnknown?: boolean } | null} options Mixed imaging options.
     * @returns {PipelineOutputStage}
     */
    toImagingData(options = null) {
        return this.withHandler(new MixedImagingDataHandler(options));
    }

    /**
     * Materialize parser output as extracted imaging assets.
     * @param {object | null} options Asset extraction options.
     * @returns {PipelineOutputStage}
     */
    toAssets(options = null) {
        return this.withHandler(new DicomAssetsHandler(options, this.getCodecRegistry()));
    }

    /**
     * Materialize parser output as packaged imaging asset archives.
     * @param {object | null} options Asset archive options.
     * @returns {PipelineOutputStage}
     */
    toAssetArchive(options = null) {
        return this.withHandler(new DicomAssetArchiveHandler(options, this.getCodecRegistry()));
    }

}
