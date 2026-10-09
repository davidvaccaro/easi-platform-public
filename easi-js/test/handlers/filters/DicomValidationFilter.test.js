import EASI from '../../../src/EASI.js';
import Tag from '../../../src/dicom/Tag.js';
import DicomInstanceHandler from '../../../src/handlers/terminals/DicomInstanceHandler.js';
import DicomValidationFilter, {
ValidationConcernCodes,
ValidationGoals } from
'../../../src/handlers/filters/DicomValidationFilter.js';
import { Status } from '../../../src/parsers/Status.js';
import { getFixtureBytes } from '../../fixtures/dicom/SyntheticDicom.js';

async function parseInstanceWithHandler(handler, bytes) {

  const pipeline = EASI.pipelineBuilder().
  fromPartStream().ofDicomData().
  withHandler(handler).
  build();

  return await pipeline.process({ source: bytes });

}

function fakeAttribute(tag, overrides = {}) {
  return Object.assign({
    tag,
    isComplete: true,
    bytesRemaining: 0
  }, overrides);
}

test('Test: DicomValidationFilter permissive mode reports duplicate attributes and continues', async () => {

  const forwardedAttributes = [];
  const concerns = [];

  const nextHandler = {
    onStartAttribute: (context, attribute) => {
      forwardedAttributes.push(attribute.tag.ID);
      return Status.CONTINUE;
    }
  };

  const filter = new DicomValidationFilter(nextHandler, {
    goal: ValidationGoals.PERMISSIVE,
    onConcern: (concern) => concerns.push(concern)
  });

  const context = await filter.onStartInstance(null);
  await filter.onStartDataSet(context);

  const first = fakeAttribute(Tag.PatientName);
  const second = fakeAttribute(Tag.PatientName);

  expect(await filter.onStartAttribute(context, first)).toBe(Status.CONTINUE);
  expect(await filter.onStartAttribute(context, second)).toBe(Status.CONTINUE);

  expect(forwardedAttributes).toEqual(['00100010', '00100010']);
  expect(concerns.length).toBe(1);
  expect(concerns[0].code).toBe(ValidationConcernCodes.DuplicateAttribute);
  expect(filter.concerns.length).toBe(1);

});

test('Test: DicomValidationFilter strict mode fails while still emitting concern callback', async () => {

  const concerns = [];
  const filter = new DicomValidationFilter(null, {
    goal: ValidationGoals.STRICT,
    onConcern: (concern) => concerns.push(concern)
  });

  const context = await filter.onStartInstance(null);
  await filter.onStartDataSet(context);

  await filter.onStartAttribute(context, fakeAttribute(Tag.PatientName));
  const status = await filter.onStartAttribute(context, fakeAttribute(Tag.PatientName));

  expect(status).toBe(Status.FAIL);
  expect(concerns.length).toBe(1);
  expect(concerns[0].code).toBe(ValidationConcernCodes.DuplicateAttribute);
  expect(filter.concerns.length).toBe(1);

});

test('Test: DicomValidationFilter does not report DuplicateAttribute for repeated sequence control item tag', async () => {

  const concerns = [];
  const filter = new DicomValidationFilter(null, {
    goal: ValidationGoals.PERMISSIVE,
    onConcern: (concern) => concerns.push(concern)
  });

  const context = await filter.onStartInstance(null);
  await filter.onStartDataSet(context);

  await filter.onStartAttribute(context, fakeAttribute(Tag.Item));
  await filter.onStartAttribute(context, fakeAttribute(Tag.Item));

  const duplicateItemConcerns = concerns.filter((c) =>
  c.code === ValidationConcernCodes.DuplicateAttribute &&
  c.tagID === Tag.Item.ID);


  expect(duplicateItemConcerns.length).toBe(0);

});

test('Test: DicomValidationFilter does not report DuplicateAttribute for sequence-item StudyInstanceUID after nested sequence ends', async () => {

  const concerns = [];
  const filter = new DicomValidationFilter(null, {
    goal: ValidationGoals.PERMISSIVE,
    onConcern: (concern) => concerns.push(concern)
  });

  const context = await filter.onStartInstance(null);
  await filter.onStartDataSet(context);

  // Top-level StudyInstanceUID in the data set.
  await filter.onStartAttribute(context, fakeAttribute(Tag.StudyInstanceUID));
  await filter.onEndAttribute(context, fakeAttribute(Tag.StudyInstanceUID));

  // RequestAttributesSequence (0040,0275) with one item and a nested sequence.
  const requestAttributesSequence = fakeAttribute(Tag.RequestAttributesSequence, { valueLength: 0xFFFFFFFF });
  const referencedStudySequence = fakeAttribute(Tag.ReferencedStudySequence, { valueLength: 0xFFFFFFFF });

  await filter.onStartSequence(context, requestAttributesSequence);
  await filter.onStartItem(context);
  await filter.onStartSequence(context, referencedStudySequence);
  await filter.onStartItem(context);
  await filter.onEndItem(context);
  await filter.onEndSequence(context, referencedStudySequence);

  // This StudyInstanceUID is valid inside the RequestAttributesSequence item and must not be treated
  // as a duplicate of the top-level StudyInstanceUID.
  const status = await filter.onStartAttribute(context, fakeAttribute(Tag.StudyInstanceUID));
  expect(status === null || status === Status.CONTINUE).toBe(true);

  const duplicateStudyUIDConcerns = concerns.filter((c) =>
  c.code === ValidationConcernCodes.DuplicateAttribute &&
  c.tagID === Tag.StudyInstanceUID.ID);


  expect(duplicateStudyUIDConcerns.length).toBe(0);

});

test('Test: DicomValidationFilter strict mode fails missing required file-meta attributes', async () => {

  const concerns = [];
  const filter = new DicomValidationFilter(null, {
    goal: ValidationGoals.STRICT,
    onConcern: (concern) => concerns.push(concern)
  });

  const context = await filter.onStartInstance(null);
  await filter.onStartMetaSet(context);

  const status = await filter.onEndMetaSet(context);

  expect(status).toBe(Status.FAIL);
  expect(concerns.length).toBe(1);
  expect(concerns[0].code).toBe(ValidationConcernCodes.MissingRequiredMetaAttribute);

});

test('Test: DicomValidationFilter reports parser errors and forwards onError in permissive mode', async () => {

  const forwarded = [];
  const concerns = [];

  const nextHandler = {
    onError: (context, error) => {
      forwarded.push(error.message);
      return Status.CONTINUE;
    }
  };

  const filter = new DicomValidationFilter(nextHandler, {
    mode: 'permissive',
    onConcern: (concern) => concerns.push(concern)
  });

  const context = await filter.onStartInstance(null);
  const status = await filter.onError(context, new Error('unit-test parser error'));

  expect(status).toBe(Status.CONTINUE);
  expect(forwarded).toEqual(['unit-test parser error']);
  expect(concerns.length).toBe(1);
  expect(concerns[0].code).toBe(ValidationConcernCodes.ParserError);
  expect(concerns[0].message).toBe('unit-test parser error');

});

test('Test: DicomValidationFilter passes through valid DICOM parse and accumulates no concerns for a synthetic DICOM object', async () => {

  const concerns = [];
  const filter = new DicomValidationFilter(
  new DicomInstanceHandler(),
  { goal: ValidationGoals.PERMISSIVE, onConcern: (concern) => concerns.push(concern) });


  const result = await parseInstanceWithHandler(filter, getFixtureBytes());

  expect(result).toBeDefined();
  expect(result.dataSet.find(Tag.PatientName)).toBeDefined();
  expect(filter.concerns.length).toBe(0);
  expect(concerns.length).toBe(0);

});
