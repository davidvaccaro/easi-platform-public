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
import PipelineResultCollection from "./PipelineResultCollection.js";

export default class Pipeline {

    /**
     * Normalize one process result to a stable result collection shape.
     * @param {*} result The source process result.
     * @returns {PipelineResultCollection} Normalized result collection.
     */
    normalizeResult(result) {
        return PipelineResultCollection.from(result);
    }

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
        delete readOptions.lifecycle;

        return readOptions;

    }

    /**
     * Determine whether one value appears to be a process envelope.
     * @param {any} value Candidate process argument.
     * @returns {boolean} TRUE when value is a process envelope.
     */
    isProcessEnvelope(value) {

        if ((value == null) || (typeof value !== "object") || (Array.isArray(value) == true))
            return false;

        return (
            (Object.prototype.hasOwnProperty.call(value, "source") == true)
            || (Object.prototype.hasOwnProperty.call(value, "destination") == true)
            || (Object.prototype.hasOwnProperty.call(value, "sourceOptions") == true)
            || (Object.prototype.hasOwnProperty.call(value, "destinationOptions") == true)
            || (Object.prototype.hasOwnProperty.call(value, "options") == true)
        );

    }

    /**
     * Determine whether one value appears to be structured process options.
     * @param {any} value Candidate process options value.
     * @returns {boolean} TRUE when structured process options.
     */
    isStructuredProcessOptions(value) {

        if ((value == null) || (typeof value !== "object") || (Array.isArray(value) == true))
            return false;

        return (
            (Object.prototype.hasOwnProperty.call(value, "sourceOptions") == true)
            || (Object.prototype.hasOwnProperty.call(value, "destinationOptions") == true)
            || (Object.prototype.hasOwnProperty.call(value, "options") == true)
        );

    }

    /**
     * Determine whether one value appears to be a start envelope.
     * @param {any} value Candidate start argument.
     * @returns {boolean} TRUE when value is a start envelope.
     */
    isStartEnvelope(value) {

        if ((value == null) || (typeof value !== "object") || (Array.isArray(value) == true))
            return false;

        return (
            (this.isProcessEnvelope(value) == true)
            || (Object.prototype.hasOwnProperty.call(value, "onResult") == true)
            || (Object.prototype.hasOwnProperty.call(value, "onError") == true)
            || (Object.prototype.hasOwnProperty.call(value, "continueOnError") == true)
            || (Object.prototype.hasOwnProperty.call(value, "signal") == true)
            || (Object.prototype.hasOwnProperty.call(value, "maxIterations") == true)
            || (Object.prototype.hasOwnProperty.call(value, "lifecycle") == true)
        );

    }

    /**
     * Determine whether one value appears to be structured start options.
     * @param {any} value Candidate start options value.
     * @returns {boolean} TRUE when structured start options.
     */
    isStructuredStartOptions(value) {

        if ((value == null) || (typeof value !== "object") || (Array.isArray(value) == true))
            return false;

        return (
            (this.isStructuredProcessOptions(value) == true)
            || (Object.prototype.hasOwnProperty.call(value, "onResult") == true)
            || (Object.prototype.hasOwnProperty.call(value, "onError") == true)
            || (Object.prototype.hasOwnProperty.call(value, "continueOnError") == true)
            || (Object.prototype.hasOwnProperty.call(value, "signal") == true)
            || (Object.prototype.hasOwnProperty.call(value, "maxIterations") == true)
            || (Object.prototype.hasOwnProperty.call(value, "lifecycle") == true)
        );

    }

    /**
     * Merge two optional options objects.
     * @param {object | null} defaults Default options.
     * @param {object | null} overrides Override options.
     * @returns {object | null} Merged options.
     */
    mergeOptions(defaults = null, overrides = null) {

        if ((defaults == null) && (overrides == null))
            return null;

        return Object.assign({}, defaults || {}, overrides || {});

    }

    /**
     * Normalize process arguments to one invocation envelope.
     * @param  {...any} args Process call args.
     * @returns {{ source?: any, destination?: any, sourceOptions?: object | null, destinationOptions?: object | null, options?: object | null }} Invocation envelope.
     */
    normalizeProcessInvocation(...args) {

        if (args.length === 0)
            return {};

        if ((args.length === 1) && (this.isProcessEnvelope(args[0]) == true)) {
            return Object.assign({}, args[0]);
        }

        if (args.length === 3) {

            var structured = args[2];
            if ((structured != null)
                && (((typeof structured) !== "object")
                    || (Array.isArray(structured) == true))) {
                throw new Exception(
                    "Invalid process options. Use process(source, destination, { sourceOptions, destinationOptions, options }).",
                    GeneralErrorCodes.InvalidParameter
                );
            }

            if ((structured != null) && (this.isStructuredProcessOptions(structured) == false)) {
                throw new Exception(
                    "Invalid process options object. Expected { sourceOptions, destinationOptions, options }.",
                    GeneralErrorCodes.InvalidParameter
                );
            }

            return Object.assign({
                source: args[0],
                destination: args[1]
            }, structured || {});
        }

        throw new Exception(
            "Invalid process signature. Supported forms: process(), process({ source, destination, sourceOptions, destinationOptions, options }), or process(source, destination, { sourceOptions, destinationOptions, options }).",
            GeneralErrorCodes.InvalidParameter
        );

    }

    /**
     * Normalize start arguments to one invocation envelope.
     * Supported forms:
     * - start()
     * - start({ source, destination, sourceOptions, destinationOptions, options, onResult, onError, continueOnError, signal, maxIterations, lifecycle })
     * - start(source, destination, { sourceOptions, destinationOptions, options, onResult, onError, continueOnError, signal, maxIterations, lifecycle })
     * @param  {...any} args Start call args.
     * @returns {object} Invocation envelope.
     */
    normalizeStartInvocation(...args) {

        if (args.length === 0)
            return {};

        if ((args.length === 1) && (this.isStartEnvelope(args[0]) == true)) {
            return Object.assign({}, args[0]);
        }

        if (args.length === 3) {

            var structured = args[2];
            if ((structured != null)
                && (((typeof structured) !== "object")
                    || (Array.isArray(structured) == true))) {
                throw new Exception(
                    "Invalid start options. Use start(source, destination, { sourceOptions, destinationOptions, options, onResult, onError, continueOnError, signal, maxIterations, lifecycle }).",
                    GeneralErrorCodes.InvalidParameter
                );
            }

            if ((structured != null) && (this.isStructuredStartOptions(structured) == false)) {
                throw new Exception(
                    "Invalid start options object. Expected { sourceOptions, destinationOptions, options, onResult, onError, continueOnError, signal, maxIterations, lifecycle }.",
                    GeneralErrorCodes.InvalidParameter
                );
            }

            return Object.assign({
                source: args[0],
                destination: args[1]
            }, structured || {});
        }

        throw new Exception(
            "Invalid start signature. Supported forms: start(), start({ source, destination, sourceOptions, destinationOptions, options, onResult, onError, continueOnError, signal, maxIterations, lifecycle }), or start(source, destination, { sourceOptions, destinationOptions, options, onResult, onError, continueOnError, signal, maxIterations, lifecycle }).",
            GeneralErrorCodes.InvalidParameter
        );

    }

    /**
     * Resolve one process invocation envelope against build-time defaults.
     * @param {object} invocation Normalized invocation envelope.
     * @returns {{ source: any, destination: any, sourceOptions: object | null, destinationOptions: object | null, options: object | null, sourceProvided: boolean, destinationProvided: boolean }} Resolved process context.
     */
    resolveProcessContext(invocation = {}) {

        var sourceProvided = (Object.prototype.hasOwnProperty.call(invocation, "source") == true);
        var destinationProvided = (Object.prototype.hasOwnProperty.call(invocation, "destination") == true);

        var source = sourceProvided
            ? invocation.source
            : this._defaultSource;

        var destination = destinationProvided
            ? invocation.destination
            : this._defaultDestination;

        var sharedOptions = (
            ((invocation.options != null) && (typeof invocation.options === "object"))
                ? invocation.options
                : null
        );

        var sourceOptions = this.mergeOptions(
            this.mergeOptions(this._defaultSourceOptions, sharedOptions),
            ((invocation.sourceOptions != null) ? invocation.sourceOptions : null)
        );

        var destinationOptions = this.mergeOptions(
            this._defaultDestinationOptions,
            ((invocation.destinationOptions != null) ? invocation.destinationOptions : null)
        );

        return {
            source,
            destination,
            sourceOptions,
            destinationOptions,
            options: sharedOptions,
            sourceProvided,
            destinationProvided
        };

    }

    /**
     * Resolve one start invocation against process defaults and lifecycle controls.
     * @param {object} invocation Normalized start invocation.
     * @returns {{ source: any, destination: any, sourceOptions: object | null, destinationOptions: object | null, options: object | null, sourceProvided: boolean, destinationProvided: boolean, readOptions: object | null, onResult: Function | null, onError: Function | null, continueOnError: boolean, signal: AbortSignal | null, maxIterations: number }} Resolved start context.
     */
    resolveStartContext(invocation = {}) {

        var processInvocation = {};
        if (Object.prototype.hasOwnProperty.call(invocation, "source") == true)
            processInvocation.source = invocation.source;

        if (Object.prototype.hasOwnProperty.call(invocation, "destination") == true)
            processInvocation.destination = invocation.destination;

        if (Object.prototype.hasOwnProperty.call(invocation, "sourceOptions") == true)
            processInvocation.sourceOptions = invocation.sourceOptions;

        if (Object.prototype.hasOwnProperty.call(invocation, "destinationOptions") == true)
            processInvocation.destinationOptions = invocation.destinationOptions;

        if (Object.prototype.hasOwnProperty.call(invocation, "options") == true)
            processInvocation.options = invocation.options;

        var processContext = this.resolveProcessContext(processInvocation);
        var lifecycle = invocation.lifecycle;
        if ((lifecycle != null) && (((typeof lifecycle) !== "object") || (Array.isArray(lifecycle) == true))) {
            throw new Exception(
                'Invalid "lifecycle" option. Expected object or null.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        var onResult = invocation.onResult;
        if ((onResult == null) && (lifecycle != null))
            onResult = lifecycle.onResult;

        if ((onResult != null) && (typeof onResult !== "function")) {
            throw new Exception(
                'Invalid "onResult" option. Expected function or null.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        var onError = invocation.onError;
        if ((onError == null) && (lifecycle != null))
            onError = lifecycle.onError;

        if ((onError != null) && (typeof onError !== "function")) {
            throw new Exception(
                'Invalid "onError" option. Expected function or null.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        var continueOnError = (invocation.continueOnError === true);
        if ((continueOnError == false) && (lifecycle != null))
            continueOnError = (lifecycle.continueOnError === true);

        var signal = invocation.signal ?? null;
        if ((signal == null) && (lifecycle != null))
            signal = lifecycle.signal ?? null;

        var maxIterations = invocation.maxIterations;
        if ((maxIterations == null) && (lifecycle != null))
            maxIterations = lifecycle.maxIterations;

        maxIterations = Number(maxIterations ?? 0);
        if ((Number.isFinite(maxIterations) == false) || (maxIterations < 0)) {
            throw new Exception(
                'Invalid "maxIterations" option. Expected non-negative number.',
                GeneralErrorCodes.InvalidParameter
            );
        }
        maxIterations = Math.trunc(maxIterations);

        var readOptions = this.toReadOptions(processContext.sourceOptions);

        return Object.assign({}, processContext, {
            readOptions,
            onResult,
            onError,
            continueOnError,
            signal,
            maxIterations
        });

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
     * Process one pipeline transaction through the configured reader/parser/handler pipeline.
     * Supported forms:
     * - process()
     * - process({ source, destination, sourceOptions, destinationOptions, options })
     * - process(source, destination, { sourceOptions, destinationOptions, options })
     * @param {any} source Source value or process envelope.
     * @param {any} destination Destination value when using the positional 3-arg form.
     * @param {any} options Structured options object for the positional 3-arg form.
     * @returns {Promise<any>} The terminal pipeline output.
     */
    process(source = null, destination = null, options = null) {

        var processArgs = Array.from(arguments);

        const execute = async () => {

            var invocation = this.normalizeProcessInvocation(...processArgs);
            var context = this.resolveProcessContext(invocation);

            if ((context.source == null) && (this.isSourceBound() == false)) {
                throw new Exception(
                    "Pipeline.process requires a source when no default source is bound in the pipeline.",
                    GeneralErrorCodes.InvalidParameter
                );
            }

            const result = await this._reader.read(context.source, context.sourceOptions);

            if (this._onResult == null)
                return this.normalizeResult(result);

            return this.normalizeResult(await this._onResult(result, {
                source: context.source,
                destination: context.destination,
                sourceOptions: context.sourceOptions,
                destinationOptions: context.destinationOptions,
                options: context.options,
                sourceProvided: context.sourceProvided,
                destinationProvided: context.destinationProvided
            }));

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
     * Supported forms:
     * - start()
     * - start({ source, destination, sourceOptions, destinationOptions, options, onResult, onError, continueOnError, signal, maxIterations, lifecycle })
     * - start(source, destination, { sourceOptions, destinationOptions, options, onResult, onError, continueOnError, signal, maxIterations, lifecycle })
     * @param {any} source Source value or start envelope.
     * @param {any} destination Destination value when using the positional 3-arg form.
     * @param {any} options Structured options object for the positional 3-arg form.
     * @returns {{ stop: Function, done: Promise<void>, running: boolean, iterations: number }} Run handle.
     */
    start(source = null, destination = null, options = null) {

        if (this._runState != null) {
            throw new Exception(
                "Pipeline is already running. Call stop() before starting again.",
                GeneralErrorCodes.GeneralError
            );
        }

        if ((this.isSourceBound() == false) && (typeof this._reader?.start !== "function")) {
            throw new Exception(
                "Pipeline.start is only supported for source-bound readers. Use process({ source }) for caller-provided sources.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var startArgs = Array.from(arguments);
        var invocation = this.normalizeStartInvocation(...startArgs);
        var context = this.resolveStartContext(invocation);

        if ((this._hasWriter === true)
            && (this._writerRequiresDestination === true)
            && (context.destination == null)) {
            throw new Exception(
                "Pipeline.start requires a destination when using the configured writer.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var lifecycleSource = context.source;
        var lifecycleDestination = context.destination;
        var readOptions = context.readOptions;
        var signal = context.signal;
        var maxIterations = context.maxIterations;
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
            await this.stopReaderLifecycle(lifecycleSource, readOptions);

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
                    await this._reader.start(lifecycleSource, readOptions);
                }

                while (runState.running === true) {

                    if ((signal != null) && (signal.aborted === true)) {
                        runState.running = false;
                        break;
                    }

                    try {

                        var result = await this.process(
                            lifecycleSource,
                            lifecycleDestination,
                            {
                                sourceOptions: context.sourceOptions,
                                destinationOptions: context.destinationOptions,
                                options: context.options
                            }
                        );
                        runState.iterations += 1;

                        if (context.onResult != null) {
                            var resultDecision = await context.onResult(result, {
                                iterations: runState.iterations,
                                source: lifecycleSource,
                                destination: lifecycleDestination,
                                sourceOptions: context.sourceOptions,
                                destinationOptions: context.destinationOptions,
                                options: context.options,
                                readOptions: readOptions
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

                        var shouldContinue = context.continueOnError;

                        if (context.onError != null) {
                            var errorDecision = await context.onError(error, {
                                iterations: runState.iterations,
                                source: lifecycleSource,
                                destination: lifecycleDestination,
                                sourceOptions: context.sourceOptions,
                                destinationOptions: context.destinationOptions,
                                options: context.options,
                                readOptions: readOptions
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
     * @param {{ source?: any, sourceOptions?: object | null, destination?: any, destinationOptions?: object | null, hasWriter?: boolean, writerRequiresDestination?: boolean } | null} defaults Optional pipeline defaults.
     */
    constructor(reader, onResult = null, defaults = null) {
        this._reader = reader;
        this._onResult = onResult;
        this._defaultSource = defaults?.source ?? null;
        this._defaultSourceOptions = defaults?.sourceOptions ?? null;
        this._defaultDestination = defaults?.destination ?? null;
        this._defaultDestinationOptions = defaults?.destinationOptions ?? null;
        this._hasWriter = (defaults?.hasWriter === true);
        this._writerRequiresDestination = (defaults?.writerRequiresDestination === true);
        this._processQueue = Promise.resolve();
        this._runState = null;
    }

};
