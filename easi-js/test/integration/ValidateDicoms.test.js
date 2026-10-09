import EASI from '../../src/EASI.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import Tag from '../../src/dicom/Tag.js';
import { Status } from '../../src/parsers/Status.js';
import { createDicomFixture, SYNTHETIC_TRANSFER_SYNTAXES } from '../fixtures/dicom/SyntheticDicom.js';

// Byte layouts and expected metadata come from a deliberately independent encoder,
// not the EASI writer. Each profile covers a distinct supported DICOM capability.
const supportedProfiles = [
  'default', 'explicit-le', 'implicit-le', 'explicit-be',
  'signed-16', 'unsigned-16', 'monochrome1', 'rgb', 'rgb-planar',
  'rgb-big-endian', 'palette', 'multiframe', 'multiframe-implicit',
  'raw-implicit', 'raw-implicit-monochrome1', 'nested-sequences',
  'defined-sequences', 'rle', 'rle-palette', 'rle-rgb', 'rle-unsigned-16',
  'jpeg-baseline', 'jpeg-lossless', 'jpeg2000', 'encapsulated'
];

async function parseChunked(bytes, chunkLength) {
  const parser = new DicomDataParser({ includePart10Header: true });
  parser.handler = new DicomInstanceHandler();
  // Every fixture is split, including headers and values across byte boundaries.
  for (let offset = 0; offset < bytes.length; offset += chunkLength) {
    expect(await parser.parse(bytes.subarray(offset, offset + chunkLength))).toBe(Status.CONTINUE);
  }
  expect(await parser.parse(null, true)).toBe(Status.SUCCESS);
  return parser.result;
}

function tagIDs(attributeSet) {
  return attributeSet?.attributes.map(attribute => attribute.tag.ID) ?? [];
}

function expectFixture(instance, expected) {
  expect(instance.metaSet?.attributes.length ?? null).toBe(expected.metaCount);
  expect(instance.dataSet.attributes.length).toBe(expected.dataCount);
  expect(tagIDs(instance.metaSet)).toEqual(expected.metaTagIds);
  expect(tagIDs(instance.dataSet)).toEqual(expected.tagIds);
  expect(instance.dataSet.isComplete).toBe(true);
  expect(instance.dataSet.find(Tag.PatientName).value).toBe(expected.patientName);
  expect(instance.dataSet.find(Tag.PatientID).value).toBe(expected.patientId);
  expect(instance.dataSet.find(Tag.SOPInstanceUID).value).toBe(expected.sopInstanceUid);
  expect(instance.dataSet.find(Tag.Rows).value).toBe(expected.rows);
  expect(instance.dataSet.find(Tag.Columns).value).toBe(expected.columns);
  if (expected.metaCount !== null) expect(instance.metaSet.transferSyntaxUID.ID).toBe(expected.transferSyntaxUid);
  const pixelData = instance.dataSet.find(Tag.PixelData);
  expect(pixelData.isComplete).toBe(true);
  if ([SYNTHETIC_TRANSFER_SYNTAXES.implicitLE, SYNTHETIC_TRANSFER_SYNTAXES.explicitLE, SYNTHETIC_TRANSFER_SYNTAXES.explicitBE].includes(expected.transferSyntaxUid)) {
    expect(Array.from(pixelData.access())).toEqual(Array.from(expected.pixelBytes));
  }
  else {
    expect(pixelData.isBulkStreamed).toBe(true);
    expect(pixelData.bytesStreamed).toBeGreaterThan(0);
  }
}

test.each(supportedProfiles)('Validate generated DICOM capability: %s', async (profile) => {
  const { bytes, expected } = createDicomFixture(profile);
  const instance = await EASI.pipelineBuilder().
    fromPartStream().ofDicomData({ includePart10Header: true }).
    toInstances().build().process({ source: bytes });
  expectFixture(instance, expected);

  for (const chunkLength of [1, 7, 257]) {
    expectFixture(await parseChunked(bytes, chunkLength), expected);
  }
});

// DICOM PS3.5 A.4 requires each pixel fragment to have an even byte length.
// Both malformed inputs are invented here and retain the parser offset check.
test.each([3, 5])('Reject generated odd-length encapsulated fragment (%i bytes)', async (oddLength) => {
  const { bytes } = createDicomFixture('encapsulated-odd-fragment', { oddFragmentLength: oddLength });
  const parser = new DicomDataParser({ includePart10Header: true });
  parser.handler = new DicomInstanceHandler();
  expect(await parser.parse(bytes, true)).toBe(Status.FAIL);
  expect(parser.result).toBeUndefined();
  expect(parser.error.message).toContain('Expected an item with an explicit, valid length');
  expect(parser.dataElement.tag).toBe(Tag.PixelData);
  expect(Buffer.from(bytes).readUInt32LE(parser.totalBytesConsumed + 4)).toBe(oddLength);

  const pipeline = EASI.pipelineBuilder().fromPartStream().ofDicomData().toInstances().build();
  await expect(pipeline.process({ source: bytes })).rejects.toThrow('Invalid encapsulated value');
});
