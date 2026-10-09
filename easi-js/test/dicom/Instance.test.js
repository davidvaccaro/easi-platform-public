import EASI from '../../src/EASI.js';
import Constants from '../../src/dicom/Constants.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import { getFixtureBytes } from '../fixtures/dicom/SyntheticDicom.js';

var instance = null;

beforeAll(async () => {

  // Build the DICOM streaming reader
  const pipeline = EASI.pipelineBuilder().
  fromPartStream().
  withParser(new DicomDataParser({ includePart10Header: true })).
  withHandler(new DicomInstanceHandler()).
  build();

  // Parse an independently generated Part 10 object.
  await pipeline.
  process({ source: getFixtureBytes() }).
  then((parseResult) => {

    // Set the instance
    instance = parseResult;

  });

});

test("Test: Preamble Length", () => {
  expect(instance.preamble.valueLength).toBe(Constants.PreambleLength);
});

test("Test: Prefix Length", () => {
  expect(instance.prefix.valueLength).toBe(Constants.PrefixLength);
});

test("Test: Prefix Data", () => {
  expect(new TextDecoder().decode(instance.prefix.access())).toBe(Constants.PrefixValue);
});

test("Test: MetaSet IsComplete", () => {
  expect(instance.metaSet.isComplete).toBe(true);
});

test("Test: DataSet IsComplete", () => {
  expect(instance.dataSet.isComplete).toBe(true);
});
