import EASI from '../src/EASI.js';

import StreamingReaderBuilder from '../src/builders/StreamingReaderBuilder.js';
import StreamingDicomDataParser from '../src/parsers/StreamingDicomDataParser.js';
import StreamingJsonDataParser from '../src/parsers/StreamingJsonDataParser.js';
import StreamingXmlDataParser from '../src/parsers/StreamingXmlDataParser.js';
import StreamingWriter from '../src/writers/StreamingWriter.js';

import StreamingDicomInstanceHandler from '../src/handlers/terminals/StreamingDicomInstanceHandler.js';
import StreamingDicomSelectingHandler from '../src/handlers/terminals/StreamingDicomSelectingHandler.js';
import StreamingDicomMappingHandler from '../src/handlers/terminals/StreamingDicomMappingHandler.js';
import StreamingDicomDataWriterHandler from '../src/handlers/terminals/StreamingDicomDataWriterHandler.js';
import StreamingDicomJsonMetadataAdapter from '../src/handlers/adapters/StreamingDicomJsonMetadataAdapter.js';
import StreamingDicomXmlMetadataAdapter from '../src/handlers/adapters/StreamingDicomXmlMetadataAdapter.js';
import StreamingDicomValidationFilter, { ValidationGoals } from '../src/handlers/filters/StreamingDicomValidationFilter.js';
import StreamingJsonDataHandler from '../src/handlers/terminals/syntax/StreamingJsonDataHandler.js';

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

test('Test: newStreamingDicomValidatedDataReaderBuilder', () => {
    const validation = { goal: ValidationGoals.STRICT };
    const builder = EASI.newStreamingDicomValidatedDataReaderBuilder(validation);
    expect(builder.parser instanceof StreamingDicomDataParser).toBe(true);
    expect(builder.validation).toBe(validation);
});

test('Test: newStreamingDicomMetadataReaderBuilder', () => {
    const builder = EASI.newStreamingDicomMetadataReaderBuilder();
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
});

test('Test: newStreamingDicomValidatedMetadataReaderBuilder', () => {
    const validation = { goal: 'permissive' };
    const builder = EASI.newStreamingDicomValidatedMetadataReaderBuilder(validation);
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
    expect(builder.validation).toBe(validation);
});

test('Test: newStreamingDicomXmlMetadataReaderBuilder', () => {
    const builder = EASI.newStreamingDicomXmlMetadataReaderBuilder();
    expect(builder.parser instanceof StreamingXmlDataParser).toBe(true);
});

test('Test: newStreamingDicomValidatedXmlMetadataReaderBuilder', () => {
    const validation = { goal: ValidationGoals.STRICT };
    const builder = EASI.newStreamingDicomValidatedXmlMetadataReaderBuilder(validation);
    expect(builder.parser instanceof StreamingXmlDataParser).toBe(true);
    expect(builder.validation).toBe(validation);
});

test('Test: newStreamingDicomInstanceReaderBuilder', () => {
    const builder = EASI.newStreamingDicomInstanceReaderBuilder();
    expect(builder.parser instanceof StreamingDicomDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomInstanceHandler).toBe(true);
});

test('Test: newStreamingDicomValidatedInstanceReaderBuilder', () => {
    const builder = EASI.newStreamingDicomValidatedInstanceReaderBuilder({ goal: ValidationGoals.STRICT });
    expect(builder.parser instanceof StreamingDicomDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomInstanceHandler).toBe(true);

    const reader = builder.build();
    expect(reader.parser.handler instanceof StreamingDicomValidationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler instanceof StreamingDicomInstanceHandler).toBe(true);
});

test('Test: newStreamingDicomJsonInstanceReaderBuilder', () => {
    const builder = EASI.newStreamingDicomJsonInstanceReaderBuilder();
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomJsonMetadataAdapter).toBe(true);
    expect(builder.handler.nextHandler instanceof StreamingDicomInstanceHandler).toBe(true);
});

test('Test: newStreamingDicomJsonValidatedInstanceReaderBuilder', () => {
    const builder = EASI.newStreamingDicomJsonValidatedInstanceReaderBuilder({ goal: 'permissive' });
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomJsonMetadataAdapter).toBe(true);
    expect(builder.handler.nextHandler instanceof StreamingDicomInstanceHandler).toBe(true);

    const reader = builder.build();
    expect(reader.parser.handler instanceof StreamingDicomJsonMetadataAdapter).toBe(true);
    expect(reader.parser.handler.nextHandler instanceof StreamingDicomValidationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler instanceof StreamingDicomInstanceHandler).toBe(true);
});

test('Test: newStreamingDicomXmlInstanceReaderBuilder', () => {
    const builder = EASI.newStreamingDicomXmlInstanceReaderBuilder();
    expect(builder.parser instanceof StreamingXmlDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomXmlMetadataAdapter).toBe(true);
    expect(builder.handler.nextHandler instanceof StreamingDicomInstanceHandler).toBe(true);
});

test('Test: newStreamingDicomXmlValidatedInstanceReaderBuilder', () => {
    const builder = EASI.newStreamingDicomXmlValidatedInstanceReaderBuilder({ goal: ValidationGoals.STRICT });
    expect(builder.parser instanceof StreamingXmlDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomXmlMetadataAdapter).toBe(true);
    expect(builder.handler.nextHandler instanceof StreamingDicomInstanceHandler).toBe(true);

    const reader = builder.build();
    expect(reader.parser.handler instanceof StreamingDicomXmlMetadataAdapter).toBe(true);
    expect(reader.parser.handler.nextHandler instanceof StreamingDicomValidationFilter).toBe(true);
    expect(reader.parser.handler.nextHandler.nextHandler instanceof StreamingDicomInstanceHandler).toBe(true);
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
    expect(builder.handler instanceof StreamingDicomJsonMetadataAdapter).toBe(true);
    expect(builder.handler.nextHandler instanceof StreamingDicomSelectingHandler).toBe(true);
    expect(builder.handler.nextHandler.selection).toBe(selection);
});

test('Test: newStreamingDicomXmlSelectionReaderBuilder', () => {
    const selection = {};
    const builder = EASI.newStreamingDicomXmlSelectionReaderBuilder(selection);
    expect(builder.parser instanceof StreamingXmlDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomXmlMetadataAdapter).toBe(true);
    expect(builder.handler.nextHandler instanceof StreamingDicomSelectingHandler).toBe(true);
    expect(builder.handler.nextHandler.selection).toBe(selection);
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
    expect(builder.handler instanceof StreamingDicomJsonMetadataAdapter).toBe(true);
    expect(builder.handler.nextHandler instanceof StreamingDicomMappingHandler).toBe(true);
    expect(builder.handler.nextHandler.mapping).toBe(mapping);
});

test('Test: newStreamingDicomXmlMappingReaderBuilder', () => {
    const mapping = {};
    const builder = EASI.newStreamingDicomXmlMappingReaderBuilder(mapping);
    expect(builder.parser instanceof StreamingXmlDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomXmlMetadataAdapter).toBe(true);
    expect(builder.handler.nextHandler instanceof StreamingDicomMappingHandler).toBe(true);
    expect(builder.handler.nextHandler.mapping).toBe(mapping);
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
    expect(builder.handler instanceof StreamingDicomJsonMetadataAdapter).toBe(true);
    expect(builder.handler.nextHandler instanceof StreamingDicomMappingHandler).toBe(true);
    expect(builder.handler.nextHandler.mapping instanceof DicomToFHIRImagingStudyMapping).toBe(true);
});

test('Test: newStreamingDicomXmlFHIRImagingStudyReaderBuilder', () => {
    const builder = EASI.newStreamingDicomXmlFHIRImagingStudyReaderBuilder();
    expect(builder.parser instanceof StreamingXmlDataParser).toBe(true);
    expect(builder.handler instanceof StreamingDicomXmlMetadataAdapter).toBe(true);
    expect(builder.handler.nextHandler instanceof StreamingDicomMappingHandler).toBe(true);
    expect(builder.handler.nextHandler.mapping instanceof DicomToFHIRImagingStudyMapping).toBe(true);
});

test('Test: newStreamingJsonValueReaderBuilder', () => {
    const builder = EASI.newStreamingJsonValueReaderBuilder();
    expect(builder.parser instanceof StreamingJsonDataParser).toBe(true);
    expect(builder.handler instanceof StreamingJsonDataHandler).toBe(true);
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
