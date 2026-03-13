import PartStreamReader from "../../readers/PartStreamReader.js";
import FetchStreamReader from "../../readers/FetchStreamReader.js";
import ByteStreamReader from "../../readers/ByteStreamReader.js";
import FileStreamReader from "../../readers/FileStreamReader.js";
import WebSocketStreamReader from "../../readers/WebSocketStreamReader.js";
import NodeStreamAdapterReader from "../../readers/NodeStreamAdapterReader.js";

import PipelineBuilderStage from "./PipelineBuilderStage.js";
import PipelineFormatStage from "./PipelineFormatStage.js";

/**
 * Source stage.
 *
 * Responsible for source transport/framing (`from*`) only.
 * Parser format selection is intentionally hosted in `PipelineFormatStage`.
 */
export default class PipelineSourceStage extends PipelineBuilderStage {

    /**
     * Set the current reader.
     * @param {object} reader The reader used to process source input.
     * @returns {PipelineFormatStage} A format stage reference.
     */
    withReader(reader) {
        return this.nextStage(
            (session) => session.withReader(reader),
            PipelineFormatStage
        );
    }

    /** @returns {PipelineFormatStage} */
    fromPartStream() {
        return this.withReader(new PartStreamReader());
    }

    /** @returns {PipelineFormatStage} */
    fromFetchStream() {
        return this.withReader(new FetchStreamReader(new PartStreamReader()));
    }

    /** @returns {PipelineFormatStage} */
    fromByteStream() {
        return this.withReader(new ByteStreamReader(new PartStreamReader()));
    }

    /** @returns {PipelineFormatStage} */
    fromFileStream() {
        return this.withReader(new FileStreamReader(new PartStreamReader()));
    }

    /** @returns {PipelineFormatStage} */
    fromWebSocketStream() {
        return this.withReader(new WebSocketStreamReader(new PartStreamReader()));
    }

    /** @returns {PipelineFormatStage} */
    fromNodeStreamAdapter() {
        return this.withReader(new NodeStreamAdapterReader(new PartStreamReader()));
    }

}
