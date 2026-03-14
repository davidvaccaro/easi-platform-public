import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import DicomDataWriterHandler from '../../src/handlers/terminals/DicomDataWriterHandler.js';

const path = require('path');
const fs = require('fs');

function readDicomBytes(name = '0002.DCM') {

    // Establish the root path to BrightDicom.
    var brightDicomRoot = process.cwd().split('easi-js')[0];

    // Read the requested DICOM file.
    return fs.readFileSync(path.join(brightDicomRoot, '/data/dicoms/' + name));

}

function writeTestOutputBytes(name, bytes) {

    var outputDirectory = path.join(process.cwd(), 'test/output');
    fs.mkdirSync(outputDirectory, { recursive: true });

    var outputPath = path.join(outputDirectory, name);
    fs.writeFileSync(outputPath, Buffer.from(bytes));

    return outputPath;

}

function combineChunks(chunks) {

    var totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    var result = new Uint8Array(totalLength);
    var offset = 0;

    for (var i = 0; i < chunks.length; i++) {
        result.set(chunks[i], offset);
        offset += chunks[i].length;
    }

    return result;

}

test('Test: PipelineBuilder toDicomData emits native DICOM bytes that round-trip parse', async () => {

    var sourceBytes = readDicomBytes('0002.DCM');

    var writerReader = EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toDicomData()
        .build();

    var emittedBytes = await writerReader.process(sourceBytes);
    expect(emittedBytes instanceof Uint8Array).toBe(true);
    expect(emittedBytes.length).toBeGreaterThan(0);

    var sourceInstance = await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toInstances()
        .build()
        .process(sourceBytes);

    var emittedInstance = await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toInstances()
        .build()
        .process(emittedBytes);

    expect(emittedInstance.dataSet.find(Tag.PatientName).value)
        .toBe(sourceInstance.dataSet.find(Tag.PatientName).value);

    expect(emittedInstance.dataSet.find(Tag.PatientID).value)
        .toBe(sourceInstance.dataSet.find(Tag.PatientID).value);

    expect(emittedInstance.dataSet.find(Tag.Modality).value)
        .toBe(sourceInstance.dataSet.find(Tag.Modality).value);

});

test('Test: toDicomData with onChunk streams bytes and can be chained with withMask for anonymized DICOM output', async () => {

    var chunks = [];
    var sourceBytes = readDicomBytes('0002.DCM');

    var reader = EASI.pipelineBuilder()
        .fromPartStream().ofDicomData()
        .withMask(new Map([
            [Tag.PatientName, '[MASKED]']
        ]))
        .toDicomData({
            onChunk: (chunk) => chunks.push(chunk)
        })
        .build();

    var result = await reader.process(sourceBytes);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(1);

    var emittedBytes = combineChunks(chunks);
    var emittedInstance = await EASI.pipelineBuilder()
        .fromPartStream().ofDicomData()
        .toInstances()
        .build()
        .process(emittedBytes);

    expect(emittedInstance.dataSet.find(Tag.PatientName).value).toBe('[MASKED]');
    expect(emittedInstance.dataSet.find(Tag.PatientID).value).not.toBe('[MASKED]');

});

test('Test: toDicomData returns byte output', async () => {

    var sourceBytes = readDicomBytes('0002.DCM');
    var reader = EASI.pipelineBuilder()
        .fromPartStream().ofDicomData()
        .toDicomData()
        .build();

    var emittedBytes = await reader.process(sourceBytes);
    expect(emittedBytes instanceof Uint8Array).toBe(true);
    expect(emittedBytes.length).toBeGreaterThan(0);

    expect(reader.parser.handler instanceof DicomDataWriterHandler).toBe(true);

});

test('Test: toDicomData round-trips a nested-sequence instance and retains top-level PixelData', async () => {

    var sourceBytes = readDicomBytes('NESTED_SEQUENCE.dcm');

    var emittedBytes = await EASI.pipelineBuilder()
        .fromPartStream().ofDicomData()
        .toDicomData()
        .build()
        .process(sourceBytes);

    var emittedInstance = await EASI.pipelineBuilder()
        .fromPartStream().ofDicomData()
        .toInstances()
        .build()
        .process(emittedBytes);

    expect(emittedInstance.dataSet.find(Tag.PixelData)).not.toBe(undefined);
    expect(emittedInstance.dataSet.find(Tag.StudyInstanceUID)).not.toBe(undefined);
    expect(emittedInstance.dataSet.find(Tag.SeriesInstanceUID)).not.toBe(undefined);

});

test('Test: toDicomData anonymizes NESTED_SEQUENCE.dcm and writes NESTED_SEQUENCE_ANON.dcm', async () => {

    var sourceBytes = readDicomBytes('NESTED_SEQUENCE.dcm');

    var emittedBytes = await EASI.pipelineBuilder()
        .fromPartStream().ofDicomData()
        .withMask(Tag.DefaultDeIdentificationMask)
        .toDicomData()
        .build()
        .process(sourceBytes);

    expect(emittedBytes instanceof Uint8Array).toBe(true);
    expect(emittedBytes.length).toBeGreaterThan(0);

    var outputPath = writeTestOutputBytes('NESTED_SEQUENCE_ANON.dcm', emittedBytes);
    expect(fs.existsSync(outputPath)).toBe(true);

    var writtenBytes = new Uint8Array(fs.readFileSync(outputPath));
    expect(writtenBytes.length).toBe(emittedBytes.length);

    var sourceInstance = await EASI.pipelineBuilder()
        .fromPartStream().ofDicomData()
        .toInstances()
        .build()
        .process(sourceBytes);

    var anonymizedInstance = await EASI.pipelineBuilder()
        .fromPartStream().ofDicomData()
        .toInstances()
        .build()
        .process(writtenBytes);

    // Preserve the nested-sequence parser fix behavior after anonymization+rewrite.
    expect(anonymizedInstance.dataSet.find(Tag.PixelData)).not.toBe(undefined);

    var sourceStudyInstanceUID = sourceInstance.dataSet.find(Tag.StudyInstanceUID).value;
    var sourceSeriesInstanceUID = sourceInstance.dataSet.find(Tag.SeriesInstanceUID).value;
    var anonymizedStudyInstanceUID = anonymizedInstance.dataSet.find(Tag.StudyInstanceUID).value;
    var anonymizedSeriesInstanceUID = anonymizedInstance.dataSet.find(Tag.SeriesInstanceUID).value;

    expect(anonymizedStudyInstanceUID).toBeDefined();
    expect(anonymizedSeriesInstanceUID).toBeDefined();
    expect(anonymizedStudyInstanceUID).not.toBe(sourceStudyInstanceUID);
    expect(anonymizedSeriesInstanceUID).not.toBe(sourceSeriesInstanceUID);

});
