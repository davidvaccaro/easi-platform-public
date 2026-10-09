import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import { createDicomFixture, getFixtureBytes } from '../fixtures/dicom/SyntheticDicom.js';

class ChunkCaptureInstanceHandler extends DicomInstanceHandler {

  onAttributeChunk(context, payload) {

    if (payload?.attribute?.tag == Tag.PixelData) {
      this.pixelChunkLengths.push(payload.chunk.length);
      this.pixelChunkCount++;
    }

  }

  constructor() {
    super();
    this.pixelChunkLengths = [];
    this.pixelChunkCount = 0;
  }

}

test('Test: DicomDataParser bulk-data auto policy streams PixelData chunks above threshold', async () => {

  const fixture = createDicomFixture();
  expect(fixture.expected.pixelBytes.length).toBeGreaterThan(1024);

  var parser = new DicomDataParser();
  parser.bulkDataPolicy = {
    mode: 'auto',
    knownLengthThreshold: 1024,
    hardSafetyCap: 64 * 1024 * 1024
  };

  var handler = new ChunkCaptureInstanceHandler();

  var instance = await EASI.pipelineBuilder().
  fromPartStream().
  withParser(parser).
  withHandler(handler).
  build().
  process({ source: fixture.bytes });

  var pixelData = instance.dataSet.find(Tag.PixelData);
  var totalChunkBytes = handler.pixelChunkLengths.reduce((sum, length) => sum + length, 0);

  expect(pixelData).toBeDefined();
  expect(pixelData.isBulkStreamed).toBe(true);
  expect(pixelData.isMaterialized).toBe(false);
  expect(pixelData.access().length).toBe(0);
  expect(handler.pixelChunkCount).toBeGreaterThan(0);
  expect(totalChunkBytes).toBe(pixelData.bytesStreamed);
  expect(pixelData.bytesStreamed).toBe(fixture.expected.pixelBytes.length);

});

test('Test: DicomDataParser stream policy does not stream structural sequence attributes', async () => {

  var parser = new DicomDataParser();
  parser.bulkDataPolicy = {
    mode: 'stream',
    knownLengthThreshold: 0,
    hardSafetyCap: 0
  };

  var instance = await EASI.pipelineBuilder().
  fromPartStream().
  withParser(parser).
  toInstances().
  build().
  process({ source: getFixtureBytes('nested-sequences') });

  var firstSequence = instance.dataSet.attributes.find((attribute) => Array.isArray(attribute.items));

  expect(firstSequence).toBeDefined();
  expect(firstSequence.isBulkStreamed).toBe(false);
  expect(firstSequence.isMaterialized).toBe(true);

});

test('Test: DicomDataWriterHandler round-trips streamed PixelData via onAttributeChunk', async () => {

  const fixture = createDicomFixture();
  var sourceBytes = fixture.bytes;

  var streamingParser = new DicomDataParser();
  streamingParser.bulkDataPolicy = {
    mode: 'auto',
    knownLengthThreshold: 1024,
    hardSafetyCap: 64 * 1024 * 1024
  };

  var emittedBytes = await EASI.pipelineBuilder().
  fromPartStream().
  withParser(streamingParser).
  toDicomData().
  build().
  process({ source: sourceBytes });

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

  expect(emittedInstance.dataSet.find(Tag.PixelData).access().length).
  toBe(sourceInstance.dataSet.find(Tag.PixelData).access().length);

  expect(new Uint8Array(emittedInstance.dataSet.find(Tag.PixelData).access())).
  toEqual(fixture.expected.pixelBytes);

  expect(emittedInstance.dataSet.find(Tag.PatientName).value).
  toBe(sourceInstance.dataSet.find(Tag.PatientName).value);

  expect(emittedInstance.dataSet.find(Tag.PatientName).value).
  toBe(fixture.expected.patientName);

});
