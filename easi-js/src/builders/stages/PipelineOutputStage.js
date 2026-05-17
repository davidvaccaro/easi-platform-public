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
import WritableStreamWriter from "../../writers/WritableStreamWriter.js";
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
     * @param {{
     *   onChunk?: Function,
     *   collectOutput?: boolean,
     *   chunkSize?: number,
     *   isMultiPart?: boolean,
     *   contentType?: string,
     *   boundary?: string,
     *   partContentType?: string,
     *   partHeaders?: object,
     *   includeContentLength?: boolean,
     *   type?: string,
     *   transferSyntax?: string,
     *   start?: string,
     *   startInfo?: string,
     *   closeOnDone?: boolean,
     *   abortOnError?: boolean,
     *   end?: boolean,
     *   stream?: boolean,
     *   stow?: boolean | {
     *     strict?: boolean,
     *     requirePostMethod?: boolean,
     *     enforceMultipart?: boolean,
     *     requestType?: string,
     *     partContentType?: string,
     *     accept?: string,
     *     enforceSuccessfulStatus?: boolean,
     *     allowedStatuses?: Array<number>
     *   },
     *   transport?: object
     * } | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    withWriter(writer, target = null, options = null) {
        return this.cloneCurrentStage(
            (session) => session.withWriter(writer, target, options)
        );
    }

    /**
     * Route terminal output to a byte writer sink.
     * @param {{
     *   onChunk?: Function,
     *   collectOutput?: boolean,
     *   chunkSize?: number,
     *   isMultiPart?: boolean,
     *   contentType?: string,
     *   boundary?: string,
     *   partContentType?: string,
     *   partHeaders?: object,
     *   includeContentLength?: boolean,
     *   type?: string,
     *   transferSyntax?: string,
     *   start?: string,
     *   startInfo?: string
     * } | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoByteBuffer(options = null) {
        return this.withWriter(new ByteStreamWriter(), null, options);
    }

    /**
     * Route terminal output to a part writer sink.
     * @param {{
     *   onChunk?: Function,
     *   collectOutput?: boolean,
     *   chunkSize?: number,
     *   isMultiPart?: boolean,
     *   contentType?: string,
     *   boundary?: string,
     *   partContentType?: string,
     *   partHeaders?: object,
     *   includeContentLength?: boolean,
     *   type?: string,
     *   transferSyntax?: string,
     *   start?: string,
     *   startInfo?: string
     * } | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoPartBuffer(options = null) {
        return this.withWriter(new PartStreamWriter(), null, options);
    }

    /**
     * Route terminal output to a file writer sink.
     * @param {string | {
     *   path?: string,
     *   stream?: boolean,
     *   onChunk?: Function,
     *   collectOutput?: boolean,
     *   chunkSize?: number
     * } | null} filePathOrOptions The target file path or write options when late-binding destination.
     * @param {{
     *   stream?: boolean,
     *   onChunk?: Function,
     *   collectOutput?: boolean,
     *   chunkSize?: number,
     *   isMultiPart?: boolean,
     *   contentType?: string,
     *   boundary?: string,
     *   partContentType?: string,
     *   partHeaders?: object,
     *   includeContentLength?: boolean,
     *   type?: string,
     *   transferSyntax?: string,
     *   start?: string,
     *   startInfo?: string
     * } | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoFileStream(filePathOrOptions = null, options = null) {
        var filePath = filePathOrOptions;
        if ((filePathOrOptions != null)
            && (typeof filePathOrOptions === "object")
            && (Array.isArray(filePathOrOptions) == false)) {
            filePath = null;
            options = filePathOrOptions;
        }
        return this.withWriter(new FileStreamWriter(), filePath, options);
    }

    /**
     * Route terminal output to a browser file writable stream sink.
     * @param {object | null} targetOrOptions The FileSystemWritableFileStream or FileSystemFileHandle target or write options when late-binding destination.
     * @param {{
     *   closeOnDone?: boolean,
     *   abortOnError?: boolean,
     *   onChunk?: Function,
     *   collectOutput?: boolean,
     *   chunkSize?: number,
     *   isMultiPart?: boolean,
     *   contentType?: string,
     *   boundary?: string,
     *   partContentType?: string,
     *   partHeaders?: object,
     *   includeContentLength?: boolean,
     *   type?: string,
     *   transferSyntax?: string,
     *   start?: string,
     *   startInfo?: string
     * } | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoBrowserFileStream(targetOrOptions = null, options = null) {
        var target = targetOrOptions;
        if ((targetOrOptions != null)
            && (typeof targetOrOptions === "object")
            && (Array.isArray(targetOrOptions) == false)
            && ((typeof targetOrOptions.write === "function")
                || (typeof targetOrOptions.createWritable === "function")) == false) {
            target = null;
            options = targetOrOptions;
        }
        return this.withWriter(new BrowserFileStreamWriter(), target, options);
    }

    /**
     * Route terminal output to a Node writable stream sink.
     * @param {object | null} writableOrOptions The Node writable stream or write options when late-binding destination.
     * @param {{
     *   end?: boolean,
     *   onChunk?: Function,
     *   collectOutput?: boolean,
     *   chunkSize?: number,
     *   isMultiPart?: boolean,
     *   contentType?: string,
     *   boundary?: string,
     *   partContentType?: string,
     *   partHeaders?: object,
     *   includeContentLength?: boolean,
     *   type?: string,
     *   transferSyntax?: string,
     *   start?: string,
     *   startInfo?: string
     * } | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoNodeStreamAdapter(writableOrOptions = null, options = null) {
        var writable = writableOrOptions;
        if ((writableOrOptions != null)
            && (typeof writableOrOptions === "object")
            && (Array.isArray(writableOrOptions) == false)
            && (typeof writableOrOptions.write !== "function")) {
            writable = null;
            options = writableOrOptions;
        }
        return this.withWriter(new NodeStreamAdapterWriter(), writable, options);
    }

    /**
     * Route terminal output to a generic writable stream/sink.
     * @param {object | null} writableOrOptions WritableStream/sink target or write options when late-binding destination.
     * @param {{
     *   closeOnDone?: boolean,
     *   abortOnError?: boolean,
     *   end?: boolean,
     *   onChunk?: Function,
     *   collectOutput?: boolean,
     *   chunkSize?: number,
     *   isMultiPart?: boolean,
     *   contentType?: string,
     *   boundary?: string,
     *   partContentType?: string,
     *   partHeaders?: object,
     *   includeContentLength?: boolean,
     *   type?: string,
     *   transferSyntax?: string,
     *   start?: string,
     *   startInfo?: string
     * } | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoWritableStream(writableOrOptions = null, options = null) {
        var writable = writableOrOptions;
        if ((writableOrOptions != null)
            && (typeof writableOrOptions === "object")
            && (Array.isArray(writableOrOptions) == false)
            && ((typeof writableOrOptions.write === "function")
                || (typeof writableOrOptions.getWriter === "function")) == false) {
            writable = null;
            options = writableOrOptions;
        }
        return this.withWriter(new WritableStreamWriter(), writable, options);
    }

    /**
     * Route terminal output to a WebSocket sink.
     * @param {object | null} socketOrOptions The target socket or write options when late-binding destination.
     * @param {{
     *   closeOnDone?: boolean,
     *   onChunk?: Function,
     *   collectOutput?: boolean,
     *   chunkSize?: number,
     *   isMultiPart?: boolean,
     *   contentType?: string,
     *   boundary?: string,
     *   partContentType?: string,
     *   partHeaders?: object,
     *   includeContentLength?: boolean,
     *   type?: string,
     *   transferSyntax?: string,
     *   start?: string,
     *   startInfo?: string
     * } | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoWebSocketStream(socketOrOptions = null, options = null) {
        var socket = socketOrOptions;
        if ((socketOrOptions != null)
            && (typeof socketOrOptions === "object")
            && (Array.isArray(socketOrOptions) == false)
            && (typeof socketOrOptions.send !== "function")) {
            socket = null;
            options = socketOrOptions;
        }
        return this.withWriter(new WebSocketStreamWriter(), socket, options);
    }

    /**
     * Route terminal output to an HTTP request sink.
     * @param {string | {
     *   endpoint?: string,
     *   url?: string,
     *   href?: string,
     *   method?: string,
     *   headers?: object,
     *   credentials?: string
     * } | null} requestOrOptions The request URL/descriptor or write options when late-binding destination.
     * @param {{
     *   stream?: boolean,
     *   stow?: boolean | {
     *     strict?: boolean,
     *     requirePostMethod?: boolean,
     *     enforceMultipart?: boolean,
     *     requestType?: string,
     *     partContentType?: string,
     *     accept?: string,
     *     enforceSuccessfulStatus?: boolean,
     *     allowedStatuses?: Array<number>
     *   },
     *   onChunk?: Function,
     *   collectOutput?: boolean,
     *   chunkSize?: number,
     *   isMultiPart?: boolean,
     *   contentType?: string,
     *   boundary?: string,
     *   partContentType?: string,
     *   partHeaders?: object,
     *   includeContentLength?: boolean,
     *   type?: string,
     *   transferSyntax?: string,
     *   start?: string,
     *   startInfo?: string
     * } | null} options Optional writer options.
     * @returns {PipelineOutputStage} A new output stage object.
     */
    intoHttpStream(requestOrOptions = null, options = null) {
        var request = requestOrOptions;
        if ((requestOrOptions != null)
            && (typeof requestOrOptions === "object")
            && (Array.isArray(requestOrOptions) == false)
            && ((Object.prototype.hasOwnProperty.call(requestOrOptions, "url") == false)
                && (Object.prototype.hasOwnProperty.call(requestOrOptions, "href") == false))) {
            request = null;
            options = requestOrOptions;
        }
        return this.withWriter(new HttpStreamWriter(), request, options);
    }

    /**
     * Route terminal output to a DIMSE association destination sink.
     * @param {object | null} association The DIMSE destination association options.
     * @param {{ transport?: object } | null} options Optional write options (`options.transport` should provide DIMSE transport).
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
