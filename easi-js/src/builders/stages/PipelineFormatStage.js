import DicomDataParser from "../../parsers/DicomDataParser.js";
import ByteDataParser from "../../parsers/ByteDataParser.js";
import JsonDataParser from "../../parsers/JsonDataParser.js";
import XmlDataParser from "../../parsers/XmlDataParser.js";

import PipelineBuilderStage from "./PipelineBuilderStage.js";
import PipelineTargetStage from "./PipelineTargetStage.js";

/**
 * Format stage.
 *
 * Responsible for parser-format declaration only.
 */
export default class PipelineFormatStage extends PipelineBuilderStage {

    /**
     * Set the current parser.
     * @param {DicomDataParser | ByteDataParser | JsonDataParser | XmlDataParser} parser The parser used to parse source content.
     * @returns {PipelineTargetStage} A target stage reference.
     */
    withParser(parser) {
        return this.nextStage(
            (session) => session.withParser(parser),
            PipelineTargetStage
        );
    }

    /** @returns {PipelineTargetStage} */
    ofDicomData() {
        return this.withParser(new DicomDataParser());
    }

    /** @returns {PipelineTargetStage} */
    ofByteData() {
        return this.withParser(new ByteDataParser());
    }

    /** @returns {PipelineTargetStage} */
    ofJsonData() {
        return this.withParser(new JsonDataParser());
    }

    /** @returns {PipelineTargetStage} */
    ofXmlData() {
        return this.withParser(new XmlDataParser());
    }

    /** @returns {PipelineTargetStage} */
    ofDicomMetadata() {
        return this.withParser(new JsonDataParser());
    }

    /** @returns {PipelineTargetStage} */
    ofDicomXmlMetadata() {
        return this.withParser(new XmlDataParser());
    }

}
