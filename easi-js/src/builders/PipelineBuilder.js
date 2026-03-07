//
// PipelineBuilder.js - 1.0.0
//
// Pipeline Builder Class 
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
import FetchStreamReader from "../readers/FetchStreamReader.js";
import ByteStreamReader from "../readers/ByteStreamReader.js";
import FileStreamReader from "../readers/FileStreamReader.js";
import WebSocketStreamReader from "../readers/WebSocketStreamReader.js";
import NodeStreamAdapterReader from "../readers/NodeStreamAdapterReader.js";

import DicomDataParser from "../parsers/DicomDataParser.js";
import JsonDataParser from "../parsers/JsonDataParser.js";
import XmlDataParser from "../parsers/XmlDataParser.js";

import DicomToFHIRImagingStudyMapping from '../handlers/mappings/DicomToFHIRImagingStudyMapping.js';

import DicomInstanceHandler from "../handlers/terminals/DicomInstanceHandler.js";
import DicomMappingHandler from '../handlers/terminals/DicomMappingHandler.js';
import DicomSelectingHandler from "../handlers/terminals/DicomSelectingHandler.js";
import DicomAssetsHandler from "../handlers/terminals/DicomAssetsHandler.js";
import DicomAssetArchiveHandler from "../handlers/terminals/DicomAssetArchiveHandler.js";
import DicomJsonMetadataAdapter from "../handlers/adapters/DicomJsonMetadataAdapter.js";
import DicomXmlMetadataAdapter from "../handlers/adapters/DicomXmlMetadataAdapter.js";
import DicomDeIdentificationFilter from "../handlers/filters/DicomDeIdentificationFilter.js";
import DicomValidationFilter from "../handlers/filters/DicomValidationFilter.js";
import DicomDataWriterHandler from "../handlers/terminals/DicomDataWriterHandler.js";
import Exception from "../environment/Exception.js";
import DiagnosticUtils from "../utils/DiagnosticUtils.js";
import { BuilderErrorCodes } from "../environment/Exception.js";
import Pipeline from "../pipelines/Pipeline.js";

export default class PipelineBuilder {

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
            && (typeof reader === 'object')
            && (typeof reader.read === 'function'));
    }

    /**
     * Determines if the reader supports the `onPart` contract.
     * @param {object} reader The reader instance.
     * @returns {boolean} True if `onPart` is present in the object/prototype chain.
     */
    supportsOnPart(reader) {
        return this.hasPropertyInPrototypeChain(reader, 'onPart');
    }

    /**
     * Determines if the parser appears to implement the EASI parser contract.
     * @param {object} parser The parser instance.
     * @returns {boolean} True if the parser looks valid.
     */
    isValidParser(parser) {
        return ((parser != null)
            && (typeof parser.reset == 'function')
            && (typeof parser.parse == 'function'));
    }

    /**
     * Determines if the handler appears to implement the EASI handler contract.
     * @param {object} handler The handler instance.
     * @returns {boolean} True if the handler looks valid.
     */
    isValidHandler(handler) {
        return ((handler != null) && (typeof handler == 'object'));
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

        // Native DICOM parser is incompatible with DICOM JSON/XML metadata adapter handlers.
        if ((parser instanceof DicomDataParser)
            && ((handler instanceof DicomJsonMetadataAdapter)
                || (handler instanceof DicomXmlMetadataAdapter))) {
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
     * Wrap a canonical DICOM semantic handler in the metadata adapter when JSON/XML metadata parsing is selected.
     * @param {object} handler The canonical DICOM semantic handler.
     * @returns {object} The configured top-level handler.
     */
    wrapDicomMetadataAdapterIfNeeded(handler) {

        if (this.parser instanceof JsonDataParser) {
            return new DicomJsonMetadataAdapter(handler);
        }

        if (this.parser instanceof XmlDataParser) {
            return new DicomXmlMetadataAdapter(handler);
        }

        return handler;

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
     * @param {DicomDataParser | JsonDataParser} parser The parser used to parsed elements.
     * @returns The reference to the current builder.
     */
    withParser(parser) {
        this.parser = parser;
        return this;
    }

    /**
     * Set the current reader.
     * @param {object} reader The reader used to process source input.
     * @returns The reference to the current builder.
     */
    withReader(reader) {
        this.reader = reader;
        return this;
    }

    /**
     * Set the codec registry used by codec-dependent handlers.
     * @param {object} codecRegistry The codec registry.
     * @returns The reference to the current builder.
     */
    withCodecRegistry(codecRegistry) {
        this.codecRegistry = codecRegistry;
        return this;
    }
      
    /**
     * Set the current handler.
     * @param {DicomInstanceHandler | DicomMappingHandler | DicomSelectingHandler | DicomDataWriterHandler | DicomAssetsHandler} handler The handler used to handle parsed elements.
     * @returns The reference to the current builder.
     */
    withHandler(handler) {
        this.handler = handler;
        return this;
    }

    /**
     * Sets the "onPart" option for the stream-read session.
     * @param {Function} onPart The "onPart" function handler called to resolve each part of a multi-part stream. 
     */
    withOnPart(onPart) {
        this.onPart = onPart;
        return this;
    }

    /**
     * Sets the the status indicating that this parser is perfomring "strict" parsing.
     * @description Strict indicates that the parser will strictly enforce general structural aspects of the given standard being parsed.
     * @param {boolean} isStrict Indicates that the parsing should be performed "strictly"
     * @returns The reference to the current builder.
     */
    withIsStrict(isStrict) {
        this.isStrict = isStrict;
        return this;
    }

    /**
     * Sets the current de-identification mask map.
     * @param {Map<Tag | string, unknown> | Array<Tag | string> | object | null} mask The tag mask map.
     * @returns The reference to the current builder.
     */
    withMask(mask) {
        this.mask = mask;
        return this;
    }

    /**
     * Sets the parser bulk-data policy (when supported by the configured parser).
     * @param {{ mode?: 'materialize' | 'auto' | 'stream', knownLengthThreshold?: number, hardSafetyCap?: number } | string | null} policy The bulk-data policy.
     * @returns The reference to the current builder.
     */
    withBulkDataPolicy(policy) {
        this.bulkDataPolicy = policy;
        return this;
    }

    /**
     * Enables/configures the DICOM validation filter in the canonical DICOM semantic handler chain.
     * @param {boolean | string | object | null} validation Validation configuration:
     *  - `true` enables validation with defaults (permissive)
     *  - `false`/`null` disables validation
     *  - `string`/`boolean` shorthand for validation goal
     *  - `object` options passed to DicomValidationFilter
     * @returns The reference to the current builder.
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
     * Sets the current build to use the part-stream reader source type.
     * @returns The reference to the current builder.
     */
    fromPartStream() {
        return this.withReader(new PartStreamReader());
    }

    /**
     * Sets the current build to use the fetch-stream transport reader source type.
     * @returns The reference to the current builder.
     */
    fromFetchStream() {
        return this.withReader(new FetchStreamReader(new PartStreamReader()));
    }

    /**
     * Sets the current build to use the byte-stream reader source type.
     * @returns The reference to the current builder.
     */
    fromByteStream() {
        return this.withReader(new ByteStreamReader(new PartStreamReader()));
    }

    /**
     * Sets the current build to use the file-stream reader source type.
     * @returns The reference to the current builder.
     */
    fromFileStream() {
        return this.withReader(new FileStreamReader(new PartStreamReader()));
    }

    /**
     * Sets the current build to use the websocket-stream reader source type.
     * @returns The reference to the current builder.
     */
    fromWebSocketStream() {
        return this.withReader(new WebSocketStreamReader(new PartStreamReader()));
    }

    /**
     * Sets the current build to use the node-stream adapter reader source type.
     * @returns The reference to the current builder.
     */
    fromNodeStreamAdapter() {
        return this.withReader(new NodeStreamAdapterReader(new PartStreamReader()));
    }

    /**
     * Sets the current build to parse native DICOM byte data.
     * @returns The reference to the current builder.
     */
    ofDicomData() {
        return this.withParser(new DicomDataParser());
    }

    /**
     * Sets the current build to parse DICOM JSON metadata.
     * @returns The reference to the current builder.
     */
    ofDicomMetadata() {
        return this.withParser(new JsonDataParser());
    }

    /**
     * Sets the current build to parse DICOM XML metadata.
     * @returns The reference to the current builder.
     */
    ofDicomXmlMetadata() {
        return this.withParser(new XmlDataParser());
    }

    /**
     * Sets the current build to stream-parse to DICOM instances.
     * @returns The reference to the current builder.
     */
    toInstances() {
        
        // ...into DICOM instances
        if ((this.parser instanceof DicomDataParser) || (this.parser == null))
            return this.withHandler(new DicomInstanceHandler());
        else if (this.parser instanceof JsonDataParser)
            return this.withHandler(new DicomJsonMetadataAdapter(new DicomInstanceHandler()));
        else if (this.parser instanceof XmlDataParser)
            return this.withHandler(new DicomXmlMetadataAdapter(new DicomInstanceHandler()));

        return this.withHandler(new DicomInstanceHandler());

    }

    /**
     * Sets the current build to stream-parse to a mapping.
     * @returns The reference to the current builder.
     */
    toMapping(mapping) {
        
        // ...into a mapping
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomMappingHandler(mapping)
        ));

    }

    /**
     * Sets the current build to stream-parse to a selection.
     * @returns The reference to the current builder.
     */
    toSelection(selection) {
        
        // ...into a selection
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomSelectingHandler(selection)
        ));

    }

    /**
     * Sets the current build to stream-parse to a FHIR ImagingStudy resource.
     * @returns The reference to the current builder.
     */
    toFHIRImagingStudies() {
        
        // ...into a FHIR ImagingStudy resource
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomMappingHandler(new DicomToFHIRImagingStudyMapping())
        ));

    }

    /**
     * Sets the current build to stream-parse DICOM data and emit native DICOM data bytes.
     * @param {{ onChunk?: Function, collectOutput?: boolean } | null} options Options for streaming output.
     * @returns The reference to the current builder.
     */
    toDicomData(options = null) {

        // ...into native DICOM byte output
        return this.withHandler(this.wrapDicomMetadataAdapterIfNeeded(
            new DicomDataWriterHandler(options)
        ));

    }

    /**
     * Sets the current build to extract DICOM metadata and payload assets.
     * @param {{
     *   metadata?: { mapping: object, onMetadata?: Function, collect?: boolean },
     *   payload?: {
     *     frame?: { frames?: 'first' | 'all' | Array<number> | { start?: number, end?: number, step?: number }, decode?: 'native' | 'rgba', encode?: 'none' | 'jpeg' | 'png' | 'tiff', quality?: number },
     *     onFrame?: Function,
     *     onContent?: Function,
     *     collect?: boolean
     *   }
     * } | null} options Asset extraction options.
     * @returns The reference to the current builder.
     */
    toAssets(options = null) {
        return this.withHandler(new DicomAssetsHandler(options, this.codecRegistry));
    }

    /**
     * Sets the current build to extract and package DICOM assets as a ZIP archive.
     * @param {{
     *   metadata?: { mapping?: object, onMetadata?: Function },
     *   payload?: {
     *     frame?: { frames?: 'first' | 'all' | Array<number> | { start?: number, end?: number, step?: number }, decode?: 'native' | 'rgba', encode?: 'none' | 'jpeg' | 'png' | 'tiff', quality?: number },
     *     onFrame?: Function,
     *     onContent?: Function
     *   },
     *   includeMetadata?: boolean,
     *   includeManifest?: boolean,
     *   metadataFilePath?: string,
     *   manifestFilePath?: string,
     *   framePath?: string,
     *   contentPath?: string,
     *   onChunk?: Function,
     *   collectOutput?: boolean
     * } | null} options Asset archive options.
     * @returns The reference to the current builder.
     */
    toAssetArchive(options = null) {
        return this.withHandler(new DicomAssetArchiveHandler(options, this.codecRegistry));
    }

    /**
     * Build a new pipeline instance.
     * @returns The new pipeline instance.
     */
    build() {

        // Validate the "onPart" option
        if ((this.onPart != null) && (typeof this.onPart != 'function')) {
            throw new Exception(
                'PipelineBuilder.build requires "onPart" to be a function or null.',
                BuilderErrorCodes.InvalidOnPart
            );
        }

        // Fail if no parser was configured
        if (this.parser == null) {
            throw new Exception(
                'PipelineBuilder.build requires a parser. Call ofDicomData(), ofDicomMetadata(), ofDicomXmlMetadata(), or withParser(...).',
                BuilderErrorCodes.MissingParser
            );
        }

        // Fail if no handler was configured
        if (this.handler == null) {
            throw new Exception(
                'PipelineBuilder.build requires a handler. Call toInstances(), toSelection(...), toMapping(...), toDicomData(...), toAssets(...), toAssetArchive(...), or withHandler(...).',
                BuilderErrorCodes.MissingHandler
            );
        }

        // Validate parser/handler contract shape
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

        // Validate reader contract shape if a custom reader was configured
        if ((this.reader != null) && (this.isValidReader(this.reader) == false)) {
            throw new Exception(
                `The configured reader '${DiagnosticUtils.getTypeName(this.reader)}' is invalid or does not implement the EASI reader contract.`,
                BuilderErrorCodes.InvalidReader
            );
        }

        // Validate compatibility of known parser/handler combinations
        this.validateParserHandlerCompatibility(this.parser, this.handler);

        // Create the configured reader for this pipeline
        const reader = (this.reader != null)
            ? this.reader
            : new PartStreamReader();

        // Validate "onPart" compatibility
        if ((this.onPart != null) && (this.supportsOnPart(reader) == false)) {
            throw new Exception(
                `The configured reader '${DiagnosticUtils.getTypeName(reader)}' does not support onPart.`,
                BuilderErrorCodes.IncompatibleOnPartAndReader
            );
        }

        // Set the "onPart" option
        reader.onPart = this.onPart;

        // Compose the handler chain without mutating the builder state
        const parser = this.parser;
        var handler = this.handler;

        // Inject the configured codec registry when using the DICOM assets handler.
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
                'withMask(...) requires a DICOM semantic handler chain (native DICOM parser or metadata adapter).',
                BuilderErrorCodes.IncompatibleMaskAndParser
            );
        }

        // Compose validation in the canonical DICOM semantic handler chain.
        // Validation is applied outermost so it evaluates the original parsed semantics before downstream transforms (e.g. de-identification).
        if (this.validation != null) {

            handler = this.composeDicomSemanticFilter(
                parser,
                handler,
                (nextHandler) => (new DicomValidationFilter(nextHandler, this.validation)),
                'withValidation(...) requires a DICOM semantic handler chain (native DICOM parser or metadata adapter).',
                BuilderErrorCodes.IncompatibleValidationAndParser
            );

        }

        // Set the "handler" into the "parser"
        parser.handler = handler;

        // Set the "parser" into the "reader"
        reader.parser = parser;

        // Set the "strict" status
        reader.parser.isStrict = this.isStrict;

        // Set parser bulk-data policy when provided and supported.
        if ((this.bulkDataPolicy != null) && (this.hasPropertyInPrototypeChain(reader.parser, 'bulkDataPolicy') == true)) {
            reader.parser.bulkDataPolicy = this.bulkDataPolicy;
        }

        // Return the build
        return new Pipeline(reader);

    }

    /**
     * Construct a new builder instance.
     */
    constructor() {

        // Initialze the build parameters
        this.reader = null;
        this.isStrict = false;
        this.parser = null;
        this.handler = null;
        this.mask = null;
        this.validation = null;
        this.codecRegistry = null;
        this.resolveOnPart = false;
        this.bulkDataPolicy = null;

    }
  
  };
