//
// PipelineBuildSession.js
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

import PartStreamReader from "../readers/PartStreamReader.js";
import DimseAssociationReader from "../readers/DimseAssociationReader.js";

import DicomDataParser from "../parsers/DicomDataParser.js";
import ByteDataParser from "../parsers/ByteDataParser.js";
import ImageDataParser from "../parsers/ImageDataParser.js";
import MixedImagingDataParser from "../parsers/MixedImagingDataParser.js";
import JsonDataParser from "../parsers/JsonDataParser.js";
import XmlDataParser from "../parsers/XmlDataParser.js";

import DicomInstanceHandler from "../handlers/terminals/DicomInstanceHandler.js";
import DicomEntityHandler from "../handlers/terminals/DicomEntityHandler.js";
import DicomDocumentHandler from "../handlers/terminals/DicomDocumentHandler.js";
import DicomDocumentWrappingHandler from "../handlers/terminals/DicomDocumentWrappingHandler.js";
import DicomMappingHandler from "../handlers/terminals/DicomMappingHandler.js";
import DicomSelectingHandler from "../handlers/terminals/DicomSelectingHandler.js";
import DicomAssetsHandler from "../handlers/terminals/DicomAssetsHandler.js";
import DicomAssetArchiveHandler from "../handlers/terminals/DicomAssetArchiveHandler.js";
import DicomJsonMetadataAdapter from "../handlers/adapters/DicomJsonMetadataAdapter.js";
import DicomXmlMetadataAdapter from "../handlers/adapters/DicomXmlMetadataAdapter.js";
import DicomDeIdentificationFilter from "../handlers/filters/DicomDeIdentificationFilter.js";
import DicomValidationFilter from "../handlers/filters/DicomValidationFilter.js";
import DicomTranscodingFilter from "../handlers/filters/DicomTranscodingFilter.js";
import DicomBurnedInRedactionFilter from "../handlers/filters/DicomBurnedInRedactionFilter.js";
import ImageBurnedInRedactionFilter from "../handlers/filters/ImageBurnedInRedactionFilter.js";
import MixedImagingNormalizationFilter from "../handlers/filters/MixedImagingNormalizationFilter.js";
import DicomDataWriterHandler from "../handlers/terminals/DicomDataWriterHandler.js";
import JsonDataHandler from "../handlers/terminals/syntax/JsonDataHandler.js";
import XmlDataHandler from "../handlers/terminals/syntax/XmlDataHandler.js";
import ImageDataHandler from "../handlers/terminals/ImageDataHandler.js";
import MixedImagingDataHandler from "../handlers/terminals/MixedImagingDataHandler.js";
import ImagingRoutingHandler from "../handlers/terminals/ImagingRoutingHandler.js";
import ImagingNormalizationBuilder from "./ImagingNormalizationBuilder.js";
import DimseAssociationWriter from "../writers/DimseAssociationWriter.js";

import Exception from "../environment/Exception.js";
import DiagnosticUtils from "../utils/DiagnosticUtils.js";
import { BuilderErrorCodes } from "../environment/Exception.js";
import { GeneralErrorCodes } from "../environment/Exception.js";
import Pipeline from "../pipelines/Pipeline.js";
import PipelineOperationResult from "../pipelines/PipelineOperationResult.js";
import Tag from "../dicom/Tag.js";
import CodecRegistry from "../codecs/CodecRegistry.js";

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
     * Determines if the codec registry appears to implement the EASI codec registry contract.
     * @param {object | null} codecRegistry The codec registry.
     * @returns {boolean} True when registry is valid.
     */
    isValidCodecRegistry(codecRegistry) {
        return (codecRegistry instanceof CodecRegistry);
    }

    /**
     * Validate the configured codec registry and fail fast on invalid state.
     * @param {object | null} codecRegistry The codec registry.
     */
    validateCodecRegistry(codecRegistry) {

        if (codecRegistry == null)
            return;

        if (this.isValidCodecRegistry(codecRegistry) == false) {
            throw new Exception(
                "PipelineBuilder.build requires withCodecRegistry(...) to receive a CodecRegistry instance.",
                BuilderErrorCodes.InvalidCodecRegistry
            );
        }

        try {
            codecRegistry.assertValid({
                requireDefaultDecoder: true
            });
        }
        catch (error) {
            throw new Exception(
                "PipelineBuilder.build detected an invalid codec registry state. " + (error?.message ?? ""),
                BuilderErrorCodes.InvalidCodecRegistry,
                error
            );
        }

    }

    /**
     * Determines if the DIMSE source transport appears valid.
     * @param {object | null} transport The DIMSE source transport.
     * @returns {boolean} True when transport implements read().
     */
    isValidDimseSourceTransport(transport) {
        return ((transport != null)
            && (typeof transport === "object")
            && (typeof transport.read === "function"));
    }

    /**
     * Determines if the DIMSE destination transport appears valid.
     * @param {object | null} transport The DIMSE destination transport.
     * @returns {boolean} True when transport implements write().
     */
    isValidDimseDestinationTransport(transport) {
        return ((transport != null)
            && (typeof transport === "object")
            && (typeof transport.write === "function"));
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
     * Determine whether one writer requires an external destination target.
     * @param {object} writer The writer instance.
     * @returns {boolean} TRUE when destination target is required.
     */
    writerRequiresTarget(writer) {

        var typeName = DiagnosticUtils.getTypeName(writer);
        return (
            (typeName == "FileStreamWriter")
            || (typeName == "BrowserFileStreamWriter")
            || (typeName == "NodeStreamAdapterWriter")
            || (typeName == "WritableStreamWriter")
            || (typeName == "WebSocketStreamWriter")
            || (typeName == "HttpStreamWriter")
            || (typeName == "DimseAssociationWriter")
        );

    }

    /**
     * Determine whether one writer uses a no-target write signature.
     * @param {object} writer The writer instance.
     * @returns {boolean} TRUE when writer should receive source/options only.
     */
    writerUsesNoTargetSignature(writer) {

        var typeName = DiagnosticUtils.getTypeName(writer);
        return (
            (typeName == "ByteStreamWriter")
            || (typeName == "PartStreamWriter")
        );

    }

    /**
     * Merge default writer options with per-process overrides.
     * @param {object | null} defaultOptions Build-time writer options.
     * @param {object | null} processOptions Per-process writer options.
     * @returns {object | null} Merged writer options.
     */
    mergeWriterOptions(defaultOptions = null, processOptions = null) {

        if ((defaultOptions == null) && (processOptions == null))
            return null;

        return Object.assign({}, defaultOptions || {}, processOptions || {});

    }

    /**
     * Build a result sink callback for writer-enabled pipelines.
     * @param {object} writer The configured writer.
     * @param {*} defaultTarget The configured default writer target.
     * @param {object | null} defaultOptions Default writer options.
     * @param {boolean} requiresTarget Indicates whether writer requires destination target.
     * @returns {Function} Result sink callback.
     */
    createWriterResultSink(writer, defaultTarget, defaultOptions = null, requiresTarget = false) {

        return async (result, context = null) => {

            var destinationProvided = ((context != null) && (context.destinationProvided === true));
            var target = destinationProvided
                ? context.destination
                : defaultTarget;

            var writerOptions = this.mergeWriterOptions(
                defaultOptions,
                ((context != null) ? context.destinationOptions : null)
            );

            var writerResult = null;
            if (requiresTarget == true) {

                if (target == null) {
                    throw new Exception(
                        "Pipeline.process requires a destination when using the configured writer.",
                        GeneralErrorCodes.InvalidParameter
                    );
                }

                writerResult = await writer.write(target, result, writerOptions);

            }
            else {

                if (this.writerUsesNoTargetSignature(writer) == true) {
                    writerResult = await writer.write(result, writerOptions);
                }
                else if ((target != null) || (destinationProvided === true)) {
                    writerResult = await writer.write(target, result, writerOptions);
                }
                else {
                    writerResult = await writer.write(result, writerOptions);
                }

            }

            if (this.isBuiltInWriter(writer) == true) {
                return PipelineOperationResult.fromWriter(
                    DiagnosticUtils.getTypeName(writer),
                    writerResult
                );
            }

            return writerResult;
        };

    }

    /**
     * Determine whether one writer is a built-in EASI writer.
     * @param {object} writer The writer instance.
     * @returns {boolean} TRUE when writer is built-in.
     */
    isBuiltInWriter(writer) {

        var typeName = DiagnosticUtils.getTypeName(writer);
        return (
            (typeName == "ByteStreamWriter")
            || (typeName == "PartStreamWriter")
            || (typeName == "FileStreamWriter")
            || (typeName == "BrowserFileStreamWriter")
            || (typeName == "NodeStreamAdapterWriter")
            || (typeName == "WritableStreamWriter")
            || (typeName == "WebSocketStreamWriter")
            || (typeName == "HttpStreamWriter")
            || (typeName == "DimseAssociationWriter")
        );

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
                || (handler instanceof DicomDocumentHandler)
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

        // Wrapped-document writing is incompatible with native DICOM and XML parser semantics.
        if ((parser instanceof DicomDataParser)
            && (handler instanceof DicomDocumentWrappingHandler)) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
        }

        if ((parser instanceof XmlDataParser)
            && (handler instanceof DicomDocumentWrappingHandler)) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
        }

        // Byte parser compatibility:
        // - wrapped-document writing
        // - image/mixed payload terminals
        // - mixed imaging routing terminal
        if ((parser instanceof ByteDataParser)
            && (handler instanceof DicomDocumentWrappingHandler == false)
            && (handler instanceof ImageDataHandler == false)
            && (handler instanceof MixedImagingDataHandler == false)
            && (handler instanceof ImagingRoutingHandler == false)) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
        }

        if ((parser instanceof ImageDataParser)
            && (handler instanceof ImageDataHandler == false)
            && (handler instanceof ImagingRoutingHandler == false)
            && (handler instanceof MixedImagingDataHandler == false)) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
        }

        if ((parser instanceof MixedImagingDataParser)
            && (handler instanceof MixedImagingDataHandler == false)
            && (handler instanceof ImagingRoutingHandler == false)
            && (handler instanceof ImageDataHandler == false)) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
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
     * Validates compatibility of known reader and parser pairings.
     * @param {object} reader The configured reader.
     * @param {object} parser The configured parser.
     */
    validateReaderParserCompatibility(reader, parser) {

        if ((reader instanceof DimseAssociationReader)
            && ((parser instanceof DicomDataParser) == false)) {
            throw new Exception(
                `Reader '${DiagnosticUtils.getTypeName(reader)}' is not compatible with parser '${DiagnosticUtils.getTypeName(parser)}'.`,
                BuilderErrorCodes.IncompatibleReaderAndParser
            );
        }

    }

    /**
     * Validates compatibility of known writer and terminal handler pairings.
     * @param {object} writer The configured writer.
     * @param {object | null} terminalHandler The resolved terminal handler.
     */
    validateWriterTerminalCompatibility(writer, terminalHandler) {

        if ((writer instanceof DimseAssociationWriter)
            && ((terminalHandler instanceof DicomDataWriterHandler) == false)) {
            throw new Exception(
                `Writer '${DiagnosticUtils.getTypeName(writer)}' is not compatible with terminal handler '${DiagnosticUtils.getTypeName(terminalHandler)}'.`,
                BuilderErrorCodes.IncompatibleWriterAndHandler
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
     * @param {DicomDataParser | ByteDataParser | ImageDataParser | MixedImagingDataParser | JsonDataParser | XmlDataParser} parser The parser used to parse elements.
     * @returns {PipelineBuildSession} The current session.
     */
    withParser(parser) {
        this.parser = parser;
        return this;
    }

    /**
     * Set the current reader.
     * @param {object} reader The reader used to process source input.
     * @param {*} source Optional default source value bound at build-time.
     * @param {object | null} options Optional default source options bound at build-time.
     * @returns {PipelineBuildSession} The current session.
     */
    withReader(reader, source = null, options = null) {
        this.reader = reader;
        this.source = source;
        this.sourceOptions = options;
        return this;
    }

    /**
     * Set/replace the default source and source options.
     * @param {*} source Optional default source value.
     * @param {object | null} options Optional default source options.
     * @returns {PipelineBuildSession} The current session.
     */
    withSource(source = null, options = null) {
        this.source = source;
        this.sourceOptions = options;
        return this;
    }

    /**
     * Set the codec registry used by codec-dependent handlers.
     * @param {CodecRegistry} codecRegistry The codec registry.
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
     * Enables de-identification using a mask.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null}
     * [deIdentificationMask=Tag.DefaultDeIdentificationMask] The de-identification mask map.
     * @returns {PipelineBuildSession} The current session.
     */
    withDeIdentification(deIdentificationMask = Tag.DefaultDeIdentificationMask) {
        this.deIdentificationMask = deIdentificationMask;
        return this;
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
     * Enables/configures transfer-syntax transcoding.
     * Supported forms:
     * - false/null: disabled
     * - string: target transfer syntax UID
     * - object: full transcoding options
     * @param {string | object | null | false} transcoding Transcoding configuration.
     * @returns {PipelineBuildSession} The current session.
     */
    withTranscoding(transcoding = null) {

        if ((transcoding == null) || (transcoding === false)) {
            this.transcoding = null;
            return this;
        }

        this.transcoding = transcoding;
        return this;

    }

    /**
     * Enables/configures burned-in pixel redaction.
     * Supported forms:
     * - false/null: disabled
     * - true: enabled with default settings
     * - function/array/object: full redaction options
     * @param {boolean | object | Function | Array<object> | null | false} redaction Redaction configuration.
     * @returns {PipelineBuildSession} The current session.
     */
    withBurnedInRedaction(redaction = true) {

        if ((redaction == null) || (redaction === false)) {
            this.burnedInRedaction = null;
            return this;
        }

        this.burnedInRedaction = redaction;
        return this;

    }

    /**
     * Enables/configures mixed-imaging normalization.
     * Supported forms:
     * - false/null: disabled
     * - function: normalization builder callback
     * - object: normalization definition
     * - ImagingNormalizationBuilder: built/partially-built builder
     * @param {Function | object | import("./ImagingNormalizationBuilder.js").default | null | false} normalization Normalization configuration.
     * @returns {PipelineBuildSession} The current session.
     */
    withNormalization(normalization = null) {

        if ((normalization == null) || (normalization === false)) {
            this.normalization = null;
            return this;
        }

        this.normalization = ImagingNormalizationBuilder.resolve(normalization);
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
                "PipelineBuilder.build requires a parser. Call ofDicomData(), ofByteData(), ofImageData(), ofMixedImagingData(), ofDicomMetadata(), ofDicomXmlMetadata(), or withParser(...).",
                BuilderErrorCodes.MissingParser
            );
        }

        // Fail if no handler was configured.
        if (this.handler == null) {
            throw new Exception(
                "PipelineBuilder.build requires a handler. Call toInstances(), toEntities(), toUnwrappedDocuments(...), toWrappedDocuments(...), toSelection(...), toMapping(...), toFHIRImagingStudy(), toDicomData(...), toStructuredValue(), toImageData(), toImagingData(...), toAssets(...), toAssetArchive(...), withRouting(...), or withHandler(...).",
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

        // Validate configured codec registry contract/state before composing handlers.
        this.validateCodecRegistry(this.codecRegistry);

        // Validate compatibility of known parser/handler combinations.
        this.validateParserHandlerCompatibility(this.parser, this.handler);

        // Create the configured reader for this pipeline.
        const reader = (this.reader != null)
            ? this.reader
            : new PartStreamReader();

        // Validate compatibility of known reader/parser combinations.
        this.validateReaderParserCompatibility(reader, this.parser);

        // Validate `onEmit` compatibility.
        if ((this.onEmit != null) && (this.supportsOnEmit(reader) == false)) {
            throw new Exception(
                `The configured reader '${DiagnosticUtils.getTypeName(reader)}' does not support onEmit.`,
                BuilderErrorCodes.IncompatibleOnEmitAndReader
            );
        }

        // Validate configured DIMSE source transport when explicitly provided.
        if (reader instanceof DimseAssociationReader) {
            const sourceTransport = reader.resolveTransport(this.sourceOptions);
            if ((sourceTransport != null) && (this.isValidDimseSourceTransport(sourceTransport) == false)) {
                throw new Exception(
                    "Invalid DIMSE source transport. Expected transport implementing read(...).",
                    BuilderErrorCodes.InvalidBuildState
                );
            }
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

        // Compose burned-in pixel redaction.
        if (this.burnedInRedaction != null) {

            var redaction = this.burnedInRedaction;
            if (redaction === true) {
                redaction = {};
            }
            else if ((typeof redaction == "function") || (Array.isArray(redaction) == true)) {
                redaction = {
                    regions: redaction
                };
            }
            else if (typeof redaction == "object") {
                redaction = Object.assign({}, redaction);
            }
            else {
                throw new Exception(
                    "Invalid burned-in redaction options. Expected function, array, object, true, null, or false.",
                    BuilderErrorCodes.InvalidBuildState
                );
            }

            if (parser instanceof DicomDataParser) {

                if (this.transcoding != null) {
                    var transcodingForRedaction = (typeof this.transcoding == "string")
                        ? { targetTransferSyntax: this.transcoding }
                        : Object.assign({}, this.transcoding);

                    var redactionTargetTransferSyntax = (
                        redaction.targetTransferSyntax
                        ?? transcodingForRedaction.targetTransferSyntax
                        ?? null
                    );

                    redaction = Object.assign({}, transcodingForRedaction, redaction, {
                        targetTransferSyntax: redactionTargetTransferSyntax
                    });
                }

                if ((this.codecRegistry != null) && (typeof redaction == "object") && (redaction != null)) {
                    redaction = Object.assign({}, redaction, {
                        codecRegistry: (redaction.codecRegistry ?? this.codecRegistry)
                    });
                }

                handler = new DicomBurnedInRedactionFilter(handler, redaction);

            }
            else if (parser instanceof ImageDataParser) {

                if (this.transcoding != null) {
                    throw new Exception(
                        "withTranscoding(...) currently requires native DICOM parser semantics.",
                        BuilderErrorCodes.IncompatibleTranscodingAndParser
                    );
                }

                if ((this.codecRegistry != null) && (typeof redaction == "object") && (redaction != null)) {
                    redaction = Object.assign({}, redaction, {
                        codecRegistry: (redaction.codecRegistry ?? this.codecRegistry)
                    });
                }

                handler = new ImageBurnedInRedactionFilter(handler, redaction);

            }
            else {
                throw new Exception(
                    "withBurnedInRedaction(...) currently requires native DICOM or standard image parser semantics.",
                    BuilderErrorCodes.IncompatibleBurnedInRedactionAndParser
                );
            }

        }
        else if (this.transcoding != null) {

            if ((parser instanceof DicomDataParser) == false) {
                throw new Exception(
                    "withTranscoding(...) currently requires native DICOM parser semantics.",
                    BuilderErrorCodes.IncompatibleTranscodingAndParser
                );
            }

            var transcoding = this.transcoding;

            // Apply the caller-configured codec registry to transcoding when available.
            if ((this.codecRegistry != null) && (typeof transcoding == "object") && (transcoding != null)) {
                transcoding = Object.assign({}, transcoding, {
                    codecRegistry: (transcoding.codecRegistry ?? this.codecRegistry)
                });
            }

            handler = new DicomTranscodingFilter(handler, transcoding);

        }

        // Compose de-identification in the canonical DICOM semantic handler chain.
        if (this.normalization != null) {

            if ((parser instanceof MixedImagingDataParser) == false) {
                throw new Exception(
                    "withNormalization(...) currently requires mixed imaging parser semantics.",
                    BuilderErrorCodes.IncompatibleNormalizationAndParser
                );
            }

            var normalization = Object.assign({}, this.normalization);
            if ((this.codecRegistry != null) && (typeof normalization == "object")) {
                normalization.codecRegistry = (normalization.codecRegistry ?? this.codecRegistry);
            }
            if ((this.bulkDataPolicy != null) && (typeof normalization == "object")) {
                normalization.dicomBulkDataPolicy = (normalization.dicomBulkDataPolicy ?? this.bulkDataPolicy);
            }

            handler = new MixedImagingNormalizationFilter(handler, normalization);

        }

        // Compose de-identification in the canonical DICOM semantic handler chain.
        if (this.deIdentificationMask != null) {

            handler = this.composeDicomSemanticFilter(
                parser,
                handler,
                (nextHandler) => (new DicomDeIdentificationFilter(nextHandler, this.deIdentificationMask)),
                "withDeIdentification(...) requires a DICOM semantic handler chain (native DICOM parser or metadata adapter).",
                BuilderErrorCodes.IncompatibleDeIdentificationAndParser
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
            this.validateWriterTerminalCompatibility(this.writer, terminalHandler);
            const writerRequiresTarget = this.writerRequiresTarget(this.writer);

            // Validate configured DIMSE destination transport when explicitly provided.
            if (this.writer instanceof DimseAssociationWriter) {
                const destinationTransport = this.writer.resolveTransport(this.writerOptions);
                if ((destinationTransport != null) && (this.isValidDimseDestinationTransport(destinationTransport) == false)) {
                    throw new Exception(
                        "Invalid DIMSE destination transport. Expected transport implementing write(...).",
                        BuilderErrorCodes.InvalidBuildState
                    );
                }
            }

            // If terminal DICOM data writing is already chunking to an explicit callback,
            // keep its native output and do not wrap with a post-result writer sink.
            var shouldApplyWriterSink = true;
            if ((terminalHandler instanceof DicomDataWriterHandler)
                && (terminalHandler.collectOutput == false)
                && (terminalHandler.onChunk != null)) {
                shouldApplyWriterSink = false;
            }

            if (shouldApplyWriterSink == true) {
                onResult = this.createWriterResultSink(
                    this.writer,
                    this.writerTarget,
                    this.writerOptions,
                    writerRequiresTarget
                );
            }

        }

        return new Pipeline(reader, onResult, {
            source: this.source,
            sourceOptions: this.sourceOptions,
            destination: this.writerTarget,
            destinationOptions: this.writerOptions,
            hasWriter: (this.writer != null),
            writerRequiresDestination: ((this.writer != null) && (this.writerRequiresTarget(this.writer) == true))
        });

    }

    /**
     * Construct a new build session.
     */
    constructor() {
        this.reader = null;
        this.source = null;
        this.sourceOptions = null;
        this.isStrict = false;
        this.parser = null;
        this.handler = null;
        this.deIdentificationMask = null;
        this.validation = null;
        this.transcoding = null;
        this.codecRegistry = null;
        this.onEmit = null;
        this.bulkDataPolicy = null;
        this.burnedInRedaction = null;
        this.normalization = null;
        this.writer = null;
        this.writerTarget = null;
        this.writerOptions = null;
    }

}
