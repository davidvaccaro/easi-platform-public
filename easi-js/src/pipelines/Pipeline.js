//
// Pipeline.js
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

export default class Pipeline {

    /**
     * Clone one start options object to reader-read options (removing lifecycle control fields).
     * @param {any} options Optional start/read options.
     * @returns {any} Reader options.
     */
    toReadOptions(options = null) {

        if ((options == null) || (typeof options !== "object"))
            return options;

        var readOptions = Object.assign({}, options);
        delete readOptions.onResult;
        delete readOptions.onError;
        delete readOptions.continueOnError;
        delete readOptions.signal;
        delete readOptions.maxIterations;

        return readOptions;

    }

    /**
     * Determine if this pipeline can run in source-bound listener mode.
     * @returns {boolean} TRUE when the underlying reader supports source-bound lifecycle usage.
     */
    isSourceBound() {
        return ((this._reader != null) && (this._reader.isSourceBound === true));
    }

    /**
     * Attempt to stop/close the active reader lifecycle.
     * @param {any} source Optional source value used by lifecycle readers.
     * @param {any} readOptions Reader options.
     * @returns {Promise<void>}
     */
    async stopReaderLifecycle(source = null, readOptions = null) {

        if (this._reader == null)
            return;

        if (typeof this._reader.stop === "function") {
            await this._reader.stop(source, readOptions);
            return;
        }

        if (typeof this._reader.close === "function") {
            await this._reader.close();
        }

    }

    /**
     * Process one source through the configured reader/parser/handler pipeline.
     * @param {any} source The input source passed to the configured reader.
     * @param {any} options Optional source options passed to the configured reader (for example reader-specific `onEmit`).
     * @returns {Promise<any>} The terminal pipeline output.
     */
    process(source, options = null) {

        const execute = async () => {

            const result = await this._reader.read(source, options);

            if (this._onResult == null)
                return result;

            return this._onResult(result, options);

        };

        // Serialize process calls on one pipeline instance so parser/handler state
        // remains transaction-safe even when callers invoke process concurrently.
        const current = this._processQueue.then(execute, execute);

        // Keep the queue alive regardless of failures from this transaction.
        this._processQueue = current.then(
            () => undefined,
            () => undefined
        );

        return current;

    }

    /**
     * Start one source-bound processing loop.
     *
     * This lifecycle API is intended for source-bound readers (for example DIMSE listener pipelines)
     * that do not require caller-provided payloads for each transaction.
     *
     * @param {any} source Optional source override passed to the configured reader.
     * @param {{ onResult?: Function | null, onError?: Function | null, continueOnError?: boolean, signal?: AbortSignal | null, maxIterations?: number } | null} options Optional start/read options.
     * @returns {{ stop: Function, done: Promise<void>, running: boolean, iterations: number }} Run handle.
     */
    start(source = null, options = null) {

        if (this._runState != null) {
            throw new Exception(
                "Pipeline is already running. Call stop() before starting again.",
                GeneralErrorCodes.GeneralError
            );
        }

        if ((this.isSourceBound() == false) && (typeof this._reader?.start !== "function")) {
            throw new Exception(
                "Pipeline.start is only supported for source-bound readers. Use process(source) for caller-provided sources.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var normalizedOptions = ((options != null) && (typeof options === "object"))
            ? options
            : {};

        var onResult = normalizedOptions.onResult;
        if ((onResult != null) && (typeof onResult !== "function")) {
            throw new Exception(
                'Invalid "onResult" option. Expected function or null.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        var onError = normalizedOptions.onError;
        if ((onError != null) && (typeof onError !== "function")) {
            throw new Exception(
                'Invalid "onError" option. Expected function or null.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        var continueOnError = (normalizedOptions.continueOnError === true);
        var signal = normalizedOptions.signal ?? null;
        var maxIterations = Number(normalizedOptions.maxIterations ?? 0);
        if ((Number.isFinite(maxIterations) == false) || (maxIterations < 0)) {
            throw new Exception(
                'Invalid "maxIterations" option. Expected non-negative number.',
                GeneralErrorCodes.InvalidParameter
            );
        }
        maxIterations = Math.trunc(maxIterations);

        var readOptions = this.toReadOptions(normalizedOptions);
        var runState = {
            running: true,
            stopping: false,
            iterations: 0,
            stop: null,
            done: null
        };

        this._runState = runState;

        var lifecycleStopped = false;
        const stopLifecycleOnce = async () => {

            if (lifecycleStopped === true)
                return;

            lifecycleStopped = true;
            await this.stopReaderLifecycle(source, readOptions);

        };

        const requestStop = async () => {

            if (runState.stopping === true)
                return runState.done;

            runState.stopping = true;
            runState.running = false;

            try {
                await stopLifecycleOnce();
            }
            catch (_error) {
                // Lifecycle close failures are surfaced through runState.done.
            }

            return runState.done;

        };

        runState.stop = requestStop;
        runState.done = (async () => {

            try {

                if ((signal != null) && (signal.aborted === true)) {
                    runState.running = false;
                    return;
                }

                if (typeof this._reader.start === "function") {
                    await this._reader.start(source, readOptions);
                }

                while (runState.running === true) {

                    if ((signal != null) && (signal.aborted === true)) {
                        runState.running = false;
                        break;
                    }

                    try {

                        var result = await this.process(source, readOptions);
                        runState.iterations += 1;

                        if (onResult != null) {
                            var resultDecision = await onResult(result, {
                                iterations: runState.iterations,
                                source,
                                options: readOptions
                            });

                            if (resultDecision === false) {
                                runState.running = false;
                                break;
                            }
                        }

                        if ((maxIterations > 0) && (runState.iterations >= maxIterations)) {
                            runState.running = false;
                            break;
                        }

                    }
                    catch (error) {

                        if (runState.stopping === true) {
                            runState.running = false;
                            break;
                        }

                        var shouldContinue = continueOnError;

                        if (onError != null) {
                            var errorDecision = await onError(error, {
                                iterations: runState.iterations,
                                source,
                                options: readOptions
                            });

                            if (errorDecision === false) {
                                runState.running = false;
                                break;
                            }

                            if (errorDecision === true) {
                                shouldContinue = true;
                            }
                        }

                        if (shouldContinue === true) {
                            continue;
                        }

                        throw error;

                    }

                }

            }
            finally {

                runState.running = false;
                this._runState = null;
                await stopLifecycleOnce();

            }

        })();

        if (signal != null) {

            const onAbort = () => {
                requestStop();
            };

            if (signal.aborted === true) {
                onAbort();
            }
            else {
                signal.addEventListener("abort", onAbort, { once: true });
                runState.done.finally(() => {
                    signal.removeEventListener("abort", onAbort);
                });
            }

        }

        return {
            stop: () => runState.stop(),
            done: runState.done,
            get running() {
                return runState.running;
            },
            get iterations() {
                return runState.iterations;
            }
        };

    }

    /**
     * Stop the active processing loop started by start().
     * @returns {Promise<void>} Resolves when the active run stops.
     */
    async stop() {

        if (this._runState == null)
            return;

        await this._runState.stop();
        await this._runState.done;

    }

    /**
     * Get the configured reader.
     * @returns {object} The configured reader.
     */
    get reader() {
        return this._reader;
    }

    /**
     * Get the configured parser.
     * @returns {object | null} The configured parser.
     */
    get parser() {
        return (this._reader != null) ? this._reader.parser : null;
    }

    /**
     * Get the configured top-level handler.
     * @returns {object | null} The configured handler.
     */
    get handler() {
        var parser = this.parser;
        return (parser != null) ? parser.handler : null;
    }

    /**
     * Create a pipeline.
     * @param {object} reader The configured reader.
     * @param {Function | null} onResult Optional result sink invoked after each process call result.
     */
    constructor(reader, onResult = null) {
        this._reader = reader;
        this._onResult = onResult;
        this._processQueue = Promise.resolve();
        this._runState = null;
    }

};
