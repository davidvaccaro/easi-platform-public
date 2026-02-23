//
// EASI.js - 1.0.0
//
// EASI Master Factory Class 
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

import StreamingReaderBuilder from "./builders/StreamingReaderBuilder.js";
import StreamingJsonDataParser from "./parsers/StreamingJsonDataParser.js";
import StreamingWriter from "./writers/StreamingWriter.js";

import StreamingDicomInstanceHandler from "./handlers/terminals/StreamingDicomInstanceHandler.js";
import StreamingDicomSelectingHandler from "./handlers/terminals/StreamingDicomSelectingHandler.js";
import StreamingDicomMappingHandler from "./handlers/terminals/StreamingDicomMappingHandler.js";
import StreamingDicomDataWriterHandler from "./handlers/terminals/StreamingDicomDataWriterHandler.js";
import StreamingJsonDataHandler from "./handlers/terminals/syntax/StreamingJsonDataHandler.js";
import DicomToFHIRImagingStudyMapping from "./handlers/mappings/DicomToFHIRImagingStudyMapping.js";

import DumpParser from "./tools/dicom/DumpParser.js";

export default class EASI {

    /**
     * Create a new instance of the EASI Streaming Writer class.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     * @returns A new, initialized StreamingWriter class instance.
     */
    static newStreamingWriter(options = null) {
        return new StreamingWriter(options);
    }

    /**
     * Create a new streaming writer pre-configured for DICOM byte output.
     * @param {{ onChunk?: Function, collectOutput?: boolean, chunkSize?: number } | null} options Writer options.
     * @returns A new, initialized StreamingWriter class instance.
     */
    static newStreamingDicomDataWriter(options = null) {
        return EASI.newStreamingWriter(options);
    }

    /**
     * Create a new instance of the EASI Streaming Reader Builder class.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingReaderBuilder() {
        return new StreamingReaderBuilder();
    }

    /**
     * Create a new reader builder pre-configured for DICOM byte data.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomDataReaderBuilder() {
        return EASI.newStreamingReaderBuilder()
            .fromDicomData();
    }

    /**
     * Create a new reader builder pre-configured for DICOM JSON metadata data.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomMetadataReaderBuilder() {
        return EASI.newStreamingReaderBuilder()
            .fromDicomMetadata();
    }

    /**
     * Create a new reader builder pre-configured for DICOM XML metadata data.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomXmlMetadataReaderBuilder() {
        return EASI.newStreamingReaderBuilder()
            .fromDicomXmlMetadata();
    }

    /**
     * Create a new reader builder pre-configured for DICOM byte data -> DICOM Instance emit.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomInstanceReaderBuilder() {
        return EASI.newStreamingDicomDataReaderBuilder()
            .toInstances();
    }

    /**
     * Create a new reader builder pre-configured for DICOM JSON metadata -> DICOM Instance emit.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomJsonInstanceReaderBuilder() {
        return EASI.newStreamingDicomMetadataReaderBuilder()
            .toInstances();
    }

    /**
     * Create a new reader builder pre-configured for DICOM XML metadata -> DICOM Instance emit.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomXmlInstanceReaderBuilder() {
        return EASI.newStreamingDicomXmlMetadataReaderBuilder()
            .toInstances();
    }

    /**
     * Create a new reader builder pre-configured for DICOM byte data -> Selection emit.
     * @param {Selection} selection The selection used to match and emit attributes.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomSelectionReaderBuilder(selection) {
        return EASI.newStreamingDicomDataReaderBuilder()
            .toSelection(selection);
    }

    /**
     * Create a new reader builder pre-configured for DICOM JSON metadata -> Selection emit.
     * @param {Selection} selection The selection used to match and emit attributes.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomJsonSelectionReaderBuilder(selection) {
        return EASI.newStreamingDicomMetadataReaderBuilder()
            .toSelection(selection);
    }

    /**
     * Create a new reader builder pre-configured for DICOM XML metadata -> Selection emit.
     * @param {Selection} selection The selection used to match and emit attributes.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomXmlSelectionReaderBuilder(selection) {
        return EASI.newStreamingDicomXmlMetadataReaderBuilder()
            .toSelection(selection);
    }

    /**
     * Create a new reader builder pre-configured for DICOM byte data -> Mapping emit.
     * @param {Mapping} mapping The mapping used to transform DICOM attributes.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomMappingReaderBuilder(mapping) {
        return EASI.newStreamingDicomDataReaderBuilder()
            .toMapping(mapping);
    }

    /**
     * Create a new reader builder pre-configured for DICOM JSON metadata -> Mapping emit.
     * @param {Mapping} mapping The mapping used to transform DICOM attributes.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomJsonMappingReaderBuilder(mapping) {
        return EASI.newStreamingDicomMetadataReaderBuilder()
            .toMapping(mapping);
    }

    /**
     * Create a new reader builder pre-configured for DICOM XML metadata -> Mapping emit.
     * @param {Mapping} mapping The mapping used to transform DICOM attributes.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomXmlMappingReaderBuilder(mapping) {
        return EASI.newStreamingDicomXmlMetadataReaderBuilder()
            .toMapping(mapping);
    }

    /**
     * Create a new reader builder pre-configured for DICOM byte data -> FHIR ImagingStudy emit.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomFHIRImagingStudyReaderBuilder() {
        return EASI.newStreamingDicomDataReaderBuilder()
            .toFHIRImagingStudies();
    }

    /**
     * Create a new reader builder pre-configured for DICOM byte data -> native DICOM byte emit.
     * @param {{ onChunk?: Function, collectOutput?: boolean } | null} options Options for streaming output.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomDataWriterReaderBuilder(options = null) {
        return EASI.newStreamingDicomDataReaderBuilder()
            .withHandler(new StreamingDicomDataWriterHandler(options));
    }

    /**
     * Create a new reader builder pre-configured for DICOM JSON metadata -> FHIR ImagingStudy emit.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomJsonFHIRImagingStudyReaderBuilder() {
        return EASI.newStreamingDicomMetadataReaderBuilder()
            .toFHIRImagingStudies();
    }

    /**
     * Create a new reader builder pre-configured for DICOM XML metadata -> FHIR ImagingStudy emit.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingDicomXmlFHIRImagingStudyReaderBuilder() {
        return EASI.newStreamingDicomXmlMetadataReaderBuilder()
            .toFHIRImagingStudies();
    }

    /**
     * Create a new reader builder pre-configured for JSON stream data -> JavaScript value emit.
     * @returns A new, initialized StreamingReaderBuilder class instance.
     */
    static newStreamingJsonValueReaderBuilder() {
        return EASI.newStreamingReaderBuilder()
            .withParser(new StreamingJsonDataParser())
            .withHandler(new StreamingJsonDataHandler());
    }

    /**
     * Create a new dump parser with the specified emitter/handler.
     * @param {object} handler The handler used to emit parsed DICOM elements.
     * @returns A new, initialized DumpParser instance.
     */
    static newStreamingDumpParser(handler) {
        return new DumpParser(handler);
    }

    /**
     * Create a new dump parser pre-configured for DICOM Instance emit.
     * @returns A new, initialized DumpParser instance.
     */
    static newStreamingDicomInstanceDumpParser() {
        return EASI.newStreamingDumpParser(new StreamingDicomInstanceHandler());
    }

    /**
     * Create a new dump parser pre-configured for DICOM Selection emit.
     * @param {Selection} selection The selection used to match and emit attributes.
     * @returns A new, initialized DumpParser instance.
     */
    static newStreamingDicomSelectionDumpParser(selection) {
        return EASI.newStreamingDumpParser(new StreamingDicomSelectingHandler(selection));
    }

    /**
     * Create a new dump parser pre-configured for DICOM Mapping emit.
     * @param {Mapping} mapping The mapping used to transform DICOM attributes.
     * @returns A new, initialized DumpParser instance.
     */
    static newStreamingDicomMappingDumpParser(mapping) {
        return EASI.newStreamingDumpParser(new StreamingDicomMappingHandler(mapping));
    }

    /**
     * Create a new dump parser pre-configured for DICOM -> FHIR ImagingStudy emit.
     * @returns A new, initialized DumpParser instance.
     */
    static newStreamingDicomFHIRImagingStudyDumpParser() {
        return EASI.newStreamingDumpParser(new StreamingDicomMappingHandler(new DicomToFHIRImagingStudyMapping()));
    }

};
