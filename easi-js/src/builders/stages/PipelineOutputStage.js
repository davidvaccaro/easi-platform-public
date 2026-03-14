import PipelineBuilderStage from "./PipelineBuilderStage.js";

import ByteStreamWriter from "../../writers/ByteStreamWriter.js";
import PartStreamWriter from "../../writers/PartStreamWriter.js";
import FileStreamWriter from "../../writers/FileStreamWriter.js";
import BrowserFileStreamWriter from "../../writers/BrowserFileStreamWriter.js";
import NodeStreamAdapterWriter from "../../writers/NodeStreamAdapterWriter.js";
import WebSocketStreamWriter from "../../writers/WebSocketStreamWriter.js";
import HttpStreamWriter from "../../writers/HttpStreamWriter.js";

/**
 * Output stage.
 *
 * Responsible for optional outbound streaming destination (`into*`) and `build()`.
 */
export default class PipelineOutputStage extends PipelineBuilderStage {

    /**
     * Set the current output writer sink.
     * @param {object} writer The outbound writer.
     * @param {*} target Optional outbound writer target.
     * @param {object | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    withWriter(writer, target = null, options = null) {
        return this.cloneCurrentStage(
            (session) => session.withWriter(writer, target, options)
        );
    }

    /**
     * Route terminal output to a byte writer sink.
     * @param {object | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoByteStream(options = null) {
        return this.withWriter(new ByteStreamWriter(), null, options);
    }

    /**
     * Route terminal output to a part writer sink.
     * @param {object | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoPartStream(options = null) {
        return this.withWriter(new PartStreamWriter(), null, options);
    }

    /**
     * Route terminal output to a file writer sink.
     * @param {string} filePath The target file path.
     * @param {object | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoFileStream(filePath, options = null) {
        return this.withWriter(new FileStreamWriter(), filePath, options);
    }

    /**
     * Route terminal output to a browser file writable stream sink.
     * @param {object} target The FileSystemWritableFileStream or FileSystemFileHandle target.
     * @param {object | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoBrowserFileStream(target, options = null) {
        return this.withWriter(new BrowserFileStreamWriter(), target, options);
    }

    /**
     * Route terminal output to a Node writable stream sink.
     * @param {object} writable The Node writable stream.
     * @param {object | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoNodeStreamAdapter(writable, options = null) {
        return this.withWriter(new NodeStreamAdapterWriter(), writable, options);
    }

    /**
     * Route terminal output to a WebSocket sink.
     * @param {object} socket The target socket.
     * @param {object | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoWebSocketStream(socket, options = null) {
        return this.withWriter(new WebSocketStreamWriter(), socket, options);
    }

    /**
     * Route terminal output to an HTTP request sink.
     * @param {string | object} request The request URL or request descriptor.
     * @param {object | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoHttpStream(request, options = null) {
        return this.withWriter(new HttpStreamWriter(), request, options);
    }

    /**
     * Build a new pipeline instance.
     * @returns {object} The built pipeline.
     */
    build() {
        return this.buildCurrentPipeline();
    }

}
