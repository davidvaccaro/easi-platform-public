import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';

const path = require('path');
const fs = require('fs');

function readDicomBytes(name = '0002.DCM') {

  var brightDicomRoot = process.cwd().split('easi-js')[0];
  return fs.readFileSync(path.join(brightDicomRoot, '/data/dicoms/' + name));

}

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
  process({ source: readDicomBytes('0002.DCM') });

  var pixelData = instance.dataSet.find(Tag.PixelData);
  var totalChunkBytes = handler.pixelChunkLengths.reduce((sum, length) => sum + length, 0);

  expect(pixelData).toBeDefined();
  expect(pixelData.isBulkStreamed).toBe(true);
  expect(pixelData.isMaterialized).toBe(false);
  expect(pixelData.access().length).toBe(0);
  expect(handler.pixelChunkCount).toBeGreaterThan(0);
  expect(totalChunkBytes).toBe(pixelData.bytesStreamed);
  expect(pixelData.bytesStreamed).toBeGreaterThan(0);

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
  process({ source: readDicomBytes('NESTED_SEQUENCE.dcm') });

  var firstSequence = instance.dataSet.attributes.find((attribute) => Array.isArray(attribute.items));

  expect(firstSequence).toBeDefined();
  expect(firstSequence.isBulkStreamed).toBe(false);
  expect(firstSequence.isMaterialized).toBe(true);

});

test('Test: DicomDataWriterHandler round-trips streamed PixelData via onAttributeChunk', async () => {

  var sourceBytes = readDicomBytes('0002.DCM');

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

  expect(emittedInstance.dataSet.find(Tag.PatientName).value).
  toBe(sourceInstance.dataSet.find(Tag.PatientName).value);

});