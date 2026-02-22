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

export default class StreamingReaderBuilder {
  
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
    forDicomData() {
        
        // Setup for stream-parsing DICOM data ...
        this.parser = new StreamingDicomDataParser();

        return this;

    }

    /**
     * Sets the current build to stream-parse DICOM MetaData.
     * @returns The reference to the current builder.
     */
    forDicomMetaData() {
        
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
        
        // Setup for stream-parsing DICOM data ...
        this.parser = new StreamingDicomDataParser();

        // ...into a mapping
        this.handler = new StreamingDicomMappingHandler(mapping);

        return this;

    }

    /**
     * Sets the current build to stream-parse to a selection.
     * @returns The reference to the current builder.
     */
    toSelection(selection) {
        
        // Setup for stream-parsing DICOM data ...
        this.parser = new StreamingDicomDataParser();

        // ...into a selection
        this.handler = new StreamingDicomSelectingHandler(selection);

        return this;

    }

    /**
     * Sets the current build to stream-parse to a FHIR ImagingStudy resource.
     * @returns The reference to the current builder.
     */
    toFHIRImagingStudies() {
        
        // Setup for stream-parsing DICOM data ...
        this.parser = new StreamingDicomDataParser();

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

        // Setup for stream-parsing DICOM data ...
        this.parser = new StreamingDicomDataParser();

        // ...into native DICOM byte output
        this.handler = new StreamingDicomDataWriterHandler(options);

        return this;

    }

    /**
     * Build a new reader instance.
     * @returns The new reader instance.
     */
    build() {

        // Default to the "DICOM Streaming Parser"
        if (this.parser == null) {
            throw new Error();
        }

        // Default to the "DICOM Streaming Instance Handler"
        if (this.handler == null) {
            this.handler = new StreamingDicomInstanceHandler();
        }

        // Create the new "DICOM Streaming Reader" instance
        const reader = new StreamingReader();

        // Set the "onPart" option
        reader.onPart = this.onPart;

        // Wrap the current handler with a de-identifier when configured for DICOM data parsing.
        if ((this.mask != null) && (this.parser instanceof StreamingDicomDataParser)) {
            this.handler = new StreamingDicomDeIdentificationHandler(this.handler, this.mask);
        }

        // Set the "handler" into the "parser"
        this.parser.handler = this.handler;

        // Set the "parser" into the "reader"
        reader.parser = this.parser;

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
