import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import DicomDataWriterHandler from '../../src/handlers/terminals/DicomDataWriterHandler.js';
import { createDicomFixture, getFixtureBytes } from '../fixtures/dicom/SyntheticDicom.js';

const path = require('path');
const fs = require('fs');
const os = require('os');
var outputDirectory;

beforeEach(() => {
  outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'easi-synthetic-writer-'));
});

afterEach(() => {
  fs.rmSync(outputDirectory, { recursive: true, force: true });
});

function writeTestOutputBytes(name, bytes) {

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

  var sourceBytes = getFixtureBytes();

  var writerReader = EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toDicomData().
  build();

  var emittedBytes = await writerReader.process({ source: sourceBytes });
  expect(emittedBytes instanceof Uint8Array).toBe(true);
  expect(emittedBytes.length).toBeGreaterThan(0);

  var sourceInstance = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toInstances().
  build().
  process({ source: sourceBytes });

  var emittedInstance = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toInstances().
  build().
  process({ source: emittedBytes });

  expect(emittedInstance.dataSet.find(Tag.PatientName).value).
  toBe(sourceInstance.dataSet.find(Tag.PatientName).value);

  expect(emittedInstance.dataSet.find(Tag.PatientID).value).
  toBe(sourceInstance.dataSet.find(Tag.PatientID).value);

  expect(emittedInstance.dataSet.find(Tag.Modality).value).
  toBe(sourceInstance.dataSet.find(Tag.Modality).value);

});

test('Test: toDicomData preserves little-endian dataset ordering for raw dataset-only DICOM input', async () => {

  var fixture = createDicomFixture('raw-implicit-monochrome1');
  var sourceBytes = fixture.bytes;

  var emittedBytes = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toDicomData().
  build().
  process({ source: sourceBytes });

  expect(emittedBytes instanceof Uint8Array).toBe(true);
  expect(emittedBytes.length).toBeGreaterThan(0);

  // First attribute is Specific Character Set (0008,0005), encoded little endian.
  expect(emittedBytes[0]).toBe(0x08);
  expect(emittedBytes[1]).toBe(0x00);
  expect(emittedBytes[2]).toBe(0x05);
  expect(emittedBytes[3]).toBe(0x00);

  var emittedInstance = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toInstances().
  build().
  process({ source: emittedBytes });

  expect(emittedInstance.metaSet == null).toBe(true);
  expect(emittedInstance.dataSet.find(Tag.Rows).value).toBe(fixture.expected.rows);
  expect(emittedInstance.dataSet.find(Tag.Columns).value).toBe(fixture.expected.columns);
  expect(Array.from(emittedInstance.dataSet.find(Tag.PixelData).access())).toEqual(Array.from(fixture.expected.pixelBytes));

});

test('Test: toDicomData with onChunk streams bytes and can be chained with withDeIdentification for anonymized DICOM output', async () => {

  var chunks = [];
  var sourceBytes = getFixtureBytes();

  var reader = EASI.pipelineBuilder().
  fromPartStream().ofDicomData().
  withDeIdentification(new Map([
  [Tag.PatientName, '[MASKED]']])).

  toDicomData({
    onChunk: (chunk) => chunks.push(chunk)
  }).
  build();

  var result = await reader.process({ source: sourceBytes });
  expect(result.count).toBe(1);
  expect(result.first().resultType).toBe('PipelineOperationResult');
  expect(result.first().operation).toBe('toDicomData');
  expect(result.first().materialized).toBe(false);
  expect(result.first().bytesWritten).toBeGreaterThan(0);
  expect(chunks.length).toBeGreaterThan(1);

  var emittedBytes = combineChunks(chunks);
  var emittedInstance = await EASI.pipelineBuilder().
  fromPartStream().ofDicomData().
  toInstances().
  build().
  process({ source: emittedBytes });

  expect(emittedInstance.dataSet.find(Tag.PatientName).value).toBe('[MASKED]');
  expect(emittedInstance.dataSet.find(Tag.PatientID).value).not.toBe('[MASKED]');

});

test('Test: toDicomData returns byte output', async () => {

  var sourceBytes = getFixtureBytes();
  var reader = EASI.pipelineBuilder().
  fromPartStream().ofDicomData().
  toDicomData().
  build();

  var emittedBytes = await reader.process({ source: sourceBytes });
  expect(emittedBytes instanceof Uint8Array).toBe(true);
  expect(emittedBytes.length).toBeGreaterThan(0);

  expect(reader.parser.handler instanceof DicomDataWriterHandler).toBe(true);

});

test('Test: toDicomData round-trips a nested-sequence instance and retains top-level PixelData', async () => {

  var fixture = createDicomFixture('nested-sequences');
  var sourceBytes = fixture.bytes;

  var emittedBytes = await EASI.pipelineBuilder().
  fromPartStream().ofDicomData().
  toDicomData().
  build().
  process({ source: sourceBytes });

  var emittedInstance = await EASI.pipelineBuilder().
  fromPartStream().ofDicomData().
  toInstances().
  build().
  process({ source: emittedBytes });

  expect(emittedInstance.dataSet.find(Tag.PixelData)).not.toBe(undefined);
  expect(emittedInstance.dataSet.find(Tag.StudyInstanceUID)).not.toBe(undefined);
  expect(emittedInstance.dataSet.find(Tag.SeriesInstanceUID)).not.toBe(undefined);
  expect(Array.from(emittedInstance.dataSet.find(Tag.PixelData).access())).toEqual(Array.from(fixture.expected.pixelBytes));
  const sequence = emittedInstance.dataSet.find(Tag.SourceImageSequence);
  expect(sequence.items.length).toBe(2);
  expect(sequence.items[0].find(Tag.RequestAttributesSequence).items[0].find(Tag.PatientName).value).toBe('SYNTHETIC^NESTED');

});

test('Test: toDicomData anonymizes synthetic nested sequences and writes a generated output file', async () => {

  var sourceBytes = getFixtureBytes('nested-sequences');

  var emittedBytes = await EASI.pipelineBuilder().
  fromPartStream().ofDicomData().
  withDeIdentification(Tag.DefaultDeIdentificationMask).
  toDicomData().
  build().
  process({ source: sourceBytes });

  expect(emittedBytes instanceof Uint8Array).toBe(true);
  expect(emittedBytes.length).toBeGreaterThan(0);

  var outputPath = writeTestOutputBytes('synthetic-nested-anonymized.dcm', emittedBytes);
  expect(fs.existsSync(outputPath)).toBe(true);

  var writtenBytes = new Uint8Array(fs.readFileSync(outputPath));
  expect(writtenBytes.length).toBe(emittedBytes.length);

  var sourceInstance = await EASI.pipelineBuilder().
  fromPartStream().ofDicomData().
  toInstances().
  build().
  process({ source: sourceBytes });

  var anonymizedInstance = await EASI.pipelineBuilder().
  fromPartStream().ofDicomData().
  toInstances().
  build().
  process({ source: writtenBytes });

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
