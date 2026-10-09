import EASI from '../../src/EASI.js';
import DicomSelection from '../../src/handlers/selections/DicomSelection.js';
import Tag from '../../src/dicom/Tag.js';
import { getFixtureBytes, SYNTHETIC_IDENTIFIERS } from '../fixtures/dicom/SyntheticDicom.js';

test("Test: Selection parse returns selected attributes for single DICOM source", async () => {

  // Setup the selection for a known tag
  var selection = new DicomSelection();
  selection.addTag(Tag.SOPInstanceUID);

  // Build the DICOM selection reader
  const pipeline = EASI.pipelineBuilder().
  fromPartStream().
  ofDicomData().
  toSelection(selection).
  build();

  // Parse the DICOM instance
  const result = await pipeline.process({ source: getFixtureBytes() });

  // Validate the selected output
  expect(result).not.toBeNull();
  expect(result.has(Tag.SOPInstanceUID)).toBe(true);
  expect(result.first().value(Tag.SOPInstanceUID)).toBe(SYNTHETIC_IDENTIFIERS.sopInstanceUid);
  expect(result.first().find(Tag.PatientID)).toBeUndefined();

});
