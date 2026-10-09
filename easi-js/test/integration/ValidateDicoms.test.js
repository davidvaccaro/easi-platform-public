import EASI from '../../src/EASI.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import Tag from '../../src/dicom/Tag.js';
import { Status } from '../../src/parsers/Status.js';

const path = require('path');
const fs = require('fs');

const dicomDirectory = path.join(process.cwd().split('easi-js')[0], 'data/dicoms');

// The former DUMP comparison never awaited its promises and contained misspelled
// property names. These explicit counts were independently checked against the
// bundled dcdump output; this regression suite requires no external executable.
const supportedDicoms = [
  ['0002.DCM', 6, 69],
  ['0009.DCM', 7, 70],
  ['0012.DCM', 7, 70],
  ['56364397.dcm', 7, 49],
  ['56364398.dcm', 7, 78],
  ['56364399.dcm', 7, 78],
  ['56364400.dcm', 7, 78],
  ['56364401.dcm', 7, 78],
  ['CR-MONO1-10-chest.dcm', null, 47],
  ['CT-MONO2-12-lomb-an2.dcm', null, 68],
  ['CT-MONO2-16-ankle 2.dcm', 8, 47],
  ['CT-MONO2-16-ankle.dcm', 8, 47],
  ['CT-MONO2-16-chest.dcm', 8, 70],
  ['CT-MONO2-16-ort.dcm', 8, 68],
  ['CT-MONO2-8-abdo.dcm', 5, 31],
  ['MR-MONO2-12-an2.dcm', null, 85],
  ['MR-MONO2-12-angio-an1.dcm', null, 48],
  ['MR-MONO2-12-shoulder.dcm', 6, 74],
  ['MR-MONO2-16-head.dcm', 7, 80],
  ['MR-MONO2-16-knee.dcm', 8, 75],
  ['MR-MONO2-8-16x-heart.dcm', 6, 41],
  ['MR-shoulder.dcm', 6, 74],
  ['NESTED_SEQUENCE.dcm', 7, 106],
  ['NM-MONO2-16-13x-heart.dcm', 4, 56],
  ['OT-MONO2-8-a7.dcm', null, 25],
  ['OT-MONO2-8-colon.dcm', null, 25],
  ['OT-MONO2-8-hip.dcm', null, 25],
  ['OT-PAL-8-face.dcm', null, 33],
  ['US-MONO2-8-8x-execho.dcm', 6, 42],
  ['US-PAL-8-10x-echo.dcm', 6, 39],
  ['US-RGB-8-epicard.dcm', 7, 37],
  ['US-RGB-8-esopecho.dcm', 6, 38],
  ['XA-MONO2-8-12x-catheter.dcm', 6, 42],
  ['instance1.dcm', 7, 252]
];

async function parseChunked(bytes) {
  const parser = new DicomDataParser({ includePart10Header: true });
  parser.handler = new DicomInstanceHandler();
  // Odd chunk sizes exercise headers/values that straddle byte-pair boundaries.
  for (let offset = 0; offset < bytes.length; offset += 4093) {
    expect(await parser.parse(bytes.subarray(offset, offset + 4093))).toBe(Status.CONTINUE);
  }
  expect(await parser.parse(null, true)).toBe(Status.SUCCESS);
  return parser.result;
}

function tagIDs(attributeSet) {
  return attributeSet?.attributes.map(attribute => attribute.tag.ID) ?? [];
}

test.each(supportedDicoms)('Validate supported DICOM corpus: %s', async (name, metaCount, dataCount) => {
  const bytes = fs.readFileSync(path.join(dicomDirectory, name));
  const instance = await EASI.pipelineBuilder().
    fromPartStream().ofDicomData({ includePart10Header: true }).
    toInstances().build().process({ source: bytes });

  expect(instance.metaSet?.attributes.length ?? null).toBe(metaCount);
  expect(instance.dataSet.attributes.length).toBe(dataCount);
  expect(instance.dataSet.isComplete).toBe(true);
  expect(instance.dataSet.find(Tag.PixelData).isComplete).toBe(true);

  const chunked = await parseChunked(bytes);
  expect(tagIDs(chunked.metaSet)).toEqual(tagIDs(instance.metaSet));
  expect(tagIDs(chunked.dataSet)).toEqual(tagIDs(instance.dataSet));
  expect(chunked.dataSet.find(Tag.PixelData).isComplete).toBe(true);
});

// Preserve these original files as malformed-input tests. Their JPEG fragments
// have odd lengths; DICOM PS3.5 A.4 requires each pixel fragment to have even size.
test.each([
  ['0003.DCM', 36357],
  ['0004.DCM', 28249]
])('Reject odd-length encapsulated fragment in %s (%i bytes)', async (name, oddLength) => {
  const bytes = fs.readFileSync(path.join(dicomDirectory, name));
  const parser = new DicomDataParser({ includePart10Header: true });
  parser.handler = new DicomInstanceHandler();
  expect(await parser.parse(bytes, true)).toBe(Status.FAIL);
  expect(parser.result).toBeUndefined();
  expect(parser.error.message).toContain('Expected an item with an explicit, valid length');
  expect(parser.dataElement.tag).toBe(Tag.PixelData);
  expect(bytes.readUInt32LE(parser.totalBytesConsumed + 4)).toBe(oddLength);

  const pipeline = EASI.pipelineBuilder().fromPartStream().ofDicomData().toInstances().build();
  await expect(pipeline.process({ source: bytes })).rejects.toThrow('Invalid encapsulated value');
});
