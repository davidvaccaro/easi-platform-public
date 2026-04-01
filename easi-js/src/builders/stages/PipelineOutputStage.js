//
// PipelineOutputStage.js
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

import PipelineBuilderStage from "./PipelineBuilderStage.js";

import ByteStreamWriter from "../../writers/ByteStreamWriter.js";
import PartStreamWriter from "../../writers/PartStreamWriter.js";
import FileStreamWriter from "../../writers/FileStreamWriter.js";
import BrowserFileStreamWriter from "../../writers/BrowserFileStreamWriter.js";
import NodeStreamAdapterWriter from "../../writers/NodeStreamAdapterWriter.js";
import WebSocketStreamWriter from "../../writers/WebSocketStreamWriter.js";
import HttpStreamWriter from "../../writers/HttpStreamWriter.js";
import DimseAssociationWriter from "../../writers/DimseAssociationWriter.js";

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
     * Route terminal output to a DIMSE association destination sink.
     * @param {object | null} association The DIMSE destination association options.
     * @param {object | null} options Optional write options (`options.transport` should provide DIMSE transport).
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoDimseAssociation(association = null, options = null) {

        var transport = null;
        if ((options != null)
            && (typeof options === "object")
            && (Object.prototype.hasOwnProperty.call(options, "transport") == true)) {
            transport = options.transport;
        }

        return this.withWriter(new DimseAssociationWriter(transport), association, options);

    }

    /**
     * Build a new pipeline instance.
     * @returns {object} The built pipeline.
     */
    build() {
        return this.buildCurrentPipeline();
    }

}
