import EASI from '../../src/EASI.js';
import DicomSelection from '../../src/handlers/selections/DicomSelection.js';
import Tag from '../../src/dicom/Tag.js';
import PipelineResultCollection from '../../src/pipelines/PipelineResultCollection.js';
import { getFixtureBytes, SYNTHETIC_IDENTIFIERS } from '../fixtures/dicom/SyntheticDicom.js';

test('Test: one built toInstances pipeline can process repeatedly without result accumulation', async () => {

  const pipeline = EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toInstances().
  build();

  const first = await pipeline.process({ source: getFixtureBytes() });
  const second = await pipeline.process({ source: getFixtureBytes('default', { sopInstanceUid: '2.25.104' }) });

  expect(PipelineResultCollection.isCollection(first)).toBe(true);
  expect(PipelineResultCollection.isCollection(second)).toBe(true);
  expect(first.count).toBe(1);
  expect(second.count).toBe(1);
  expect(first).not.toBe(second);
  expect(first.first().dataSet).toBeDefined();
  expect(second.first().dataSet).toBeDefined();
  expect(first.first().dataSet.value(Tag.SOPInstanceUID)).toBe(SYNTHETIC_IDENTIFIERS.sopInstanceUid);
  expect(second.first().dataSet.value(Tag.SOPInstanceUID)).toBe('2.25.104');

});

test('Test: one built toSelection pipeline can process repeatedly without result accumulation', async () => {

  const selection = new DicomSelection();
  selection.addTag(Tag.SOPInstanceUID);

  const pipeline = EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toSelection(selection).
  build();

  const first = await pipeline.process({ source: getFixtureBytes() });
  const second = await pipeline.process({ source: getFixtureBytes('default', { sopInstanceUid: '2.25.104' }) });

  expect(PipelineResultCollection.isCollection(first)).toBe(true);
  expect(PipelineResultCollection.isCollection(second)).toBe(true);
  expect(first.count).toBe(1);
  expect(second.count).toBe(1);
  expect(first).not.toBe(second);
  expect(first.first().find(Tag.SOPInstanceUID)).toBeDefined();
  expect(second.first().find(Tag.SOPInstanceUID)).toBeDefined();
  expect(first.first().value(Tag.SOPInstanceUID)).toBe(SYNTHETIC_IDENTIFIERS.sopInstanceUid);
  expect(second.first().value(Tag.SOPInstanceUID)).toBe('2.25.104');

});
