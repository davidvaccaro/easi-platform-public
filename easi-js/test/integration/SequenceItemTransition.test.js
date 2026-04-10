import EASI from '../../src/EASI.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import Tag from '../../src/dicom/Tag.js';

function u16le(value) {
  return Buffer.from([value & 0xFF, value >>> 8 & 0xFF]);
}

function u32le(value) {
  return Buffer.from([
  value & 0xFF,
  value >>> 8 & 0xFF,
  value >>> 16 & 0xFF,
  value >>> 24 & 0xFF]);

}

function tagBytes(tagID) {
  const group = parseInt(tagID.substring(0, 4), 16);
  const element = parseInt(tagID.substring(4, 8), 16);
  return Buffer.concat([u16le(group), u16le(element)]);
}

function paddedText(value, pad = 0x20) {
  const bytes = Buffer.from(value, 'ascii');
  if (bytes.length % 2 === 0)
  return bytes;
  return Buffer.concat([bytes, Buffer.from([pad])]);
}

function paddedUID(uid) {
  return paddedText(uid, 0x00);
}

function explicitElement(tagID, vr, valueBytes) {
  return Buffer.concat([
  tagBytes(tagID),
  Buffer.from(vr, 'ascii'),
  u16le(valueBytes.length),
  Buffer.from(valueBytes)]);

}

function explicitLongElement(tagID, vr, valueLength) {
  return Buffer.concat([
  tagBytes(tagID),
  Buffer.from(vr, 'ascii'),
  Buffer.from([0x00, 0x00]),
  u32le(valueLength >>> 0)]);

}

function sequenceItem(itemBytes) {
  return Buffer.concat([
  tagBytes('FFFEE000'),
  u32le(itemBytes.length),
  Buffer.from(itemBytes)]);

}

function sequenceDelimitation() {
  return Buffer.concat([
  tagBytes('FFFEE0DD'),
  u32le(0)]);

}

function buildSequenceItemTransitionRegressionDicom() {

  const preamble = Buffer.alloc(128, 0);
  const prefix = Buffer.from('DICM', 'ascii');

  const tsUID = explicitElement('00020010', 'UI', paddedUID('1.2.840.10008.1.2.1'));
  const metaGroupLength = explicitElement('00020000', 'UL', u32le(tsUID.length));
  const meta = Buffer.concat([metaGroupLength, tsUID]);

  // Add a long top-level LO so dataset-only payload is non-trivial and parser state transitions are exercised.
  const studyDescription = explicitElement('00081030', 'LO', paddedText('SEQUENCE ITEM TRANSITION REGRESSION TEST PAYLOAD'));
  const topLevelStudyUID = explicitElement('0020000D', 'UI', paddedUID('1.2.840.10008.5.1'));

  const item1StudyUID = explicitElement('0020000D', 'UI', paddedUID('1.2.840.10008.5.1.1'));
  const item2StudyUID = explicitElement('0020000D', 'UI', paddedUID('1.2.840.10008.5.1.2'));

  const requestAttributesSequence = Buffer.concat([
  explicitLongElement('00400275', 'SQ', 0xFFFFFFFF),
  sequenceItem(item1StudyUID),
  sequenceItem(item2StudyUID),
  sequenceDelimitation()]);


  const seriesUID = explicitElement('0020000E', 'UI', paddedUID('1.2.840.10008.5.2'));

  const dataSet = Buffer.concat([
  studyDescription,
  topLevelStudyUID,
  requestAttributesSequence,
  seriesUID]);


  return Buffer.concat([
  preamble,
  prefix,
  meta,
  dataSet]);


}

test('Test: Parser does not leak FFFEE000 item marker into sequence item attributes when sequence has multiple explicit-length items', async () => {

  const bytes = buildSequenceItemTransitionRegressionDicom();

  const pipeline = EASI.pipelineBuilder().
  fromPartStream().
  withParser(new DicomDataParser()).
  withHandler(new DicomInstanceHandler()).
  build();

  const instance = await pipeline.process({ source: bytes });
  const sequence = instance.dataSet.find(Tag.RequestAttributesSequence);

  expect(sequence).toBeDefined();
  expect(sequence.items.length).toBe(2);

  expect(sequence.items[0].find(Tag.StudyInstanceUID)).toBeDefined();
  expect(sequence.items[1].find(Tag.StudyInstanceUID)).toBeDefined();

  expect(sequence.items[0].has(Tag.Item)).toBe(false);
  expect(sequence.items[1].has(Tag.Item)).toBe(false);

  expect(instance.dataSet.find(Tag.SeriesInstanceUID)).toBeDefined();

});