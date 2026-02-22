import EASI from '../src/EASI.js';

import StreamingReaderBuilder from '../src/builders/StreamingReaderBuilder.js';
import StreamingDicomDataParser from '../src/parsers/StreamingDicomDataParser.js';
import StreamingJsonDataParser from '../src/parsers/StreamingJsonDataParser.js';
import StreamingWriter from '../src/writers/StreamingWriter.js';

import StreamingDicomInstanceHandler from '../src/handlers/StreamingDicomInstanceHandler.js';
import StreamingDicomSelectingHandler from '../src/handlers/StreamingDicomSelectingHandler.js';
import StreamingDicomMappingHandler from '../src/handlers/StreamingDicomMappingHandler.js';
import StreamingDicomDataWriterHandler from '../src/handlers/StreamingDicomDataWriterHandler.js';
import StreamingDicomMetadataInstanceHandler from '../src/handlers/StreamingDicomMetadataInstanceHandler.js';
import StreamingDicomMetadataSelectingHandler from '../src/handlers/StreamingDicomMetadataSelectingHandler.js';
import StreamingDicomMetadataMappingHandler from '../src/handlers/StreamingDicomMetadataMappingHandler.js';
import StreamingJsonValueHandler from '../src/handlers/StreamingJsonValueHandler.js';

import DicomToFHIRImagingStudyMapping from '../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js';

import DumpParser from '../src/tools/dicom/DumpParser.js';

test('Test: newStreamingReaderBuilder', () => {
    expect(EASI.newStreamingReaderBuilder() instanceof StreamingReaderBuilder).toBe(true);
});

test('Test: newStreamingWriter', () => {
    expect(EASI.newStreamingWriter() instanceof StreamingWriter).toBe(true);
});

test('Test: newStreamingDicomDataWriter', () => {
    expect(EASI.newStreamingDicomDataWriter() instanceof StreamingWriter).toBe(true);
});

test('Test: newStreamingDicomDataReaderBuilder', () => {
    const builder = EASI.newStreamingDicomDataReaderBuilder();
    expect(builder.parser instanceof StreamingDicomDataParser).toBe(true);
});

test('Test: newStreamingDicomMetaDataReaderBuilder', () => {
    const builder = EASI.newStreamingDicomMetaDataReaderBuilder();
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
});

test('Test: newStreamingDicomInstanceReaderBuilder', () => {
    const builder = EASI.newStreamingDicomInstanceReaderBuilder();
    expect(builder.parser instanceof StreamingDicomDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomInstanceHandler).toBe(true);
});

test('Test: newStreamingDicomJsonInstanceReaderBuilder', () => {
    const builder = EASI.newStreamingDicomJsonInstanceReaderBuilder();
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomMetadataInstanceHandler).toBe(true);
});

test('Test: newStreamingDicomSelectionReaderBuilder', () => {
    const selection = {};
    const builder = EASI.newStreamingDicomSelectionReaderBuilder(selection);
    expect(builder.parser instanceof StreamingDicomDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomSelectingHandler).toBe(true);
    expect(builder.handler.selection).toBe(selection);
});

test('Test: newStreamingDicomJsonSelectionReaderBuilder', () => {
    const selection = {};
    const builder = EASI.newStreamingDicomJsonSelectionReaderBuilder(selection);
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomMetadataSelectingHandler).toBe(true);
    expect(builder.handler.selection).toBe(selection);
});

test('Test: newStreamingDicomMappingReaderBuilder', () => {
    const mapping = {};
    const builder = EASI.newStreamingDicomMappingReaderBuilder(mapping);
    expect(builder.parser instanceof StreamingDicomDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomMappingHandler).toBe(true);
    expect(builder.handler.mapping).toBe(mapping);
});

test('Test: newStreamingDicomJsonMappingReaderBuilder', () => {
    const mapping = {};
    const builder = EASI.newStreamingDicomJsonMappingReaderBuilder(mapping);
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomMetadataMappingHandler).toBe(true);
    expect(builder.handler.mapping).toBe(mapping);
});

test('Test: newStreamingDicomFHIRImagingStudyReaderBuilder', () => {
    const builder = EASI.newStreamingDicomFHIRImagingStudyReaderBuilder();
    expect(builder.parser instanceof StreamingDicomDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomMappingHandler).toBe(true);
    expect(builder.handler.mapping instanceof DicomToFHIRImagingStudyMapping).toBe(true);
});

test('Test: newStreamingDicomDataWriterReaderBuilder', () => {
    const builder = EASI.newStreamingDicomDataWriterReaderBuilder();
    expect(builder.parser instanceof StreamingDicomDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomDataWriterHandler).toBe(true);
});

test('Test: newStreamingDicomJsonFHIRImagingStudyReaderBuilder', () => {
    const builder = EASI.newStreamingDicomJsonFHIRImagingStudyReaderBuilder();
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomMetadataMappingHandler).toBe(true);
    expect(builder.handler.mapping instanceof DicomToFHIRImagingStudyMapping).toBe(true);
});

test('Test: newStreamingJsonValueReaderBuilder', () => {
    const builder = EASI.newStreamingJsonValueReaderBuilder();
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
    expect(builder.handler instanceof StreamingJsonValueHandler).toBe(true);
});

test('Test: newStreamingDumpParser', () => {
    const handler = {};
    const parser = EASI.newStreamingDumpParser(handler);
    expect(parser instanceof DumpParser).toBe(true);
    expect(parser.emitter).toBe(handler);
});

test('Test: newStreamingDicomInstanceDumpParser', () => {
    const parser = EASI.newStreamingDicomInstanceDumpParser();
    expect(parser instanceof DumpParser).toBe(true);
    expect(parser.emitter instanceof StreamingDicomInstanceHandler).toBe(true);
});

test('Test: newStreamingDicomSelectionDumpParser', () => {
    const selection = {};
    const parser = EASI.newStreamingDicomSelectionDumpParser(selection);
    expect(parser instanceof DumpParser).toBe(true);
    expect(parser.emitter instanceof StreamingDicomSelectingHandler).toBe(true);
    expect(parser.emitter.selection).toBe(selection);
});

test('Test: newStreamingDicomMappingDumpParser', () => {
    const mapping = {};
    const parser = EASI.newStreamingDicomMappingDumpParser(mapping);
    expect(parser instanceof DumpParser).toBe(true);
    expect(parser.emitter instanceof StreamingDicomMappingHandler).toBe(true);
    expect(parser.emitter.mapping).toBe(mapping);
});

test('Test: newStreamingDicomFHIRImagingStudyDumpParser', () => {
    const parser = EASI.newStreamingDicomFHIRImagingStudyDumpParser();
    expect(parser instanceof DumpParser).toBe(true);
    expect(parser.emitter instanceof StreamingDicomMappingHandler).toBe(true);
    expect(parser.emitter.mapping instanceof DicomToFHIRImagingStudyMapping).toBe(true);
});
