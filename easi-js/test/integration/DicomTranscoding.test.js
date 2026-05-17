import EASI from "../../src/EASI.js";
import Tag from "../../src/dicom/Tag.js";
import TransferSyntax from "../../src/dicom/TransferSyntax.js";
import Constants from "../../src/dicom/Constants.js";
import CodecRegistry from "../../src/codecs/CodecRegistry.js";
import RleDecoder from "../../src/codecs/decoders/RleDecoder.js";

const path = require("path");
const fs = require("fs");

function readDicomBytes(name = "0002.DCM") {

  var brightDicomRoot = process.cwd().split("easi-js")[0];
  return fs.readFileSync(path.join(brightDicomRoot, "/data/dicoms/" + name));

}

function toUint16LE(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, Number(value), true);
  return bytes;
}

function toUint32LE(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, Number(value), true);
  return bytes;
}

function toTextBytes(value) {
  return new TextEncoder().encode(String(value));
}

function concatBytes(chunks) {
  var totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  var bytes = new Uint8Array(totalLength);
  var offset = 0;
  for (var i = 0; i < chunks.length; i++) {
    bytes.set(chunks[i], offset);
    offset += chunks[i].length;
  }
  return bytes;
}

function padEven(bytes, vr) {

  if (bytes.length % 2 == 0)
  return bytes;

  var padded = new Uint8Array(bytes.length + 1);
  padded.set(bytes, 0);
  padded[padded.length - 1] = vr == "UI" ? 0x00 : 0x20;

  return padded;

}

function explicitElement(group, element, vr, valueBytes) {

  var bytes = padEven(valueBytes, vr);
  var usesLongHeader = vr == "OB" || vr == "OW" || vr == "SQ" || vr == "UN" || vr == "UT" || vr == "OF" || vr == "OD" || vr == "OL" || vr == "OV" || vr == "UC" || vr == "UR";
  var headerLength = usesLongHeader ? 12 : 8;
  var result = new Uint8Array(headerLength + bytes.length);
  var view = new DataView(result.buffer);

  view.setUint16(0, group, true);
  view.setUint16(2, element, true);
  result[4] = vr.charCodeAt(0);
  result[5] = vr.charCodeAt(1);

  if (usesLongHeader == true) {
    result[6] = 0;
    result[7] = 0;
    view.setUint32(8, bytes.length, true);
    result.set(bytes, 12);
  } else
  {
    view.setUint16(6, bytes.length, true);
    result.set(bytes, 8);
  }

  return result;

}

function buildSyntheticExplicitLittleEndianDicom() {

  var sopClassUID = "1.2.840.10008.5.1.4.1.1.7";
  var sopInstanceUID = "1.2.826.0.1.3680043.10.5432.101.1";
  var studyUID = "1.2.826.0.1.3680043.10.5432.101.2";
  var seriesUID = "1.2.826.0.1.3680043.10.5432.101.3";
  var pixelData = new Uint8Array([0, 1, 2, 3]);

  var metaBody = concatBytes([
  explicitElement(0x0002, 0x0001, "OB", new Uint8Array([0, 1])),
  explicitElement(0x0002, 0x0002, "UI", toTextBytes(sopClassUID)),
  explicitElement(0x0002, 0x0003, "UI", toTextBytes(sopInstanceUID)),
  explicitElement(0x0002, 0x0010, "UI", toTextBytes(TransferSyntax.ExplicitVRLittleEndian.ID)),
  explicitElement(0x0002, 0x0012, "UI", toTextBytes("1.2.826.0.1.3680043.10.5432.99"))]);


  var metaSet = concatBytes([
  explicitElement(0x0002, 0x0000, "UL", toUint32LE(metaBody.length)),
  metaBody]);


  var dataSet = concatBytes([
  explicitElement(0x0008, 0x0016, "UI", toTextBytes(sopClassUID)),
  explicitElement(0x0008, 0x0018, "UI", toTextBytes(sopInstanceUID)),
  explicitElement(0x0010, 0x0010, "PN", toTextBytes("SYNTHETIC^PATIENT")),
  explicitElement(0x0010, 0x0020, "LO", toTextBytes("SYNTH-001")),
  explicitElement(0x0020, 0x000D, "UI", toTextBytes(studyUID)),
  explicitElement(0x0020, 0x000E, "UI", toTextBytes(seriesUID)),
  explicitElement(0x0028, 0x0002, "US", toUint16LE(1)),
  explicitElement(0x0028, 0x0004, "CS", toTextBytes("MONOCHROME2")),
  explicitElement(0x0028, 0x0010, "US", toUint16LE(2)),
  explicitElement(0x0028, 0x0011, "US", toUint16LE(2)),
  explicitElement(0x0028, 0x0100, "US", toUint16LE(8)),
  explicitElement(0x0028, 0x0101, "US", toUint16LE(8)),
  explicitElement(0x0028, 0x0102, "US", toUint16LE(7)),
  explicitElement(0x0028, 0x0103, "US", toUint16LE(0)),
  explicitElement(0x7FE0, 0x0010, "OB", pixelData)]);


  var preamble = new Uint8Array(128);
  var prefix = toTextBytes("DICM");

  return concatBytes([preamble, prefix, metaSet, dataSet]);

}

function createFakeOpenJpegModule() {

  class J2KDecoder {
    getEncodedBuffer(length) {
      this.encoded = new Uint8Array(length);
      return this.encoded;
    }

    decode() {
    }

    getFrameInfo() {
      return {
        width: 2,
        height: 2,
        bitsPerSample: 8,
        componentCount: 1,
        isSigned: false
      };
    }

    getDecodedBuffer() {
      return new Uint8Array([12, 24, 36, 48]);
    }
  }

  return { J2KDecoder };

}

function createFakeOpenJpegEncodeModule() {

  class J2KEncoder {
    getDecodedBuffer(info) {
      this.info = info;
      this.decoded = new Int32Array(info.width * info.height * info.componentCount);
      return this.decoded;
    }

    setQuality(value) {
      this.quality = value;
    }

    setDecompositions(value) {
      this.decompositions = value;
    }

    setCompressionRatio(value) {
      this.compressionRatio = value;
    }

    encode() {
      this.encoded = new Uint8Array([0xFF, 0x4F, 0xFF, 0x51, 0x00, 0x01, 0x02, 0x03]);
    }

    getEncodedBuffer() {
      return this.encoded ?? new Uint8Array(0);
    }
  }

  return { J2KEncoder };

}

function createFakeJpeg2000EncoderBackend() {
  return function () {
    return new Uint8Array([0xFF, 0x4F, 0xFF, 0x51, 0x00, 0x01, 0x02, 0x03]);
  };
}

function firstNumericValue(value, fallback = null) {

  var candidate = value;
  if (Array.isArray(candidate) == true) {
    candidate = candidate.length > 0 ? candidate[0] : null;
  }

  if (typeof candidate === "string") {
    candidate = candidate.split("\\")[0]?.trim?.() ?? "";
  }

  var numeric = Number(candidate);
  if (Number.isFinite(numeric) == false)
  return fallback;

  return numeric;

}

function findPixelDataTagIndex(bytes) {

  if (bytes instanceof Uint8Array == false)
  return -1;

  for (var i = 0; i <= bytes.length - 4; i++) {
    if (bytes[i] == 0xE0 &&
    bytes[i + 1] == 0x7F &&
    bytes[i + 2] == 0x10 &&
    bytes[i + 3] == 0x00) {
      return i;
    }
  }

  return -1;

}

function findSequenceDelimitationIndex(bytes, startIndex = 0) {

  if (bytes instanceof Uint8Array == false)
  return -1;

  var start = Math.max(0, Number(startIndex) || 0);
  for (var i = start; i <= bytes.length - 8; i++) {
    if (bytes[i] == 0xFE &&
    bytes[i + 1] == 0xFF &&
    bytes[i + 2] == 0xDD &&
    bytes[i + 3] == 0xE0) {
      return i;
    }
  }

  return -1;

}

function hasTrailingDuplicatePixelDataHeader(bytes) {

  if (bytes instanceof Uint8Array == false)
  return false;

  // Signature observed when onEndAttribute fired twice for final PixelData:
  // (7FE0,0010) OB Reserved=0000 VL=00100000 appended at EOF.
  const signature = new Uint8Array([0xE0, 0x7F, 0x10, 0x00, 0x4F, 0x42, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00]);
  if (bytes.length < signature.length)
  return false;

  const start = bytes.length - signature.length;
  for (var i = 0; i < signature.length; i++) {
    if (bytes[start + i] != signature[i])
    return false;
  }

  return true;

}

test("Test: withTranscoding rewrites transfer syntax from explicit-vr-little-endian to implicit-vr-little-endian", async () => {

  const sourceBytes = buildSyntheticExplicitLittleEndianDicom();

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  expect(transcodedBytes instanceof Uint8Array).toBe(true);
  expect(transcodedBytes.length).toBeGreaterThan(0);

  const sourceInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.ImplicitVRLittleEndian.ID);
  expect(transcodedInstance.dataSet.find(Tag.PatientName).value).toBe(sourceInstance.dataSet.find(Tag.PatientName).value);
  expect(transcodedInstance.dataSet.find(Tag.PatientID).value).toBe(sourceInstance.dataSet.find(Tag.PatientID).value);

});

test("Test: withTranscoding unsupported syntax pair fails when fallback is fail", async () => {

  const sourceBytes = readDicomBytes("0002.DCM");
  const concerns = [];

  const pipeline = EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.ExplicitVRBigEndian.ID,
    fallback: "fail",
    onConcern: (concern) => concerns.push(concern)
  }).
  toDicomData().
  build();

  await expect(pipeline.process({ source: sourceBytes })).rejects.toBeDefined();
  expect(concerns.length).toBeGreaterThan(0);
  expect(concerns[0].code).toBe("UnsupportedTransferSyntaxPair");

});

test("Test: withTranscoding unsupported syntax pair can passthrough source transfer syntax", async () => {

  const sourceBytes = readDicomBytes("0002.DCM");
  const sourceInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: sourceBytes });

  const passthroughBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.ExplicitVRBigEndian.ID,
    fallback: "passthrough"
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const passthroughInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: passthroughBytes });

  expect(passthroughInstance.metaSet.transferSyntaxUID.ID).toBe(sourceInstance.metaSet.transferSyntaxUID.ID);

});

test("Test: withTranscoding transcodes explicit-vr-little-endian PixelData to JPEG 2000 encapsulated syntax", async () => {

  const sourceBytes = buildSyntheticExplicitLittleEndianDicom();
  const concerns = [];

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.JPEG2000.ID,
    onConcern: (concern) => concerns.push(concern),
    codec: {
      encode: {
        backend: createFakeJpeg2000EncoderBackend()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  const pixelDataAttribute = transcodedInstance.dataSet.find(Tag.PixelData);

  expect(concerns.length).toBe(0);
  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.JPEG2000.ID);
  expect(pixelDataAttribute).toBeDefined();
  expect(pixelDataAttribute.valueLength).toBe(Constants.UndefinedLength);
  expect(pixelDataAttribute.isBulkStreamed).toBe(true);
  expect(pixelDataAttribute.value instanceof Uint8Array).toBe(true);
  expect(pixelDataAttribute.value.length).toBe(0);

});

test("Test: withTranscoding in streamed mode does not append a duplicate trailing PixelData header", async () => {

  const sourceBytes = buildSyntheticExplicitLittleEndianDicom();

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withBulkDataPolicy({
    mode: "auto",
    knownLengthThreshold: 0
  }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.JPEG2000.ID,
    codec: {
      encode: {
        backend: createFakeJpeg2000EncoderBackend()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const pixelDataIndex = findPixelDataTagIndex(transcodedBytes);
  expect(pixelDataIndex).toBeGreaterThanOrEqual(0);

  const pixelDataVL = new DataView(
  transcodedBytes.buffer,
  transcodedBytes.byteOffset + pixelDataIndex + 8,
  4).
  getUint32(0, true);
  expect(pixelDataVL).toBe(Constants.UndefinedLength);

  const sequenceDelimitationIndex = findSequenceDelimitationIndex(transcodedBytes, pixelDataIndex + 12);
  expect(sequenceDelimitationIndex).toBeGreaterThanOrEqual(0);
  expect(sequenceDelimitationIndex + 8).toBe(transcodedBytes.length);

});

test("Test: withTranscoding supports JPEG 2000 round-trip back to explicit-vr-little-endian", async () => {

  const sourceBytes = buildSyntheticExplicitLittleEndianDicom();
  const stageOneBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.JPEG2000.ID,
    codec: {
      encode: {
        backend: createFakeJpeg2000EncoderBackend()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const roundTripBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.ExplicitVRLittleEndian.ID,
    codec: {
      decode: {
        openjpegModule: createFakeOpenJpegModule()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: stageOneBytes });

  const roundTripInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: roundTripBytes });

  expect(roundTripInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);
  expect(roundTripInstance.dataSet.find(Tag.PatientName).value).toBe("SYNTHETIC^PATIENT");

  const pixelDataAttribute = roundTripInstance.dataSet.find(Tag.PixelData);
  expect(pixelDataAttribute.valueLength).toBe(4);
  expect(pixelDataAttribute.value instanceof Uint8Array).toBe(true);
  expect(pixelDataAttribute.value.length).toBe(4);

});

test("Test: withTranscoding transcodes explicit-vr-little-endian PixelData to HTJ2K encapsulated syntax", async () => {

  const sourceBytes = buildSyntheticExplicitLittleEndianDicom();
  const concerns = [];

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.HTJ2K.ID,
    onConcern: (concern) => concerns.push(concern),
    codec: {
      encode: {
        backend: createFakeJpeg2000EncoderBackend()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  const pixelDataAttribute = transcodedInstance.dataSet.find(Tag.PixelData);

  expect(concerns.length).toBe(0);
  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.HTJ2K.ID);
  expect(pixelDataAttribute).toBeDefined();
  expect(pixelDataAttribute.valueLength).toBe(Constants.UndefinedLength);
  expect(pixelDataAttribute.isBulkStreamed).toBe(true);
  expect(pixelDataAttribute.value instanceof Uint8Array).toBe(true);

});

test("Test: withTranscoding supports HTJ2K round-trip back to explicit-vr-little-endian", async () => {

  const sourceBytes = buildSyntheticExplicitLittleEndianDicom();
  const stageOneBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.HTJ2K.ID,
    codec: {
      encode: {
        backend: createFakeJpeg2000EncoderBackend()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const roundTripBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.ExplicitVRLittleEndian.ID,
    codec: {
      decode: {
        openjpegModule: createFakeOpenJpegModule()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: stageOneBytes });

  const roundTripInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: roundTripBytes });

  expect(roundTripInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);
  expect(roundTripInstance.dataSet.find(Tag.PatientName).value).toBe("SYNTHETIC^PATIENT");

  const pixelDataAttribute = roundTripInstance.dataSet.find(Tag.PixelData);
  expect(pixelDataAttribute).toBeDefined();
  expect(pixelDataAttribute.valueLength).toBe(4);
  expect(pixelDataAttribute.value instanceof Uint8Array).toBe(true);
  expect(pixelDataAttribute.value.length).toBe(4);

});

test("Test: withBurnedInRedaction redacts configured pixel regions while preserving transfer syntax by default", async () => {

  const sourceBytes = buildSyntheticExplicitLittleEndianDicom();

  const redactedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withBurnedInRedaction({
    regions: [{ x: 1, y: 0, width: 1, height: 1 }]
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const redactedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: redactedBytes });

  expect(redactedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);

  const pixelDataAttribute = redactedInstance.dataSet.find(Tag.PixelData);
  expect(pixelDataAttribute.valueLength).toBe(4);
  expect(pixelDataAttribute.value instanceof Uint8Array).toBe(true);
  expect(Array.from(pixelDataAttribute.value)).toEqual([0, 0, 2, 3]);

});

test("Test: withBurnedInRedaction preserves RLE source transfer syntax when RLE encoder is available", async () => {

  const sourceBytes = readDicomBytes("US-PAL-8-10x-echo.dcm");
  const concerns = [];

  const redactedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withBurnedInRedaction({
    regions: [
    { x: 0, y: 100, width: 382, height: 204 },
    { x: 0, y: 400, width: 276, height: 342 },
    { x: 0, y: 732, width: 116, height: 94 }],

    onConcern: (concern) => concerns.push(concern)
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const redactedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: redactedBytes });

  expect(redactedBytes.length).toBeGreaterThan(4096);
  expect(redactedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.RLELossless.ID);
  expect(redactedInstance.dataSet.find(Tag.PixelData)).toBeDefined();
  expect(firstNumericValue(redactedInstance.dataSet.find(Tag.SamplesPerPixel)?.value, null)).toBe(3);
  var redactedPhotometric = redactedInstance.dataSet.find(Tag.PhotometricInterpretation)?.value;
  if (Array.isArray(redactedPhotometric) == true)
  redactedPhotometric = redactedPhotometric[0];
  expect(String(redactedPhotometric ?? "").trim().toUpperCase()).toBe("RGB");
  expect(redactedInstance.dataSet.find(Tag.RedPaletteColorLookupTableDescriptor)).toBeUndefined();
  expect(redactedInstance.dataSet.find(Tag.GreenPaletteColorLookupTableDescriptor)).toBeUndefined();
  expect(redactedInstance.dataSet.find(Tag.BluePaletteColorLookupTableDescriptor)).toBeUndefined();
  expect(redactedInstance.dataSet.find(Tag.RedPaletteColorLookupTableData)).toBeUndefined();
  expect(redactedInstance.dataSet.find(Tag.GreenPaletteColorLookupTableData)).toBeUndefined();
  expect(redactedInstance.dataSet.find(Tag.BluePaletteColorLookupTableData)).toBeUndefined();

  const fallbackConcern = concerns.find((concern) => concern.code == "PreserveTransferSyntaxUnavailable");
  expect(fallbackConcern).toBeUndefined();

});

test("Test: withBurnedInRedaction falls back from RLE preserve target when no RLE encoder is configured", async () => {

  const sourceBytes = readDicomBytes("US-PAL-8-10x-echo.dcm");
  const concerns = [];

  const codecRegistry = new CodecRegistry();
  codecRegistry.setDecoderForTransferSyntax(TransferSyntax.NONE, function () {
    return {
      decode(source, sourceStart, sourceStop, destination, destinationStart) {
        return true;
      }
    };
  });
  codecRegistry.setDecoderForTransferSyntax(TransferSyntax.RLELossless, new RleDecoder());

  const redactedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withCodecRegistry(codecRegistry).
  withBurnedInRedaction({
    regions: [
    { x: 0, y: 100, width: 382, height: 204 },
    { x: 0, y: 400, width: 276, height: 342 },
    { x: 0, y: 732, width: 116, height: 94 }],

    onConcern: (concern) => concerns.push(concern)
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const redactedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: redactedBytes });

  expect(redactedBytes.length).toBeGreaterThan(4096);
  expect(redactedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);

  const fallbackConcern = concerns.find((concern) => concern.code == "PreserveTransferSyntaxUnavailable");
  expect(fallbackConcern).toBeDefined();
  expect(fallbackConcern.sourceTransferSyntax).toBe(TransferSyntax.RLELossless.ID);
  expect(fallbackConcern.targetTransferSyntax).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);

});

test("Test: withTranscoding transcodes explicit-vr-little-endian PixelData to JPEG Baseline encapsulated syntax", async () => {

  const sourceBytes = buildSyntheticExplicitLittleEndianDicom();
  const concerns = [];

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.JPEGBaseline8Bit.ID,
    onConcern: (concern) => concerns.push(concern),
    codec: {
      encode: {
        quality: 80
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  const pixelDataAttribute = transcodedInstance.dataSet.find(Tag.PixelData);

  expect(concerns.length).toBe(0);
  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.JPEGBaseline8Bit.ID);
  expect(pixelDataAttribute).toBeDefined();
  expect(pixelDataAttribute.valueLength).toBe(Constants.UndefinedLength);
  expect(pixelDataAttribute.isBulkStreamed).toBe(true);
  expect(pixelDataAttribute.value instanceof Uint8Array).toBe(true);
  expect(firstNumericValue(transcodedInstance.dataSet.find(Tag.SamplesPerPixel)?.value, null)).toBe(3);

});

test("Test: withTranscoding transcodes explicit-vr-little-endian PixelData to RLE Lossless encapsulated syntax", async () => {

  const sourceBytes = buildSyntheticExplicitLittleEndianDicom();
  const concerns = [];

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.RLELossless.ID,
    onConcern: (concern) => concerns.push(concern)
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  const pixelDataAttribute = transcodedInstance.dataSet.find(Tag.PixelData);

  expect(concerns.find((concern) => concern.code == "UnsupportedTransferSyntaxPair")).toBeUndefined();
  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.RLELossless.ID);
  expect(pixelDataAttribute).toBeDefined();
  expect(pixelDataAttribute.valueLength).toBe(Constants.UndefinedLength);
  expect(pixelDataAttribute.isBulkStreamed).toBe(true);
  expect(firstNumericValue(transcodedInstance.dataSet.find(Tag.SamplesPerPixel)?.value, null)).toBe(1);

});

test("Test: withTranscoding supports JPEG Baseline round-trip back to explicit-vr-little-endian", async () => {

  const sourceBytes = buildSyntheticExplicitLittleEndianDicom();
  const stageOneBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.JPEGBaseline8Bit.ID,
    codec: {
      encode: {
        quality: 80
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const roundTripBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.ExplicitVRLittleEndian.ID
  }).
  toDicomData().
  build().
  process({ source: stageOneBytes });

  const roundTripInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: roundTripBytes });

  expect(roundTripInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);
  expect(roundTripInstance.dataSet.find(Tag.PatientName).value).toBe("SYNTHETIC^PATIENT");

  const pixelDataAttribute = roundTripInstance.dataSet.find(Tag.PixelData);
  expect(pixelDataAttribute).toBeDefined();
  expect(pixelDataAttribute.valueLength).toBeGreaterThan(0);
  expect(pixelDataAttribute.value instanceof Uint8Array).toBe(true);
  expect(pixelDataAttribute.value.length).toBeGreaterThan(0);

});

test("Test: withTranscoding on dataset-only input emits synthetic Part-10 meta and parseable JPEG 2000 output", async () => {

  const sourceBytes = readDicomBytes("CR-MONO1-10-chest.dcm");
  const concerns = [];

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.JPEG2000Lossless.ID,
    onConcern: (concern) => concerns.push(concern),
    codec: {
      encode: {
        backend: createFakeJpeg2000EncoderBackend()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  expect(transcodedBytes instanceof Uint8Array).toBe(true);
  expect(transcodedBytes.length).toBeGreaterThan(0);

  // Synthetic Part-10 header should be present.
  expect(String.fromCharCode(...Array.from(transcodedBytes.slice(128, 132)))).toBe("DICM");

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  expect(transcodedInstance.metaSet).toBeDefined();
  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.JPEG2000Lossless.ID);

  const pixelDataAttribute = transcodedInstance.dataSet.find(Tag.PixelData);
  expect(pixelDataAttribute).toBeDefined();
  expect(pixelDataAttribute.valueLength).toBe(Constants.UndefinedLength);
  expect(pixelDataAttribute.isBulkStreamed).toBe(true);

  expect(concerns.find((concern) => concern.code == "AssumedSourceTransferSyntax")).toBeDefined();

});

test("Test: withTranscoding on MR-MONO2-8-16x-heart emits parseable JPEG 2000 output without duplicate trailing PixelData header", async () => {

  const sourceBytes = readDicomBytes("MR-MONO2-8-16x-heart.dcm");

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    sourceTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID,
    targetTransferSyntax: TransferSyntax.JPEG2000.ID,
    codec: {
      encode: {
        openjpegModule: createFakeOpenJpegEncodeModule(),
        compressionRatio: 10
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.JPEG2000.ID);
  expect(transcodedInstance.dataSet.find(Tag.PixelData)).toBeDefined();
  expect(hasTrailingDuplicatePixelDataHeader(transcodedBytes)).toBe(false);

});

test("Test: withTranscoding on MR-MONO2-8-16x-heart emits parseable JPEG 2000 lossless output without duplicate trailing PixelData header", async () => {

  const sourceBytes = readDicomBytes("MR-MONO2-8-16x-heart.dcm");

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    sourceTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID,
    targetTransferSyntax: TransferSyntax.JPEG2000Lossless.ID,
    codec: {
      encode: {
        openjpegModule: createFakeOpenJpegEncodeModule()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.JPEG2000Lossless.ID);
  expect(transcodedInstance.dataSet.find(Tag.PixelData)).toBeDefined();
  expect(hasTrailingDuplicatePixelDataHeader(transcodedBytes)).toBe(false);

});

test("Test: withTranscoding supports RLE Lossless source to JPEG 2000 lossless target for US-PAL-8-10x-echo", async () => {

  const sourceBytes = readDicomBytes("US-PAL-8-10x-echo.dcm");
  const concerns = [];

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.JPEG2000Lossless.ID,
    onConcern: (concern) => concerns.push(concern),
    codec: {
      encode: {
        openjpegModule: createFakeOpenJpegEncodeModule()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.JPEG2000Lossless.ID);
  expect(concerns.find((concern) => concern.code == "UnsupportedTransferSyntaxPair")).toBeUndefined();

});

test("Test: withTranscoding accepts sourceTransferSyntax override to suppress dataset-only assumption warning", async () => {

  const sourceBytes = readDicomBytes("CR-MONO1-10-chest.dcm");
  const concerns = [];

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    sourceTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID,
    targetTransferSyntax: TransferSyntax.JPEG2000Lossless.ID,
    onConcern: (concern) => concerns.push(concern),
    codec: {
      encode: {
        openjpegModule: createFakeOpenJpegEncodeModule()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  expect(transcodedBytes instanceof Uint8Array).toBe(true);
  expect(transcodedBytes.length).toBeGreaterThan(0);
  expect(concerns.find((concern) => concern.code == "AssumedSourceTransferSyntax")).toBeUndefined();

});

test("Test: withTranscoding on MR-shoulder normalizes pixel metadata and rescales VOI window for 8-bit target", async () => {

  const sourceBytes = readDicomBytes("MR-shoulder.dcm");
  const concerns = [];

  const sourceInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: sourceBytes });

  const sourceBitsStored = Math.max(1, Number(sourceInstance.dataSet.find(Tag.BitsStored)?.value ?? 8));
  const sourceWindowCenter = firstNumericValue(sourceInstance.dataSet.find(Tag.WindowCenter)?.value, null);
  const sourceWindowWidth = firstNumericValue(sourceInstance.dataSet.find(Tag.WindowWidth)?.value, null);
  const sourceMax = sourceBitsStored >= 31 ? Number.MAX_SAFE_INTEGER : (1 << sourceBitsStored) - 1;
  const scale = 255 / Math.max(1, sourceMax);

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.JPEG2000.ID,
    onConcern: (concern) => concerns.push(concern),
    codec: {
      encode: {
        backend: createFakeJpeg2000EncoderBackend()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  expect(concerns.length).toBe(0);
  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.JPEG2000.ID);
  expect(Number(transcodedInstance.dataSet.find(Tag.BitsAllocated)?.value)).toBe(8);
  expect(Number(transcodedInstance.dataSet.find(Tag.BitsStored)?.value)).toBe(8);
  expect(Number(transcodedInstance.dataSet.find(Tag.HighBit)?.value)).toBe(7);
  expect(Number(transcodedInstance.dataSet.find(Tag.PixelRepresentation)?.value)).toBe(0);

  const targetWindowCenter = firstNumericValue(transcodedInstance.dataSet.find(Tag.WindowCenter)?.value, null);
  const targetWindowWidth = firstNumericValue(transcodedInstance.dataSet.find(Tag.WindowWidth)?.value, null);

  if (sourceWindowCenter != null && targetWindowCenter != null) {
    expect(targetWindowCenter).toBeCloseTo(sourceWindowCenter * scale, 3);
  }

  if (sourceWindowWidth != null && targetWindowWidth != null) {
    expect(targetWindowWidth).toBeCloseTo(Math.max(1, sourceWindowWidth * scale), 3);
  }

  const smallest = transcodedInstance.dataSet.find(Tag.SmallestImagePixelValue);
  if (smallest != null) {
    expect(Number(smallest.value)).toBe(0);
  }

  const largest = transcodedInstance.dataSet.find(Tag.LargestImagePixelValue);
  if (largest != null) {
    expect(Number(largest.value)).toBe(255);
  }

});

test("Test: withTranscoding preserves monochrome metadata for dataset-only JPEG 2000 lossless native path", async () => {

  const sourceBytes = readDicomBytes("CR-MONO1-10-chest.dcm");
  const concerns = [];

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    targetTransferSyntax: TransferSyntax.JPEG2000Lossless.ID,
    onConcern: (concern) => concerns.push(concern),
    codec: {
      encode: {
        openjpegModule: createFakeOpenJpegEncodeModule()
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.JPEG2000Lossless.ID);
  expect(Number(transcodedInstance.dataSet.find(Tag.SamplesPerPixel)?.value)).toBe(1);
  expect(String(transcodedInstance.dataSet.find(Tag.PhotometricInterpretation)?.value ?? "")).toBe("MONOCHROME1");
  expect(Number(transcodedInstance.dataSet.find(Tag.BitsAllocated)?.value)).toBe(16);
  expect(Number(transcodedInstance.dataSet.find(Tag.BitsStored)?.value)).toBe(10);
  expect(Number(transcodedInstance.dataSet.find(Tag.HighBit)?.value)).toBe(9);
  expect(Number(transcodedInstance.dataSet.find(Tag.PixelRepresentation)?.value)).toBe(0);

  expect(concerns.find((concern) => concern.code == "AssumedSourceTransferSyntax")).toBeDefined();
  expect(concerns.find((concern) => concern.code == "NativeMonochromePathUnavailable")).toBeUndefined();

});

test("Test: withTranscoding preserves 16-bit monochrome metadata for dataset-only JPEG 2000 native lossy path", async () => {

  const sourceBytes = readDicomBytes("CR-MONO1-10-chest.dcm");
  const concerns = [];

  const transcodedBytes = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  withTranscoding({
    sourceTransferSyntax: TransferSyntax.ImplicitVRLittleEndian.ID,
    targetTransferSyntax: TransferSyntax.JPEG2000.ID,
    onConcern: (concern) => concerns.push(concern),
    codec: {
      encode: {
        openjpegModule: createFakeOpenJpegEncodeModule(),
        compressionRatio: 10
      }
    }
  }).
  toDicomData().
  build().
  process({ source: sourceBytes });

  const transcodedInstance = await EASI.pipelineBuilder().
  fromByteStream().
  ofDicomData({ includePart10Header: true }).
  toInstances().
  build().
  process({ source: transcodedBytes });

  expect(transcodedInstance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.JPEG2000.ID);
  expect(Number(transcodedInstance.dataSet.find(Tag.SamplesPerPixel)?.value)).toBe(1);
  expect(String(transcodedInstance.dataSet.find(Tag.PhotometricInterpretation)?.value ?? "")).toBe("MONOCHROME1");
  expect(Number(transcodedInstance.dataSet.find(Tag.BitsAllocated)?.value)).toBe(16);
  expect(Number(transcodedInstance.dataSet.find(Tag.BitsStored)?.value)).toBe(10);
  expect(Number(transcodedInstance.dataSet.find(Tag.HighBit)?.value)).toBe(9);
  expect(Number(transcodedInstance.dataSet.find(Tag.PixelRepresentation)?.value)).toBe(0);

  expect(concerns.find((concern) => concern.code == "AssumedSourceTransferSyntax")).toBeUndefined();
  expect(concerns.find((concern) => concern.code == "NativeMonochromePathUnavailable")).toBeUndefined();

});
