//
// ByteDataParser.js - 1.0.0
//
// Raw Byte Data Parser Class
//

import DataParser from "./DataParser.js";
import Exception from "../environment/Exception.js";
import { GeneralErrorCodes } from "../environment/Exception.js";
import { Status } from "./Status.js";

export default class ByteDataParser extends DataParser {

    /**
     * Finalize one byte parse transaction.
     * @returns {Promise<*>} The handler end result.
     */
    async finalize() {

        var bytes = new Uint8Array(0);
        if ((this.data != null) && (this.data.length() > 0)) {
            bytes = this.data.consume(this.data.length());
        }

        return super.fireStreamEvent("onEnd", {
            bytes: bytes,
            contentType: this.contentType,
            sourceFormat: "byte"
        }, this.status);

    }

    /**
     * Parse the supplied chunk of raw bytes.
     * @param {Uint8Array} chunk The source chunk.
     * @param {boolean} isDone Indicates this is the final chunk.
     * @param {number | null} totalRead Optional total read count.
     * @param {number | null} totalLength Optional total length.
     * @param {object | null} contentType Optional parsed content-type metadata.
     * @returns {Promise<string>} The parse status.
     */
    async parse(chunk, isDone = false, totalRead = null, totalLength = null, contentType = null) {

        try {

            if (this.data == null) {
                this.reset();
            }

            if (this.isStarted == false) {
                this.context = await super.fireStreamEvent("onStart", this.context, this.status);
                this.isStarted = true;
            }

            var chunkLength = 0;
            if ((chunk != null) && (chunk.length > 0)) {

                this.data.append(chunk);
                chunkLength = chunk.length;
                this.totalBytesConsumed += chunkLength;

                var dataStatus = await super.fireStreamEvent("onData", chunk, this.status);
                if ((dataStatus == Status.JUMP) || (dataStatus == Status.STOP) || (dataStatus == Status.FAIL)) {
                    this.status = dataStatus;
                }

            }

            if (totalRead != null) {
                this.bytesRead = totalRead;
            }
            else {
                this.bytesRead += chunkLength;
            }

            this.bytesTotal = totalLength;

            if (contentType != null) {
                this.contentType = contentType;
                if ((this.context != null) && (typeof this.context == "object")) {
                    this.context.contentType = contentType;
                }
            }

            if (this.status == Status.CONTINUE) {
                var progressStatus = await super.fireProgressEvent(this.status);
                if ((progressStatus == Status.JUMP) || (progressStatus == Status.STOP) || (progressStatus == Status.FAIL)) {
                    this.status = progressStatus;
                }
            }

            if ((this.status == Status.STOP) || (this.status == Status.JUMP)) {

                var terminalStatus = this.status;
                this.result = await this.finalize();
                this.reset();
                return terminalStatus;

            }

            if (this.status == Status.FAIL) {
                var failedStatus = this.status;
                this.reset();
                return failedStatus;
            }

            if (isDone == true) {
                this.result = await this.finalize();
                this.reset();
                return Status.SUCCESS;
            }

            return Status.CONTINUE;

        }
        catch (error) {

            this.status = Status.FAIL;

            await super.fireStreamEvent("onError", error);
            this.reset();

            if ((error instanceof Exception) == false) {
                this.error = new Exception("Failed parsing byte data.", GeneralErrorCodes.GeneralError, error);
            }
            else {
                this.error = error;
            }

            return Status.FAIL;

        }

    }

    /**
     * Reset parser state.
     */
    reset() {
        super.reset();
        this.isStarted = false;
        this.contentType = null;
    }

    /**
     * Create one byte-data parser.
     */
    constructor() {
        super();
        this.isStarted = false;
        this.contentType = null;
    }

}
