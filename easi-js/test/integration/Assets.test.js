import EASI from '../../src/EASI.js';
import DicomToFHIRImagingStudyMapping from '../../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js';
import JpegDecoder from '../../src/codecs/decoders/JpegDecoder.js';
import OpenJpegRuntime from '../../src/codecs/runtimes/OpenJpegRuntime.js';
import PngDecoder from '../../src/codecs/decoders/PngDecoder.js';
import Tag from '../../src/dicom/Tag.js';
import { createDicomFixture, getFixtureBytes } from '../fixtures/dicom/SyntheticDicom.js';

function getRgbaStats(rgba) {

  var min = 255;
  var max = 0;
  var nonZeroCount = 0;
  var opaqueCount = 0;

  for (var i = 0; i < rgba.length; i += 4) {
    var value = Math.max(rgba[i] ?? 0, rgba[i + 1] ?? 0, rgba[i + 2] ?? 0);
    var alpha = (rgba[i + 3] ?? 0);

    if (value > 0)
      nonZeroCount++;
    if (alpha == 255)
      opaqueCount++;

    if (value < min)
      min = value;
    if (value > max)
      max = value;
  }

  var pixelCount = Math.max(1, Math.floor(rgba.length / 4));

  return {
    min,
    max,
    nonZeroCount,
    opaqueCount,
    pixelCount
  };

}

test('Test: toAssets metadata mapping emits mapped model via onMetadata and result metadata', async () => {

  var metadataEvents = [];
  var result = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toAssets({
    metadata: {
      mapping: new DicomToFHIRImagingStudyMapping(),
      onMetadata: (metadata) => metadataEvents.push(metadata),
      collect: true
    }
  }).
  build().
  process({ source: getFixtureBytes() });

  expect(metadataEvents.length).toBe(1);
  expect(result.metadata).toBeDefined();
  expect(result.metadata.resourceType).toBe('ImagingStudy');

});

test('Test: toAssets payload frame emits PNG bytes for first frame', async () => {

  var frameEvents = [];

  var result = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  withBulkDataPolicy({
    mode: 'auto',
    knownLengthThreshold: 1024,
    hardSafetyCap: 64 * 1024 * 1024
  }).
  toAssets({
    payload: {
      frame: {
        frames: 'first',
        decode: 'rgba',
        encode: 'png'
      },
      onFrame: (frame) => frameEvents.push(frame),
      collect: true
    }
  }).
  build().
  process({ source: getFixtureBytes() });

  expect(frameEvents.length).toBe(1);
  expect(result.frames.length).toBe(1);
  expect(result.frames[0].mimeType).toBe('image/png');
  expect(result.frames[0].bytes[0]).toBe(137);
  expect(result.frames[0].bytes[1]).toBe(80);
  expect(result.frames[0].bytes[2]).toBe(78);
  expect(result.frames[0].bytes[3]).toBe(71);

});

test('Test: toAssets payload frame emits TIFF bytes for first frame', async () => {

  var frameEvents = [];

  var result = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toAssets({
    payload: {
      frame: {
        frames: 'first',
        decode: 'rgba',
        encode: 'tiff'
      },
      onFrame: (frame) => frameEvents.push(frame),
      collect: true
    }
  }).
  build().
  process({ source: getFixtureBytes() });

  expect(frameEvents.length).toBe(1);
  expect(result.frames.length).toBe(1);
  expect(result.frames[0].mimeType).toBe('image/tiff');
  expect(String.fromCharCode(result.frames[0].bytes[0], result.frames[0].bytes[1])).toBe('II');
  expect(result.frames[0].bytes[2]).toBe(42);
  expect(result.frames[0].bytes[3]).toBe(0);

});

test('Test: toAssets payload frame emits JPEG bytes for first frame', async () => {

  var frameEvents = [];

  var result = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toAssets({
    payload: {
      frame: {
        frames: 'first',
        decode: 'rgba',
        encode: 'jpeg',
        quality: 0.9
      },
      onFrame: (frame) => frameEvents.push(frame),
      collect: true
    }
  }).
  build().
  process({ source: getFixtureBytes() });

  expect(frameEvents.length).toBe(1);
  expect(result.frames.length).toBe(1);
  expect(result.frames[0].mimeType).toBe('image/jpeg');
  expect(result.frames[0].bytes[0]).toBe(255);
  expect(result.frames[0].bytes[1]).toBe(216);
  expect(result.frames[0].bytes[result.frames[0].bytes.length - 2]).toBe(255);
  expect(result.frames[0].bytes[result.frames[0].bytes.length - 1]).toBe(217);

  var destination = new Uint8Array(result.frames[0].width * result.frames[0].height * 4);
  var decodeResult = new JpegDecoder().decode(
  result.frames[0].bytes,
  0,
  result.frames[0].bytes.length,
  destination,
  0);


  expect(decodeResult).toBe(true);

});

test('Test: toAssets still decodes frame payload when parser bulk-data policy streams PixelData', async () => {

  var frameEvents = [];

  var result = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  withBulkDataPolicy({ mode: 'auto', knownLengthThreshold: 1024, hardSafetyCap: 64 * 1024 * 1024 }).
  toAssets({
    payload: {
      frame: {
        frames: 'first',
        decode: 'rgba',
        encode: 'png'
      },
      onFrame: (frame) => frameEvents.push(frame),
      collect: true
    }
  }).
  build().
  process({ source: getFixtureBytes() });

  expect(frameEvents.length).toBe(1);
  expect(result.frames.length).toBe(1);
  expect(result.frames[0].mimeType).toBe('image/png');
  expect(result.frames[0].bytes.length).toBeGreaterThan(0);

});

test('Test: toAssets can emit native frame chunks without materializing PixelData bytes', async () => {

  var frameChunkEvents = [];
  var pixelDataMaterializedLengths = [];

  await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  withBulkDataPolicy({
    mode: 'stream',
    knownLengthThreshold: 1,
    hardSafetyCap: 64 * 1024 * 1024
  }).
  toAssets({
    payload: {
      mode: 'stream',
      frame: {
        frames: 'first',
        decode: 'native',
        encode: 'none'
      },
      onFrameChunk: (frameChunk, scope) => {
        frameChunkEvents.push(frameChunk);
        var pixelData = scope?.instance?.dataSet?.find(Tag.PixelData);
        pixelDataMaterializedLengths.push(pixelData?.length?.() ?? -1);
      }
    }
  }).
  build().
  process({ source: getFixtureBytes() });

  expect(frameChunkEvents.length).toBeGreaterThan(0);
  expect(frameChunkEvents[0].encoding).toBe('native');
  expect(frameChunkEvents.some((chunk) => chunk.isFinalChunk == true)).toBe(true);
  expect(pixelDataMaterializedLengths.every((length) => length == 0)).toBe(true);

});

test('Test: toAssets payload mode materialize prefers end-of-instance frame emission over chunk callbacks', async () => {

  var frameEvents = [];
  var frameChunkEvents = [];
  var pixelDataMaterializedLengths = [];

  await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  withBulkDataPolicy({
    mode: 'stream',
    knownLengthThreshold: 1,
    hardSafetyCap: 64 * 1024 * 1024
  }).
  toAssets({
    payload: {
      mode: 'materialize',
      frame: {
        frames: 'first',
        decode: 'native',
        encode: 'none'
      },
      onFrame: (frame, scope) => {
        frameEvents.push(frame);
        var pixelData = scope?.instance?.dataSet?.find(Tag.PixelData);
        pixelDataMaterializedLengths.push(pixelData?.length?.() ?? -1);
      },
      onFrameChunk: (frameChunk) => frameChunkEvents.push(frameChunk),
      collect: false
    }
  }).
  build().
  process({ source: getFixtureBytes() });

  expect(frameEvents.length).toBe(1);
  expect(frameChunkEvents.length).toBe(0);
  expect(pixelDataMaterializedLengths.every((length) => length > 0)).toBe(true);

});

test('Test: toAssets decodes independent encapsulated RLE palette multi-frame pixels', async () => {

  var fixture = createDicomFixture('rle-palette');

  var frameEvents = [];

  var result = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toAssets({
    payload: {
      frame: {
        frames: 'first',
        decode: 'rgba',
        encode: 'png'
      },
      onFrame: (frame) => frameEvents.push(frame),
      collect: true
    }
  }).
  build().
  process({ source: fixture.bytes });

  expect(frameEvents.length).toBe(1);
  expect(result.frames.length).toBe(1);
  expect(result.frames[0].mimeType).toBe('image/png');
  expect(result.frames[0].bytes.length).toBeGreaterThan(0);
  const decoded = await new PngDecoder().decodeImage(result.frames[0].bytes);
  expect(decoded.width).toBe(fixture.expected.columns);
  expect(decoded.height).toBe(fixture.expected.rows);
  expect(decoded.bytes).toEqual(fixture.expected.firstFrameRgba);

});

test('Test: toAssets decodes independent RLE palette first frame to known RGBA pixels', async () => {

  var fixture = createDicomFixture('rle-palette');

  var frameEvents = [];

  var result = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toAssets({
    payload: {
      frame: {
        frames: 'first',
        decode: 'rgba',
        encode: 'none'
      },
      onFrame: (frame) => frameEvents.push(frame),
      collect: true
    }
  }).
  build().
  process({ source: fixture.bytes });

  expect(frameEvents.length).toBe(1);
  expect(result.frames.length).toBe(1);
  expect(result.frames[0].encoding).toBe('rgba');

  var rgba = result.frames[0].bytes;
  expect(rgba).toEqual(fixture.expected.firstFrameRgba);
  var rgbNonZeroCount = 0;
  var min = 255;
  var max = 0;

  for (var i = 0; i < rgba.length; i += 4) {
    var r = rgba[i];
    var g = rgba[i + 1];
    var b = rgba[i + 2];
    var sampleMax = Math.max(r, g, b);
    if (sampleMax > 0)
    rgbNonZeroCount++;
    if (sampleMax < min)
    min = sampleMax;
    if (sampleMax > max)
    max = sampleMax;
  }

  expect(rgbNonZeroCount).toBeGreaterThan(0);
  expect(max).toBeGreaterThan(min);

});

test('Test: toAssets emits frames for synthetic Explicit VR Big Endian RGB pixels', async () => {

  var fixture = createDicomFixture('rgb-big-endian', { frames: 3 });

  var frameEvents = [];

  var result = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toAssets({
    payload: {
      frame: {
        frames: 'all',
        decode: 'rgba',
        encode: 'png'
      },
      onFrame: (frame) => frameEvents.push(frame),
      collect: true
    }
  }).
  build().
  process({ source: fixture.bytes });

  expect(frameEvents.length).toBe(fixture.expected.frames);
  expect(result.frames.length).toBe(fixture.expected.frames);
  expect(result.frames[0].mimeType).toBe('image/png');
  expect(result.frames[0].bytes[0]).toBe(137);
  expect(result.frames[0].bytes[1]).toBe(80);
  expect(result.frames[0].bytes[2]).toBe(78);
  expect(result.frames[0].bytes[3]).toBe(71);
  const decoded = await new PngDecoder().decodeImage(result.frames[0].bytes);
  expect(decoded.bytes).toEqual(fixture.expected.firstFrameRgba);

});

test('Test: toAssets decodes independent JPEG lossless pixels to known grayscale content', async () => {

  var fixture = createDicomFixture('jpeg-lossless');

  var frameEvents = [];

  var result = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  withBulkDataPolicy({
    mode: 'materialize',
    hardSafetyCap: 64 * 1024 * 1024
  }).
  toAssets({
    payload: {
      frame: {
        frames: 'first',
        decode: 'rgba',
        encode: 'none'
      },
      onFrame: (frame) => frameEvents.push(frame),
      collect: true
    }
  }).
  build().
  process({ source: fixture.bytes });

  expect(frameEvents.length).toBe(1);
  expect(result.frames.length).toBe(1);
  expect(result.frames[0].encoding).toBe('rgba');

  var rgba = result.frames[0].bytes;
  expect(rgba).toEqual(fixture.expected.firstFrameRgba);
  var nonZeroCount = 0;
  var min = 255;
  var max = 0;

  for (var i = 0; i < rgba.length; i += 4) {
    var value = Math.max(rgba[i] ?? 0, rgba[i + 1] ?? 0, rgba[i + 2] ?? 0);
    if (value > 0)
      nonZeroCount++;
    if (value < min)
      min = value;
    if (value > max)
      max = value;
  }

  expect(nonZeroCount).toBeGreaterThan(0);
  expect(max).toBeGreaterThan(min);

});

test('Test: toAssets decodes independent JPEG baseline blocks to known RGBA pixels', async () => {
  const fixture = createDicomFixture('jpeg-baseline');
  const result = await EASI.pipelineBuilder().fromByteStream().ofDicomData().
    toAssets({ payload: { frame: { frames: 'first', decode: 'rgba', encode: 'none' }, collect: true } }).
    build().process({ source: fixture.bytes });
  expect(result.frames.length).toBe(1);
  expect(result.frames[0].width).toBe(16);
  expect(result.frames[0].height).toBe(8);
  expect(result.frames[0].bytes).toEqual(fixture.expected.firstFrameRgba);
});

test('Test: toAssets decodes independent JPEG 2000 pixels through the actual OpenJPEG backend', async () => {
  const fs = require('fs');
  const factory = require('@voxelmed/openjpegjs/dist/openjpegwasm.js');
  const wasmBinary = fs.readFileSync(require.resolve('@voxelmed/openjpegjs/dist/openjpegwasm.wasm'));
  const openjpegModule = await factory({ wasmBinary, print() {}, printErr() {} });
  OpenJpegRuntime.setModule(openjpegModule);
  try {
    const fixture = createDicomFixture('jpeg2000');
    const result = await EASI.pipelineBuilder().fromByteStream().ofDicomData().
      toAssets({ payload: { frame: { frames: 'first', decode: 'rgba', encode: 'none' }, collect: true } }).
      build().process({ source: fixture.bytes });
    expect(result.frames.length).toBe(1);
    expect(result.frames[0].width).toBe(2);
    expect(result.frames[0].height).toBe(2);
    expect(result.frames[0].bytes).toEqual(fixture.expected.firstFrameRgba);
  }
  finally { OpenJpegRuntime.clear(); }
});

test.each([
  ['raw-implicit-monochrome1', {}],
  ['unsigned-16', { bitsStored: 12, highBit: 11 }],
  ['signed-16', {}],
  ['unsigned-16', { bitsStored: 16, highBit: 15, pixels: [0, 16384, 32768, 65535], windowCenter: 32768, windowWidth: 65536 }],
  ['default', {}]
])('Test: toAssets decode rgba renders non-empty opaque monochrome content for %s', async (profile, overrides) => {

  var fixture = createDicomFixture(profile, overrides);
  var result = await EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toAssets({
    payload: {
      frame: {
        frames: 'first',
        decode: 'rgba',
        encode: 'none'
      },
      collect: true
    }
  }).
  build().
  process({ source: fixture.bytes });

  expect(result.frames.length).toBe(1);
  expect(result.frames[0].encoding).toBe('rgba');
  expect(result.frames[0].width).toBe(fixture.expected.columns);
  expect(result.frames[0].height).toBe(fixture.expected.rows);

  var stats = getRgbaStats(result.frames[0].bytes);
  expect(stats.max).toBeGreaterThan(stats.min);
  expect(stats.nonZeroCount).toBeGreaterThan(0);
  expect(stats.opaqueCount).toBe(stats.pixelCount);

});
