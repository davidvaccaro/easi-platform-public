//
// WritableStreamWriter.js
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

import Exception from "../environment/Exception.js";
import { GeneralErrorCodes } from "../environment/Exception.js";
import PartStreamWriter from "./PartStreamWriter.js";

export default class WritableStreamWriter {

    /**
     * Resolve one generic writable target.
     * @param {object} target The writable target.
     * @returns {{ kind: 'web' | 'object', sink: object, release?: Function }} Resolved writable sink.
     */
    resolveSink(target) {

        if (target == null) {
            throw new Exception(
                "Invalid writable stream target.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        if (typeof target.getWriter === "function") {
            var writer = target.getWriter();
            if ((writer == null) || (typeof writer.write !== "function")) {
                throw new Exception(
                    "Invalid writable stream target.",
                    GeneralErrorCodes.InvalidParameter
                );
            }

            return {
                kind: "web",
                sink: writer,
                release: () => {
                    if (typeof writer.releaseLock === "function") {
                        writer.releaseLock();
                    }
                }
            };
        }

        if (typeof target.write === "function") {
            return {
                kind: "object",
                sink: target
            };
        }

        throw new Exception(
            "Invalid writable stream target.",
            GeneralErrorCodes.InvalidParameter
        );

    }

    /**
     * Write one chunk to the resolved writable sink.
     * @param {{ kind: 'web' | 'object', sink: object }} resolved The resolved sink.
     * @param {Uint8Array} chunk One output chunk.
     */
    async writeChunk(resolved, chunk) {

        if (resolved.kind === "web") {
            await resolved.sink.write(chunk);
            return;
        }

        var payload = chunk;
        if (typeof Buffer !== "undefined") {
            payload = Buffer.from(chunk);
        }

        var result = resolved.sink.write(payload);
        if ((result != null) && (typeof result.then === "function")) {
            await result;
            return;
        }

        if ((result === false) && (typeof resolved.sink.once === "function")) {
            await new Promise((resolve, reject) => {

                var onDrain = () => {
                    cleanup();
                    resolve();
                };

                var onError = (error) => {
                    cleanup();
                    reject(error ?? new Exception("Writable stream write failed.", GeneralErrorCodes.GeneralError));
                };

                var cleanup = () => {
                    if (typeof resolved.sink.removeListener === "function") {
                        resolved.sink.removeListener("drain", onDrain);
                        resolved.sink.removeListener("error", onError);
                    }
                };

                resolved.sink.once("drain", onDrain);
                resolved.sink.once("error", onError);

            });
        }

    }

    /**
     * Close/end one resolved sink when configured.
     * @param {{ kind: 'web' | 'object', sink: object, release?: Function }} resolved The resolved sink.
     * @param {object} options Write options.
     */
    async closeSink(resolved, options = {}) {

        if (options.closeOnDone === false)
            return;

        if (resolved.kind === "web") {
            if (typeof resolved.sink.close === "function") {
                await resolved.sink.close();
            }
            return;
        }

        if ((options.end !== false) && (typeof resolved.sink.end === "function")) {
            await new Promise((resolve, reject) => {

                var onFinish = () => {
                    cleanup();
                    resolve();
                };

                var onError = (error) => {
                    cleanup();
                    reject(error ?? new Exception("Writable stream end failed.", GeneralErrorCodes.GeneralError));
                };

                var cleanup = () => {
                    if (typeof resolved.sink.removeListener === "function") {
                        resolved.sink.removeListener("finish", onFinish);
                        resolved.sink.removeListener("error", onError);
                    }
                };

                if (typeof resolved.sink.once === "function") {
                    resolved.sink.once("finish", onFinish);
                    resolved.sink.once("error", onError);
                }

                resolved.sink.end();

            });
            return;
        }

        if (typeof resolved.sink.close === "function") {
            await resolved.sink.close();
        }

    }

    /**
     * Abort one resolved sink.
     * @param {{ kind: 'web' | 'object', sink: object }} resolved The resolved sink.
     * @param {Error | null} error Optional error.
     */
    async abortSink(resolved, error = null) {

        if (resolved.kind === "web") {
            if (typeof resolved.sink.abort === "function") {
                await resolved.sink.abort(error);
            }
            return;
        }

        if (typeof resolved.sink.destroy === "function") {
            resolved.sink.destroy(error);
            return;
        }

        if (typeof resolved.sink.abort === "function") {
            await resolved.sink.abort(error);
        }

    }

    /**
     * Write one payload to a generic writable stream target.
     * @param {object} target The writable target.
     * @param {Uint8Array | Array<unknown> | object} source The source payload.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number, closeOnDone?: boolean, abortOnError?: boolean, end?: boolean } | null} options Optional write options.
     * @returns {Promise<object>} The write result.
     */
    async write(target, source, options = null) {

        if (options == null) {
            options = {};
        }

        var resolved = this.resolveSink(target);
        var existingOnChunk = options.onChunk || null;
        var writerOptions = Object.assign({}, options, {
            collectOutput: false,
            onChunk: async (chunk) => {
                await this.writeChunk(resolved, chunk);
                if (existingOnChunk != null) {
                    await existingOnChunk(chunk);
                }
            }
        });

        delete writerOptions.closeOnDone;
        delete writerOptions.abortOnError;
        delete writerOptions.end;

        try {

            var result = await this._partWriter.write(source, writerOptions);
            await this.closeSink(resolved, options);

            return result;

        }
        catch (error) {

            if (options.abortOnError !== false) {
                try {
                    await this.abortSink(resolved, error);
                }
                catch (_abortError) {
                }
            }

            throw error;

        }
        finally {

            if (typeof resolved.release === "function") {
                resolved.release();
            }

        }

    }

    /**
     * Create one writable stream writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     */
    constructor(options = null) {
        this._partWriter = new PartStreamWriter(options);
    }

}
