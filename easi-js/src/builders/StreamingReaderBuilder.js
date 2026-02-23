//
// StreamingReaderBuilder.js - 1.0.0
//
// Streaming Reader Builder Class 
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

import StreamingReader from "../readers/StreamingReader.js";

import StreamingDicomDataParser from "../parsers/StreamingDicomDataParser.js";
import StreamingJsonDataParser from "../parsers/StreamingJsonDataParser.js";

import DicomToFHIRImagingStudyMapping from '../handlers/mappings/DicomToFHIRImagingStudyMapping.js';

import StreamingDicomInstanceHandler from "../handlers/StreamingDicomInstanceHandler.js";
import StreamingDicomMappingHandler from '../handlers/StreamingDicomMappingHandler.js';
import StreamingDicomSelectingHandler from "../handlers/StreamingDicomSelectingHandler.js";
import StreamingDicomMetadataInstanceHandler from "../handlers/StreamingDicomMetadataInstanceHandler.js";
import StreamingDicomDeIdentificationHandler from "../handlers/StreamingDicomDeIdentificationHandler.js";
import StreamingDicomDataWriterHandler from "../handlers/StreamingDicomDataWriterHandler.js";
import Exception from "../environment/Exception.js";
import DiagnosticUtils from "../utils/DiagnosticUtils.js";
import { BuilderErrorCodes } from "../environment/Exception.js";

export default class StreamingReaderBuilder {

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
        // DICOM JSON metadata parser is incompatible with native DICOM byte-stream handlers.
        if (parser instanceof StreamingJsonDataParser) {

            if ((handler instanceof StreamingDicomInstanceHandler)
                || (handler instanceof StreamingDicomMappingHandler)
                || (handler instanceof StreamingDicomSelectingHandler)
                || (handler instanceof StreamingDicomDataWriterHandler)
                || (handler instanceof StreamingDicomDeIdentificationHandler)) {
                throw new Exception(
                    `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                    BuilderErrorCodes.IncompatibleParserAndHandler
                );
            }

        }

        // Native DICOM parser is incompatible with DICOM JSON metadata handlers.
        if ((parser instanceof StreamingDicomDataParser) && (handler instanceof StreamingDicomMetadataInstanceHandler)) {
            throw new Exception(
                `Parser '${DiagnosticUtils.getTypeName(parser)}' is not compatible with handler '${DiagnosticUtils.getTypeName(handler)}'.`,
                BuilderErrorCodes.IncompatibleParserAndHandler
            );
        }

    }
  
    /**
     * Set the current parser.
     * @param {StreamingDicomDataParser | StreamingJsonDataParser} parser The parser used to parsed elements.
     * @returns The reference to the current builder.
     */
    withParser(parser) {
        this.parser = parser;
        return this;
    }
      
    /**
     * Set the current handler.
     * @param {StreamingDicomInstanceHandler | StreamingDicomMetadataInstanceHandler | StreamingDicomMappingHandler | StreamingDicomSelectingHandler} handler The handler used to handle parsed elements.
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
     * Sets the current build to stream-parse DICOM Data.
     * @returns The reference to the current builder.
     */
    fromDicomData() {
        
        // Setup for stream-parsing DICOM data ...
        this.parser = new StreamingDicomDataParser();

        return this;

    }

    /**
     * Sets the current build to stream-parse DICOM Metadata.
     * @returns The reference to the current builder.
     */
    fromDicomMetadata() {
        
        // Setup for stream-parsing DICOM data ...
        this.parser = new StreamingJsonDataParser();

        return this;

    }

    /**
     * Sets the current build to stream-parse to DICOM instances.
     * @returns The reference to the current builder.
     */
    toInstances() {
        
        // ...into DICOM instances
        if ((this.parser instanceof StreamingDicomDataParser) || (this.parser == null))
            this.handler = new StreamingDicomInstanceHandler();
        else if (this.parser instanceof StreamingJsonDataParser)
            this.handler = new StreamingDicomMetadataInstanceHandler();

        return this;

    }

    /**
     * Sets the current build to stream-parse to a mapping.
     * @returns The reference to the current builder.
     */
    toMapping(mapping) {
        
        // ...into a mapping
        this.handler = new StreamingDicomMappingHandler(mapping);

        return this;

    }

    /**
     * Sets the current build to stream-parse to a selection.
     * @returns The reference to the current builder.
     */
    toSelection(selection) {
        
        // ...into a selection
        this.handler = new StreamingDicomSelectingHandler(selection);

        return this;

    }

    /**
     * Sets the current build to stream-parse to a FHIR ImagingStudy resource.
     * @returns The reference to the current builder.
     */
    toFHIRImagingStudies() {
        
        // ...into a FHIR ImagingStudy resource
        this.handler = new StreamingDicomMappingHandler(new DicomToFHIRImagingStudyMapping());

        return this;

    }

    /**
     * Sets the current build to stream-parse DICOM data and emit native DICOM data bytes.
     * @param {{ onChunk?: Function, collectOutput?: boolean } | null} options Options for streaming output.
     * @returns The reference to the current builder.
     */
    toDicomData(options = null) {

        // ...into native DICOM byte output
        this.handler = new StreamingDicomDataWriterHandler(options);

        return this;

    }

    /**
     * Build a new reader instance.
     * @returns The new reader instance.
     */
    build() {

        // Validate the "onPart" option
        if ((this.onPart != null) && (typeof this.onPart != 'function')) {
            throw new Exception(
                'StreamingReaderBuilder.build requires "onPart" to be a function or null.',
                BuilderErrorCodes.InvalidOnPart
            );
        }

        // Fail if no parser was configured
        if (this.parser == null) {
            throw new Exception(
                'StreamingReaderBuilder.build requires a parser. Call fromDicomData(), fromDicomMetadata(), or withParser(...).',
                BuilderErrorCodes.MissingParser
            );
        }

        // Fail if no handler was configured
        if (this.handler == null) {
            throw new Exception(
                'StreamingReaderBuilder.build requires a handler. Call toInstances(), toSelection(...), toMapping(...), toDicomData(...), or withHandler(...).',
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

        // Validate compatibility of known parser/handler combinations
        this.validateParserHandlerCompatibility(this.parser, this.handler);

        // Validate de-identification mask usage
        if ((this.mask != null) && (this.parser instanceof StreamingDicomDataParser == false)) {
            throw new Exception(
                'withMask(...) is only supported with StreamingDicomDataParser.',
                BuilderErrorCodes.IncompatibleMaskAndParser
            );
        }

        // Create the new "DICOM Streaming Reader" instance
        const reader = new StreamingReader();

        // Set the "onPart" option
        reader.onPart = this.onPart;

        // Compose the handler chain without mutating the builder state
        const parser = this.parser;
        var handler = this.handler;

        // Wrap the current handler with a de-identifier when configured for DICOM data parsing.
        if (this.mask != null) {
            handler = new StreamingDicomDeIdentificationHandler(handler, this.mask);
        }

        // Set the "handler" into the "parser"
        parser.handler = handler;

        // Set the "parser" into the "reader"
        reader.parser = parser;

        // Set the "strict" status
        reader.parser.isStrict = this.isStrict;

        // Return the build
        return reader;

    }

    /**
     * Construct a new builder instance.
     */
    constructor() {

        // Initialze the build parameters
        this.isStrict = false;
        this.parser = null;
        this.handler = null;
        this.mask = null;
        this.resolveOnPart = false;

    }
  
  };
