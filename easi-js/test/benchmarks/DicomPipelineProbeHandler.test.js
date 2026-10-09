import { getFixtureBytes } from '../fixtures/dicom/SyntheticDicom.js';

import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';

import DicomPipelineProbeHandler from './probes/DicomPipelineProbeHandler.js';
import { createChunkReader } from './probes/DicomPipelineProbeHandler.js';

test('Test: DicomPipelineProbeHandler tracks streamed PixelData metrics in stream mode', async () => {

  var parser = new DicomDataParser();
  parser.bulkDataPolicy = {
    mode: 'stream',
    knownLengthThreshold: 1024,
    hardSafetyCap: 64 * 1024 * 1024
  };

  var handler = new DicomPipelineProbeHandler();

  var instance = await EASI.pipelineBuilder().
  fromPartStream().
  withParser(parser).
  withHandler(handler).
  build().
  process(createChunkReader(getFixtureBytes('default'), 64 * 1024), null, {
    sourceOptions: {
      contentType: 'application/dicom'
    }
  });

  var pixelData = instance.dataSet.find(Tag.PixelData);

  expect(pixelData).toBeDefined();
  expect(pixelData.isBulkStreamed).toBe(true);
  expect(pixelData.length()).toBe(0);
  expect(handler.snapshot.pixelDataChunkCount).toBeGreaterThan(0);
  expect(handler.snapshot.pixelDataChunkBytes).toBeGreaterThan(0);
  expect(handler.snapshot.peakHeapUsedBytes).toBeGreaterThan(0);
  expect(handler.snapshot.peakArrayBuffersBytes).toBeGreaterThan(0);

});

test('Test: DicomPipelineProbeHandler tracks materialized PixelData metrics in materialize mode', async () => {

  var parser = new DicomDataParser();
  parser.bulkDataPolicy = {
    mode: 'materialize',
    knownLengthThreshold: 1024,
    hardSafetyCap: 64 * 1024 * 1024
  };

  var handler = new DicomPipelineProbeHandler();

  var instance = await EASI.pipelineBuilder().
  fromPartStream().
  withParser(parser).
  withHandler(handler).
  build().
  process(createChunkReader(getFixtureBytes('default'), 64 * 1024), null, {
    sourceOptions: {
      contentType: 'application/dicom'
    }
  });

  var pixelData = instance.dataSet.find(Tag.PixelData);

  expect(pixelData).toBeDefined();
  expect(pixelData.isBulkStreamed).toBe(false);
  expect(pixelData.length()).toBeGreaterThan(0);
  expect(handler.snapshot.pixelDataChunkCount).toBe(0);
  expect(handler.snapshot.peakPixelDataMaterializedBytes).toBeGreaterThan(0);
  expect(handler.snapshot.peakAttributeMaterializedBytes).toBeGreaterThan(0);

});
