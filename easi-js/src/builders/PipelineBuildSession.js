//
// PipelineBuildSession.js - 1.0.0
//
// Pipeline Build Session Class
//

import PartStreamReader from "../readers/PartStreamReader.js";

import DicomDataParser from "../parsers/DicomDataParser.js";
import JsonDataParser from "../parsers/JsonDataParser.js";
import XmlDataParser from "../parsers/XmlDataParser.js";

import DicomInstanceHandler from "../handlers/terminals/DicomInstanceHandler.js";
import DicomEntityHandler from "../handlers/terminals/DicomEntityHandler.js";
import DicomMappingHandler from "../handlers/terminals/DicomMappingHandler.js";
import DicomSelectingHandler from "../handlers/terminals/DicomSelectingHandler.js";
import DicomAssetsHandler from "../handlers/terminals/DicomAssetsHandler.js";
import DicomAssetArchiveHandler from "../handlers/terminals/DicomAssetArchiveHandler.js";
import DicomJsonMetadataAdapter from "../handlers/adapters/DicomJsonMetadataAdapter.js";
import DicomXmlMetadataAdapter from "../handlers/adapters/DicomXmlMetadataAdapter.js";
import DicomDeIdentificationFilter from "../handlers/filters/DicomDeIdentificationFilter.js";
import DicomValidationFilter from "../handlers/filters/DicomValidationFilter.js";
import DicomDataWriterHandler from "../handlers/terminals/DicomDataWriterHandler.js";
import JsonDataHandler from "../handlers/terminals/syntax/JsonDataHandler.js";
import XmlDataHandler from "../handlers/terminals/syntax/XmlDataHandler.js";

import Exception from "../environment/Exception.js";
import DiagnosticUtils from "../utils/DiagnosticUtils.js";
import { BuilderErrorCodes } from "../environment/Exception.js";
import Pipeline from "../pipelines/Pipeline.js";
import Tag from "../dicom/Tag.js";

export default class PipelineBuildSession {

    /**
     * Determines whether a property exists on the object or in its prototype chain.
     * @param {object} value The object to inspect.
     * @param {string} propertyName The property name to locate.
     * @returns {boolean} True if the property exists in the instance/prototype chain.
     */
    hasPropertyInPrototypeChain(value, propertyName) {

        if ((value == null) || (propertyName == null))
            return false;

        var current = value;
        while (current != null) {
            if (Object.getOwnPropertyDescriptor(current, propertyName) != null) {
                return true;
            }
            current = Object.getPrototypeOf(current);
        }

        return false;

    }

    /**
     * Determines if the reader appears to implement the EASI reader contract.
     * @param {object} reader The reader instance.
     * @returns {boolean} True if the reader looks valid.
     */
    isValidReader(reader) {
        return ((reader != null)
            && (typeof reader === "object")
            && (typeof reader.read === "function"));
    }

    /**
     * Determines if the reader supports emission callbacks.
     * Reader-level emission is implemented with the internal `onPart` contract.
     * @param {object} reader The reader instance.
     * @returns {boolean} True if internal `onPart` is present in the object/prototype chain.
     */
    supportsOnEmit(reader) {
        return this.hasPropertyInPrototypeChain(reader, "onPart");
    }

    /**
     * Determines if the parser appears to implement the EASI parser contract.
     * @param {object} parser The parser instance.
     * @returns {boolean} True if the parser looks valid.
     */
    isValidParser(parser) {
        return ((parser != null)
            && (typeof parser.reset == "function")
            && (typeof parser.parse == "function"));
    }

    /**
     * Determines if the handler appears to implement the EASI handler contract.
     * @param {object} handler The handler instance.
     * @returns {boolean} True if the handler looks valid.
     */
    isValidHandler(handler) {
        return ((handler != null) && (typeof handler == "object"));
    }

    /**
     * Determines if the writer appears to implement the EASI writer contract.
     * @param {object} writer The writer instance.
     * @returns {boolean} True if the writer looks valid.
     */
    isValidWriter(writer) {
        return ((writer != null)
            && (typeof writer === "object")
            && (typeof writer.write === "function"));
    }

    /**
     * Resolve the deepest next-handler in a handler chain.
     * @param {object} handler The current top handler.
     * @returns {object | null} The terminal handler.
     */
    resolveTerminalHandler(handler) {

        var current = handler;

        while ((current != null) && (current.nextHandler != null)) {
            current = current.nextHandler;
        }

        return current;

    }

    /**
     * Build a result sink callback for writer-enabled pipelines.
     * @param {object} writer The configured writer.
     * @param {*} target The configured writer target.
     * @param {object | null} options Writer options.
     * @returns {Function} Result sink callback.
     */
    createWriterResultSink(writer, target, options = null) {

        return async (result) => {
            if (target == null) {
                return writer.write(result, options);
            }

            return writer.write(target, result, options);
        };

    }

    /**
     * Validates compatibility of known parser and handler pairings.
     * @param {object} parser The configured parser.
     * @param {object} handler The configured handler.
     */
    validateParserHandlerCompatibility(parser, handler) {
        // DICOM JSON/XML metadata parsers are incompatible with native DICOM byte-stream handlers unless wrapped by adapters.
        if ((parser instanceof JsonDataParser) || (parser instanceof XmlDataParser)) {

            if ((handler instanceof DicomInstanceHandler)
                || (handler instanceof DicomEntityHandler)
                || (handler instanceof DicomMappingHandler)
                || (handler instanceof DicomSelectingHandler)
                || (handler instanceof DicomAssetsHandler)
                || (handler instanceof DicomAssetArchiveHandler)
                || (handler instanceof DicomDataWriterHandler)
                || (handler instanceof DicomDeIdentificationFilter)
                || (handler instanceof DicomValidationFilter)) {
                throw new Exception(
                    `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                    BuilderErrorCodes.IncompatibleParserAndHandler
                );
            }

        }

        // JSON parser should not be paired with XML terminal syntax handler.
        if ((parser instanceof JsonDataParser) && (handler instanceof XmlDataHandler)) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
        }

        // XML parser should not be paired with JSON terminal syntax handler.
        if ((parser instanceof XmlDataParser) && (handler instanceof JsonDataHandler)) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
        }

        // Native DICOM parser is incompatible with DICOM JSON/XML metadata adapter handlers.
        if ((parser instanceof DicomDataParser)
            && ((handler instanceof DicomJsonMetadataAdapter)
                || (handler instanceof DicomXmlMetadataAdapter)
                || (handler instanceof JsonDataHandler)
                || (handler instanceof XmlDataHandler))) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
        }

        // Prevent mixing JSON and XML metadata adapters with the wrong metadata parser.
        if ((parser instanceof JsonDataParser) && (handler instanceof DicomXmlMetadataAdapter)) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
        }

        if ((parser instanceof XmlDataParser)
            && (handler instanceof DicomJsonMetadataAdapter)
            && (handler instanceof DicomXmlMetadataAdapter == false)) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
        }

    }

    /**
     * Compose a canonical DICOM semantic filter into the current handler chain.
     * Supports native DICOM parser chains and metadata adapters that expose a canonical DICOM `nextHandler`.
     * @param {object} parser The configured parser.
     * @param {object} handler The configured top-level handler.
     * @param {Function} filterFactory Factory that wraps the canonical DICOM semantic handler.
     * @param {string} errorMessage The exception message when composition is incompatible.
     * @param {string} errorCode The exception code when composition is incompatible.
     * @returns {object} The updated top-level handler chain.
     */
    composeDicomSemanticFilter(parser, handler, filterFactory, errorMessage, errorCode) {

        if (parser instanceof DicomDataParser) {
            return filterFactory(handler);
        }

        if (parser instanceof JsonDataParser) {

            if (handler instanceof DicomJsonMetadataAdapter) {
                return new DicomJsonMetadataAdapter(
                    filterFactory(handler.nextHandler)
                );
            }

            throw new Exception(errorMessage, errorCode);

        }

        if (parser instanceof XmlDataParser) {

            if (handler instanceof DicomXmlMetadataAdapter) {
                return new DicomXmlMetadataAdapter(
                    filterFactory(handler.nextHandler)
                );
            }

            throw new Exception(errorMessage, errorCode);

        }

        throw new Exception(errorMessage, errorCode);

    }

    /**
     * Set the current parser.
     * @param {DicomDataParser | JsonDataParser | XmlDataParser} parser The parser used to parse elements.
     * @returns {PipelineBuildSession} The current session.
     */
    withParser(parser) {
        this.parser = parser;
        return this;
    }

    /**
     * Set the current reader.
     * @param {object} reader The reader used to process source input.
     * @returns {PipelineBuildSession} The current session.
     */
    withReader(reader) {
        this.reader = reader;
        return this;
    }

    /**
     * Set the codec registry used by codec-dependent handlers.
     * @param {object} codecRegistry The codec registry.
     * @returns {PipelineBuildSession} The current session.
     */
    withCodecRegistry(codecRegistry) {
        this.codecRegistry = codecRegistry;
        return this;
    }

    /**
     * Set the current handler.
     * @param {object} handler The handler used to handle parsed elements.
     * @returns {PipelineBuildSession} The current session.
     */
    withHandler(handler) {
        this.handler = handler;
        return this;
    }

    /**
     * Sets the `onEmit` callback for the stream-read session.
     * @param {Function | null} onEmit The callback invoked whenever the pipeline emits a parsed result.
     * @returns {PipelineBuildSession} The current session.
     */
    withOnEmit(onEmit) {
        this.onEmit = onEmit;
        return this;
    }

    /**
     * Sets strict parser behavior.
     * @param {boolean} isStrict Indicates strict parse behavior.
     * @returns {PipelineBuildSession} The current session.
     */
    withIsStrict(isStrict) {
        this.isStrict = isStrict;
        return this;
    }

    /**
     * Sets the de-identification mask map.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null} mask The tag mask map.
     * @returns {PipelineBuildSession} The current session.
     */
    withMask(mask) {
        this.mask = mask;
        return this;
    }

    /**
     * Enables de-identification using a mask.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null} [mask=Tag.DefaultDeIdentificationMask] The tag mask map.
     * @returns {PipelineBuildSession} The current session.
     */
    withDeIdentification(mask = Tag.DefaultDeIdentificationMask) {
        return this.withMask(mask);
    }

    /**
     * Sets the parser bulk-data policy (when supported by the parser).
     * @param {{ mode?: 'materialize' | 'auto' | 'stream', knownLengthThreshold?: number, hardSafetyCap?: number } | string | null} policy The bulk-data policy.
     * @returns {PipelineBuildSession} The current session.
     */
    withBulkDataPolicy(policy) {
        this.bulkDataPolicy = policy;
        return this;
    }

    /**
     * Enables/configures validation filtering in the canonical DICOM semantic chain.
     * @param {boolean | string | object | null} validation Validation configuration.
     * @returns {PipelineBuildSession} The current session.
     */
    withValidation(validation = true) {

        if ((validation == null) || (validation === false)) {
            this.validation = null;
            return this;
        }

        if (validation === true) {
            this.validation = {};
            return this;
        }

        this.validation = validation;
        return this;

    }

    /**
     * Set the outbound writer for restreaming pipeline output.
     * @param {object} writer The output writer.
     * @param {*} target Optional writer target.
     * @param {object | null} options Optional writer options.
     * @returns {PipelineBuildSession} The current session.
     */
    withWriter(writer, target = null, options = null) {
        this.writer = writer;
        this.writerTarget = target;
        this.writerOptions = options;
        return this;
    }

    /**
     * Build a new pipeline instance.
     * @returns {Pipeline} The built pipeline instance.
     */
    build() {

        // Validate the "onEmit" option.
        if ((this.onEmit != null) && (typeof this.onEmit != "function")) {
            throw new Exception(
                'PipelineBuilder.build requires "onEmit" to be a function or null.',
                BuilderErrorCodes.InvalidOnEmit
            );
        }

        // Fail if no parser was configured.
        if (this.parser == null) {
            throw new Exception(
                "PipelineBuilder.build requires a parser. Call ofDicomData(), ofDicomMetadata(), ofDicomXmlMetadata(), or withParser(...).",
                BuilderErrorCodes.MissingParser
            );
        }

        // Fail if no handler was configured.
        if (this.handler == null) {
            throw new Exception(
                "PipelineBuilder.build requires a handler. Call toInstances(), toEntities(), toSelection(...), toMapping(...), toFHIRImagingStudy(), toDicomData(...), toAssets(...), toAssetArchive(...), or withHandler(...).",
                BuilderErrorCodes.MissingHandler
            );
        }

        // Validate parser/handler contract shape.
        if (this.isValidParser(this.parser) == false) {
            throw new Exception(
                `The configured parser '${DiagnosticUtils.getTypeName(this.parser)}' is invalid or does not implement the EASI parser contract.`,
                BuilderErrorCodes.InvalidParser
            );
        }

        if (this.isValidHandler(this.handler) == false) {
            throw new Exception(
                `The configured handler '${DiagnosticUtils.getTypeName(this.handler)}' is invalid or does not implement the EASI handler contract.`,
                BuilderErrorCodes.InvalidHandler
            );
        }

        // Validate reader contract shape if a custom reader was configured.
        if ((this.reader != null) && (this.isValidReader(this.reader) == false)) {
            throw new Exception(
                `The configured reader '${DiagnosticUtils.getTypeName(this.reader)}' is invalid or does not implement the EASI reader contract.`,
                BuilderErrorCodes.InvalidReader
            );
        }

        // Validate writer contract shape if configured.
        if ((this.writer != null) && (this.isValidWriter(this.writer) == false)) {
            throw new Exception(
                `The configured writer '${DiagnosticUtils.getTypeName(this.writer)}' is invalid or does not implement the EASI writer contract.`,
                BuilderErrorCodes.InvalidBuildState
            );
        }

        // Validate compatibility of known parser/handler combinations.
        this.validateParserHandlerCompatibility(this.parser, this.handler);

        // Create the configured reader for this pipeline.
        const reader = (this.reader != null)
            ? this.reader
            : new PartStreamReader();

        // Validate `onEmit` compatibility.
        if ((this.onEmit != null) && (this.supportsOnEmit(reader) == false)) {
            throw new Exception(
                `The configured reader '${DiagnosticUtils.getTypeName(reader)}' does not support onEmit.`,
                BuilderErrorCodes.IncompatibleOnEmitAndReader
            );
        }

        // Set the internal reader `onPart` from the public pipeline `onEmit` callback.
        reader.onPart = this.onEmit;

        // Compose the handler chain without mutating session terminal declarations.
        const parser = this.parser;
        var handler = this.handler;

        // Inject the configured codec registry when using codec-dependent handlers.
        if ((this.codecRegistry != null)
            && ((handler instanceof DicomAssetsHandler) || (handler instanceof DicomAssetArchiveHandler))) {
            handler.codecRegistry = this.codecRegistry;
        }

        // Compose de-identification in the canonical DICOM semantic handler chain.
        if (this.mask != null) {

            handler = this.composeDicomSemanticFilter(
                parser,
                handler,
                (nextHandler) => (new DicomDeIdentificationFilter(nextHandler, this.mask)),
                "withMask(...) or withDeIdentification(...) requires a DICOM semantic handler chain (native DICOM parser or metadata adapter).",
                BuilderErrorCodes.IncompatibleMaskAndParser
            );
        }

        // Compose validation in the canonical DICOM semantic handler chain.
        // Validation is applied outermost so it evaluates original parsed semantics first.
        if (this.validation != null) {

            handler = this.composeDicomSemanticFilter(
                parser,
                handler,
                (nextHandler) => (new DicomValidationFilter(nextHandler, this.validation)),
                "withValidation(...) requires a DICOM semantic handler chain (native DICOM parser or metadata adapter).",
                BuilderErrorCodes.IncompatibleValidationAndParser
            );

        }

        // Set handler into parser.
        parser.handler = handler;

        // Set parser into reader.
        reader.parser = parser;

        // Set strict status.
        reader.parser.isStrict = this.isStrict;

        // Set parser bulk-data policy when provided and supported.
        if ((this.bulkDataPolicy != null) && (this.hasPropertyInPrototypeChain(reader.parser, "bulkDataPolicy") == true)) {
            reader.parser.bulkDataPolicy = this.bulkDataPolicy;
        }

        var onResult = null;

        if (this.writer != null) {

            const terminalHandler = this.resolveTerminalHandler(handler);

            // If terminal DICOM data writing is already chunking to an explicit callback,
            // keep its native output and do not wrap with a post-result writer sink.
            var shouldApplyWriterSink = true;
            if ((terminalHandler instanceof DicomDataWriterHandler)
                && (terminalHandler.collectOutput == false)
                && (terminalHandler.onChunk != null)) {
                shouldApplyWriterSink = false;
            }

            if (shouldApplyWriterSink == true) {
                onResult = this.createWriterResultSink(this.writer, this.writerTarget, this.writerOptions);
            }

        }

        return new Pipeline(reader, onResult);

    }

    /**
     * Construct a new build session.
     */
    constructor() {
        this.reader = null;
        this.isStrict = false;
        this.parser = null;
        this.handler = null;
        this.mask = null;
        this.validation = null;
        this.codecRegistry = null;
        this.onEmit = null;
        this.bulkDataPolicy = null;
        this.writer = null;
        this.writerTarget = null;
        this.writerOptions = null;
    }

}
