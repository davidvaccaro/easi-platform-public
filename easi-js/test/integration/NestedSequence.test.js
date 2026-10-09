import EASI from '../../src/EASI.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import Tag from '../../src/dicom/Tag.js';
import { createDicomFixture } from '../fixtures/dicom/SyntheticDicom.js';

test("Test: Nested sequence parsing keeps PixelData at dataset level", async () => {

  const fixture = createDicomFixture('nested-sequences');

  // Build the DICOM streaming reader
  const pipeline = EASI.pipelineBuilder().
  fromPartStream().
  withParser(new DicomDataParser()).
  withHandler(new DicomInstanceHandler()).
  build();

  // Parse the DICOM instance
  const instance = await pipeline.process({ source: fixture.bytes });

  // Validate that PixelData remains in the top-level dataset
  expect(instance.dataSet.has(Tag.PixelData)).toBe(true);
  expect(instance.dataSet.find(Tag.PixelData)).toBeDefined();
  expect(Array.from(instance.dataSet.find(Tag.PixelData).access())).toEqual(Array.from(fixture.expected.pixelBytes));
  const sequence = instance.dataSet.find(Tag.SourceImageSequence);
  expect(sequence.items.length).toBe(2);
  expect(sequence.items.every(item => item.has(Tag.PixelData) === false)).toBe(true);
  const nested = sequence.items[0].find(Tag.RequestAttributesSequence);
  expect(nested.items.length).toBe(1);
  expect(nested.items[0].has(Tag.PixelData)).toBe(false);
  expect(nested.items[0].find(Tag.PatientName).value).toBe('SYNTHETIC^NESTED');

});
