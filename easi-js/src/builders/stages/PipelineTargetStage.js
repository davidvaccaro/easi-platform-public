import DicomDataParser from "../../parsers/DicomDataParser.js";
import JsonDataParser from "../../parsers/JsonDataParser.js";
import XmlDataParser from "../../parsers/XmlDataParser.js";

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
import PipelineReadyStage from "./PipelineReadyStage.js";

/**
 * Target stage.
 *
 * Responsible for terminal output declaration (`to*`) and explicit handler override.
 */
export default class PipelineTargetStage extends PipelineBuilderStage {

    /**
     * Set the current terminal handler.
     * @param {object} handler The terminal handler.
     * @returns {PipelineReadyStage} A ready stage reference.
     */
    withHandler(handler) {
        this._operations.withHandler(handler);
        return new PipelineReadyStage(this._operations);
    }

    /**
     * Wraps canonical DICOM semantic handlers in metadata adapters when needed.
     * @param {object} handler The canonical handler.
     * @returns {object} Wrapped or original handler.
     */
    wrapDicomMetadataAdapterIfNeeded(handler) {

        if (this.parser instanceof JsonDataParser) {
            return new DicomJsonMetadataAdapter(handler);
        }

        if (this.parser instanceof XmlDataParser) {
            return new DicomXmlMetadataAdapter(handler);
        }

        return handler;

    }

    /** @returns {PipelineReadyStage} */
    toInstances() {

        if (this.parser instanceof DicomDataParser) {
            return this.withHandler(new DicomInstanceHandler());
        }

        if (this.parser instanceof JsonDataParser) {
            return this.withHandler(new DicomJsonMetadataAdapter(new DicomInstanceHandler()));
        }

        if (this.parser instanceof XmlDataParser) {
            return this.withHandler(new DicomXmlMetadataAdapter(new DicomInstanceHandler()));
        }

        return this.withHandler(new DicomInstanceHandler());

    }

    /** @returns {PipelineReadyStage} */
    toEntities() {

        if (this.parser instanceof DicomDataParser) {
            return this.withHandler(new DicomEntityHandler());
        }

        if (this.parser instanceof JsonDataParser) {
            return this.withHandler(new DicomJsonMetadataAdapter(new DicomEntityHandler()));
        }

        if (this.parser instanceof XmlDataParser) {
            return this.withHandler(new DicomXmlMetadataAdapter(new DicomEntityHandler()));
        }

        return this.withHandler(new DicomEntityHandler());

    }

    /**
     * @param {object} mapping Mapping strategy.
     * @returns {PipelineReadyStage}
     */
    toMapping(mapping) {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomMappingHandler(mapping)
        ));
    }

    /**
     * @param {object} selection Selection strategy.
     * @returns {PipelineReadyStage}
     */
    toSelection(selection) {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomSelectingHandler(selection)
        ));
    }

    /** @returns {PipelineReadyStage} */
    toFHIRImagingStudy() {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomMappingHandler(new DicomToFHIRImagingStudyMapping())
        ));
    }

    /**
     * @param {{ onChunk?: Function, collectOutput?: boolean } | null} options Writer options.
     * @returns {PipelineReadyStage}
     */
    toDicomData(options = null) {
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomDataWriterHandler(options)
        ));
    }

    /** @returns {PipelineReadyStage} */
    toJsonValue() {

        if (this.parser instanceof XmlDataParser) {
            return this.withHandler(new XmlDataHandler());
        }

        return this.withHandler(new JsonDataHandler());

    }

    /**
     * @param {object | null} options Asset extraction options.
     * @returns {PipelineReadyStage}
     */
    toAssets(options = null) {
        return this.withHandler(new DicomAssetsHandler(options, this._operations?.codecRegistry));
    }

    /**
     * @param {object | null} options Asset archive options.
     * @returns {PipelineReadyStage}
     */
    toAssetArchive(options = null) {
        return this.withHandler(new DicomAssetArchiveHandler(options, this._operations?.codecRegistry));
    }

}
