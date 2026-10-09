import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';

import DicomPipelineProbeHandler from '../benchmarks/probes/DicomPipelineProbeHandler.js';
import { createChunkReader } from '../benchmarks/probes/DicomPipelineProbeHandler.js';
import { createDicomFixture } from '../fixtures/dicom/SyntheticDicom.js';

async function runProbe(bytes, mode, chunkBytes = 64 * 1024) {

  var parser = new DicomDataParser();
  parser.bulkDataPolicy = {
    mode: mode,
    knownLengthThreshold: 1024 * 1024,
    hardSafetyCap: 16 * 1024 * 1024
  };

  var handler = new DicomPipelineProbeHandler();

  var instance = await EASI.pipelineBuilder().
  fromPartStream().
  withParser(parser).
  withHandler(handler).
  build().
  process(createChunkReader(bytes, chunkBytes), null, {
    sourceOptions: {
      contentType: 'application/dicom',
      contentLength: bytes.length
    }
  });

  return {
    instance: instance,
    metrics: handler.snapshot
  };

}

test('Test: Probe integration with synthetic nested sequences keeps PixelData top-level and captures streamed chunk metrics', async () => {

  var fixture = createDicomFixture('nested-sequences');
  var result = await runProbe(fixture.bytes, 'stream');
  var pixelData = result.instance.dataSet.find(Tag.PixelData);

  expect(pixelData).toBeDefined();
  expect(result.instance.dataSet.has(Tag.PixelData)).toBe(true);
  expect(pixelData.isBulkStreamed).toBe(true);
  expect(pixelData.length()).toBe(0);
  expect(result.metrics.attributeCount).toBeGreaterThan(0);
  expect(result.metrics.pixelDataChunkCount).toBeGreaterThan(0);
  expect(result.metrics.pixelDataChunkBytes).toBe(fixture.expected.pixelBytes.length);
  expect(result.metrics.peakHeapUsedBytes).toBeGreaterThan(0);

});

test('Test: Probe integration demonstrates materialize vs stream PixelData behavior on a generated large fixture', async () => {

  var fixture = createDicomFixture('multiframe', { rows: 512, columns: 512, frames: 16 });
  var bytes = fixture.bytes;

  var materializeResult = await runProbe(bytes, 'materialize');
  var streamResult = await runProbe(bytes, 'stream');

  var materializePixelData = materializeResult.instance.dataSet.find(Tag.PixelData);
  var streamPixelData = streamResult.instance.dataSet.find(Tag.PixelData);

  expect(materializePixelData).toBeDefined();
  expect(materializePixelData.isBulkStreamed).toBe(false);
  expect(materializePixelData.length()).toBe(fixture.expected.pixelBytes.length);
  expect(materializeResult.metrics.pixelDataChunkCount).toBe(0);
  expect(materializeResult.metrics.peakPixelDataMaterializedBytes).toBeGreaterThan(0);

  expect(streamPixelData).toBeDefined();
  expect(streamPixelData.isBulkStreamed).toBe(true);
  expect(streamPixelData.length()).toBe(0);
  expect(streamResult.metrics.pixelDataChunkCount).toBeGreaterThan(0);
  expect(streamResult.metrics.pixelDataChunkBytes).toBe(fixture.expected.pixelBytes.length);
  expect(streamResult.metrics.peakPixelDataMaterializedBytes).toBe(0);

});
