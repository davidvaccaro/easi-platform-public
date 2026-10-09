import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import Tag from '../../src/dicom/Tag.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import { Status } from '../../src/parsers/Status.js';

const UNDEFINED_LENGTH = 0xFFFFFFFF;
const LONG_VRS = new Set(['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'SQ', 'SV', 'UC', 'UR', 'UT', 'UV', 'UN']);

function uint(value, length, littleEndian = true) {
  const bytes = Buffer.alloc(length);
  if (length == 2) {
    littleEndian ? bytes.writeUInt16LE(value) : bytes.writeUInt16BE(value);
  }
  else {
    littleEndian ? bytes.writeUInt32LE(value >>> 0) : bytes.writeUInt32BE(value >>> 0);
  }
  return bytes;
}

function tag(id, littleEndian = true) {
  return Buffer.concat([
    uint(parseInt(id.substring(0, 4), 16), 2, littleEndian),
    uint(parseInt(id.substring(4, 8), 16), 2, littleEndian)
  ]);
}

function element(id, vr, value = Buffer.alloc(0), options = {}) {
  const littleEndian = (options.littleEndian != false);
  const length = options.length ?? value.length;
  const fields = [tag(id, littleEndian)];
  if (options.implicit != true) {
    fields.push(Buffer.from(vr));
    if (LONG_VRS.has(vr))
      fields.push(Buffer.alloc(2));
  }
  fields.push(uint(length, ((options.implicit == true) || LONG_VRS.has(vr)) ? 4 : 2, littleEndian));
  fields.push(value);
  return Buffer.concat(fields);
}

function control(id, value = Buffer.alloc(0), length = value.length, littleEndian = true) {
  return Buffer.concat([tag(id, littleEndian), uint(length, 4, littleEndian), value]);
}

function item(value = Buffer.alloc(0), length = value.length) {
  return control('FFFEE000', value, length);
}

function itemEnd(length = 0) {
  return control('FFFEE00D', Buffer.alloc(0), length);
}

function sequenceEnd(length = 0) {
  return control('FFFEE0DD', Buffer.alloc(0), length);
}

function sequence(value = Buffer.alloc(0), length = value.length, id = '00400275') {
  return element(id, 'SQ', value, { length });
}

function part10(dataset, syntax = '1.2.840.10008.1.2.1') {
  const uidBytes = Buffer.from(syntax + ((syntax.length % 2) ? '\0' : ''));
  const syntaxElement = element('00020010', 'UI', uidBytes);
  return Buffer.concat([
    Buffer.alloc(128), Buffer.from('DICM'),
    element('00020000', 'UL', uint(syntaxElement.length, 4)), syntaxElement, dataset
  ]);
}

class CaptureHandler extends DicomInstanceHandler {
  constructor() {
    super();
    this.events = [];
    this.errors = [];
    this.pixelChunks = [];
  }

  onEndAttribute(context, attribute) {
    this.events.push('attribute:' + attribute.tag.ID);
  }

  onEndItem(context) {
    this.events.push('item');
  }

  onEndSequence(context, attribute) {
    this.events.push('sequence:' + attribute.tag.ID);
    return super.onEndSequence(context, attribute);
  }

  onEndDataSet(context) {
    this.events.push('dataset');
    return super.onEndDataSet(context);
  }

  onEndInstance(context) {
    this.events.push('instance');
    return super.onEndInstance(context);
  }

  onError(context, error) {
    this.errors.push(error);
  }

  onAttributeChunk(context, payload) {
    if (payload.attribute.tag == Tag.PixelData)
      this.pixelChunks.push({ bytes: Buffer.from(payload.chunk), final: payload.isFinalChunk });
  }
}

async function parseChunks(bytes, sizes = [bytes.length], options = {}) {
  const parser = new DicomDataParser(options);
  const handler = options.handler ?? new CaptureHandler();
  parser.handler = handler;
  parser.bulkDataPolicy = options.policy ?? 'materialize';
  let offset = 0;
  let status = Status.CONTINUE;
  for (const size of sizes) {
    offset += size;
    const done = (options.finishWithLastChunk == true) && (offset == bytes.length);
    status = await parser.parse(bytes.subarray(offset - size, offset), done, offset, bytes.length);
    if (status != Status.CONTINUE)
      break;
  }
  if (status == Status.CONTINUE)
    status = await parser.parse(null, true, offset, bytes.length);
  return { status, parser, handler, instance: parser.result };
}

async function expectAllSplits(bytes, verify, options = {}) {
  for (let split = 0; split <= bytes.length; split++) {
    const parsed = await parseChunks(bytes, [split, bytes.length - split], options);
    expect(parsed.status).toBe(Status.SUCCESS);
    expect(parsed.handler.errors).toEqual([]);
    verify(parsed);
  }
  const fragmented = await parseChunks(bytes, Array(bytes.length).fill(1), options);
  expect(fragmented.status).toBe(Status.SUCCESS);
  expect(fragmented.handler.errors).toEqual([]);
  verify(fragmented);
}

async function expectIncomplete(bytes, options = {}) {
  for (const sizes of [[bytes.length], Array(bytes.length).fill(1)]) {
    const parsed = await parseChunks(bytes, sizes, options);
    expect(parsed.status).toBe(Status.FAIL);
    expect(parsed.parser.error).toBeDefined();
    expect(parsed.handler.errors.length).toBeGreaterThan(0);
    expect(parsed.handler.events).not.toContain('dataset');
    expect(parsed.handler.events).not.toContain('instance');
    expect(parsed.instance).toBeUndefined();
  }
}

test.each([
  ['explicit little endian', {}],
  ['implicit little endian', { implicit: true }],
  ['explicit big endian', { littleEndian: false }]
])('short raw %s datasets parse at EOF', async (name, options) => {
  const bytes = element('00100010', 'PN', Buffer.from('AB'), options);
  expect(bytes.length).toBeLessThan(132);
  await expectAllSplits(bytes, ({ instance, handler }) => {
    expect(instance.dataSet.find(Tag.PatientName).value).toBe('AB');
    expect(handler.events).toEqual(['attribute:00100010', 'dataset', 'instance']);
  });
});

test.each([
  ['OV', '00720081'], ['SV', '00720082'], ['UV', '00720083']
])('explicit %s uses the reserved field and 32-bit length, including raw syntax detection', async (vr, id) => {
  const value = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  for (const littleEndian of [true, false]) {
    const bytes = element(id, vr, value, { littleEndian });
    await expectAllSplits(bytes, ({ instance }) => {
      const attribute = instance.dataSet.find(Tag.find(id));
      expect(attribute.vr.ID).toBe(vr);
      expect(attribute.valueLength).toBe(8);
      expect(Buffer.from(attribute.access())).toEqual(value);
      expect(attribute.transferSyntax).toBe(littleEndian
        ? TransferSyntax.ExplicitVRLittleEndian : TransferSyntax.ExplicitVRBigEndian);
    });
  }

  const parser = new DicomDataParser();
  parser.reset();
  const invalidReserved = element(id, vr, value);
  invalidReserved[6] = 4;
  parser.data.append(invalidReserved);
  expect(parser.detectDataSetTransferSyntax()).toBe(TransferSyntax.ImplicitVRLittleEndian);
});

test('truncated attribute values never emit attribute or instance completion', async () => {
  const value = element('00100010', 'PN', Buffer.from('ABCD'));
  for (let cut = 1; cut <= 4; cut++) {
    const truncated = value.subarray(0, value.length - cut);
    await expectIncomplete(truncated);
    const parsed = await parseChunks(part10(truncated));
    expect(parsed.status).toBe(Status.FAIL);
    expect(parsed.handler.events).not.toContain('attribute:00100010');
  }
});

test('partial explicit/implicit headers and trailing header bytes fail at EOF', async () => {
  for (const bytes of [
    element('00100010', 'PN', Buffer.from('AB')),
    element('7FE00010', 'OB', Buffer.from([1, 2])),
    element('00100010', 'PN', Buffer.from('AB'), { implicit: true })
  ]) {
    const headerLength = bytes.length - 2;
    for (let length = 1; length < headerLength; length++) {
      await expectIncomplete(bytes.subarray(0, length));
      await expectIncomplete(part10(bytes.subarray(0, length)));
    }
  }
  await expectIncomplete(Buffer.concat([element('00100010', 'PN', Buffer.from('AB')), Buffer.from([0x20, 0, 0])]));
  await expectIncomplete(Buffer.alloc(0));
});

test.each([true, false])('file meta values remain parseable across every split (include header=%s)', async (includePart10Header) => {
  const bytes = part10(element('00100010', 'PN', Buffer.from('AB'), { implicit: true }), '1.2.840.10008.1.2');
  await expectAllSplits(bytes, ({ instance }) => {
    expect(instance.dataSet.find(Tag.PatientName).value).toBe('AB');
    if (includePart10Header)
      expect(instance.metaSet.transferSyntaxUID.ID).toBe('1.2.840.10008.1.2');
  }, { includePart10Header });
});

test.each([true, false])('truncated Part-10 meta header/value and absent dataset fail (include header=%s)', async (includePart10Header) => {
  const bytes = part10(element('00100010', 'PN', Buffer.from('AB')));
  for (let length = 132; length < bytes.length - 10; length++)
    await expectIncomplete(bytes.subarray(0, length), { includePart10Header });
});

test.each([
  ['defined empty sequence', sequence(), 0],
  ['undefined empty sequence', sequence(sequenceEnd(), UNDEFINED_LENGTH), 0],
  ['defined empty item', sequence(item()), 1],
  ['undefined empty item', sequence(Buffer.concat([item(Buffer.alloc(0), UNDEFINED_LENGTH), itemEnd(), sequenceEnd()]), UNDEFINED_LENGTH), 1],
  ['multiple empty items', sequence(Buffer.concat([item(), item(), sequenceEnd()]), UNDEFINED_LENGTH), 2],
  ['defined item and sequence', sequence(item(element('00100010', 'PN', Buffer.from('AB')))), 1],
  ['undefined item and sequence', sequence(Buffer.concat([item(element('00100010', 'PN', Buffer.from('AB')), UNDEFINED_LENGTH), itemEnd(), sequenceEnd()]), UNDEFINED_LENGTH), 1]
])('%s retains balanced lifecycle events across every split', async (name, value, count) => {
  await expectAllSplits(part10(value), ({ instance, handler }) => {
    const parsedSequence = instance.dataSet.find(Tag.RequestAttributesSequence);
    expect(parsedSequence.items.length).toBe(count);
    expect(handler.events.filter(event => event == 'item').length).toBe(count);
    expect(handler.events.filter(event => event == 'sequence:00400275').length).toBe(1);
    expect(handler.events.slice(-2)).toEqual(['dataset', 'instance']);
  });
});

test('nested defined and undefined sequences close before the next top-level attribute', async () => {
  const nested = sequence(Buffer.concat([item(), sequenceEnd()]), UNDEFINED_LENGTH, '00081110');
  const outer = sequence(item(Buffer.concat([nested, element('00100010', 'PN', Buffer.from('AB'))])));
  const bytes = part10(Buffer.concat([outer, element('0020000D', 'UI', Buffer.from('1.2\0'))]));
  await expectAllSplits(bytes, ({ instance }) => {
    const parsedSequence = instance.dataSet.find(Tag.RequestAttributesSequence);
    expect(parsedSequence.items[0].find(Tag.ReferencedStudySequence).items.length).toBe(1);
    expect(parsedSequence.items[0].find(Tag.PatientName).value).toBe('AB');
    expect(instance.dataSet.find(Tag.StudyInstanceUID).value).toBe('1.2');
  });
});

test('EOF cannot close open defined/undefined sequences or items', async () => {
  const attribute = element('00100010', 'PN', Buffer.from('AB'));
  const openValues = [
    sequence(Buffer.alloc(0), UNDEFINED_LENGTH),
    sequence(Buffer.alloc(0), 8),
    sequence(item(Buffer.alloc(0), UNDEFINED_LENGTH), UNDEFINED_LENGTH),
    sequence(item(Buffer.alloc(0), 10), UNDEFINED_LENGTH),
    sequence(item(attribute), UNDEFINED_LENGTH),
    sequence(item(attribute, UNDEFINED_LENGTH), UNDEFINED_LENGTH),
    sequence(item(attribute), item(attribute).length + 8)
  ];
  for (const value of openValues)
    await expectIncomplete(part10(value));

  const valid = sequence(Buffer.concat([item(attribute, UNDEFINED_LENGTH), itemEnd(), sequenceEnd()]), UNDEFINED_LENGTH);
  for (let cut = 1; cut <= 15; cut++)
    await expectIncomplete(part10(valid.subarray(0, valid.length - cut)));
});

test('defined sequence/item bounds and delimiter lengths are enforced', async () => {
  const attribute = element('00100010', 'PN', Buffer.from('AB'));
  for (const value of [
    sequence(item(attribute, 2)),
    sequence(item(attribute), 2),
    sequence(Buffer.concat([item(Buffer.alloc(0), UNDEFINED_LENGTH), itemEnd(2), sequenceEnd()]), UNDEFINED_LENGTH),
    sequence(sequenceEnd(2), UNDEFINED_LENGTH),
    item(), itemEnd(), sequenceEnd()
  ]) {
    await expectIncomplete(part10(value));
  }
});

function encapsulatedPayload() {
  // These delimiter bytes are legal opaque fragment data, not structural markers.
  const firstFragment = Buffer.concat([Buffer.from([1, 2]), sequenceEnd(), itemEnd(), Buffer.from([3, 4])]);
  const secondFragment = Buffer.from([5, 6]);
  const rawItems = Buffer.concat([item(uint(0, 4)), item(firstFragment), item(secondFragment)]);
  const pixel = element('7FE00010', 'OB', Buffer.concat([rawItems, sequenceEnd()]), { length: UNDEFINED_LENGTH });
  return { rawItems, pixel };
}

test.each(['materialize', 'auto', 'stream'])('encapsulated PixelData is invariant across every split and marker bytes inside fragments (%s)', async (policy) => {
  const { rawItems, pixel } = encapsulatedPayload();
  const bytes = part10(Buffer.concat([pixel, element('00100010', 'PN', Buffer.from('AB'))]), '1.2.840.10008.1.2.4.50');
  await expectAllSplits(bytes, ({ instance, handler }) => {
    const attribute = instance.dataSet.find(Tag.PixelData);
    expect(attribute.isComplete).toBe(true);
    expect(handler.events.filter(event => event == 'attribute:7FE00010').length).toBe(1);
    const patientName = instance.dataSet.find(Tag.PatientName);
    expect(patientName.isComplete).toBe(true);
    if (policy != 'stream')
      expect(patientName.value).toBe('AB');
    else
      expect(patientName.bytesStreamed).toBe(2);
    if (policy == 'materialize') {
      expect(Buffer.from(attribute.access())).toEqual(rawItems);
    }
    else {
      expect(attribute.access().length).toBe(0);
      expect(attribute.bytesStreamed).toBe(rawItems.length);
      expect(Buffer.concat(handler.pixelChunks.map(chunk => chunk.bytes))).toEqual(rawItems);
      expect(handler.pixelChunks.filter(chunk => chunk.final).length).toBe(1);
    }
  }, { policy });
});

test('fragmented encapsulated values fail for truncated fragment headers, payloads, and sequence delimiters', async () => {
  const { pixel } = encapsulatedPayload();
  for (let length = 12; length < pixel.length; length++)
    await expectIncomplete(part10(pixel.subarray(0, length), '1.2.840.10008.1.2.4.50'));
});

test('encapsulated values reject invalid fragment lengths, invalid basic offset tables and delimiters', async () => {
  for (const value of [
    sequenceEnd(),
    Buffer.concat([item(), sequenceEnd()]),
    Buffer.concat([item(Buffer.alloc(2)), item(Buffer.from([1, 2])), sequenceEnd()]),
    Buffer.concat([item(), item(Buffer.alloc(0), UNDEFINED_LENGTH), sequenceEnd()]),
    Buffer.concat([item(), item(Buffer.from([1])), sequenceEnd()]),
    Buffer.concat([item(), item(Buffer.from([1, 2])), sequenceEnd(2)]),
    Buffer.concat([item(), itemEnd(), sequenceEnd()])
  ]) {
    await expectIncomplete(part10(element('7FE00010', 'OB', value, { length: UNDEFINED_LENGTH })));
  }
});


test.each([Status.STOP, Status.JUMP, Status.FAIL])('terminal lifecycle control propagates from container/attribute events (%s)', async (terminal) => {
  const value = sequence(item(element('00100010', 'PN', Buffer.from('AB'))));
  const trailing = element('0020000D', 'UI', Buffer.from('1.2\0'));
  for (const event of ['onStartItem', 'onEndItem', 'onEndAttribute', 'onEndSequence']) {
    const handler = new CaptureHandler();
    const original = handler[event].bind(handler);
    let triggered = false;
    handler[event] = (context, attribute) => {
      const result = original(context, attribute);
      if ((event != 'onEndAttribute') || (attribute.tag == Tag.PatientName)) {
        triggered = true;
        return terminal;
      }
      return result;
    };
    const parsed = await parseChunks(part10(Buffer.concat([value, trailing])), undefined, { handler });
    expect(triggered).toBe(true);
    expect(parsed.status).toBe(terminal);
    expect(handler.events).not.toContain('attribute:0020000D');
    expect(handler.events).not.toContain('dataset');
    if (terminal == Status.FAIL)
      expect(handler.events).not.toContain('instance');
    else
      expect(handler.events).toContain('instance');
  }
});

test('STOP from append and dataset completion is preserved', async () => {
  const bytes = part10(element('00100010', 'PN', Buffer.alloc(160, 65)));
  for (const event of ['onAppendAttribute', 'onEndDataSet']) {
    const handler = new CaptureHandler();
    const original = handler[event].bind(handler);
    handler[event] = (context, attribute) => {
      original(context, attribute);
      return Status.STOP;
    };
    const parsed = await parseChunks(bytes, [bytes.length - 80, 80], { handler });
    expect(parsed.status).toBe(Status.STOP);
    expect(handler.events).toContain('instance');
  }
});

test('SKIP stays scoped to its sequence or item and the next attributes still parse', async () => {
  const first = element('00100010', 'PN', Buffer.from('AB'));
  const second = element('00100020', 'LO', Buffer.from('ID'));
  const trailing = element('0020000D', 'UI', Buffer.from('1.2\0'));
  const bytes = part10(Buffer.concat([sequence(Buffer.concat([item(first), item(second)])), trailing]));
  for (const event of ['onStartSequence', 'onStartItem']) {
    const handler = new CaptureHandler();
    const original = handler[event].bind(handler);
    let count = 0;
    handler[event] = (context, attribute) => {
      if (count++ == 0)
        return Status.SKIP;
      return original(context, attribute);
    };
    const parsed = await parseChunks(bytes, Array(bytes.length).fill(1), { handler });
    expect(parsed.status).toBe(Status.SUCCESS);
    expect(parsed.instance.dataSet.find(Tag.StudyInstanceUID).value).toBe('1.2');
    expect(handler.events).not.toContain('attribute:00100010');
    if (event == 'onStartSequence') {
      expect(parsed.instance.dataSet.find(Tag.RequestAttributesSequence)).toBeUndefined();
      expect(handler.events).not.toContain('attribute:00100020');
    }
    else {
      const parsedSequence = parsed.instance.dataSet.find(Tag.RequestAttributesSequence);
      expect(parsedSequence.items.length).toBe(1);
      expect(parsedSequence.items[0].find(Tag.PatientID).value).toBe('ID');
    }
  }
});


test('EOF supplied with the final data chunk validates before emitting completion', async () => {
  const { pixel } = encapsulatedPayload();
  for (const bytes of [
    element('00100010', 'PN', Buffer.from('AB')),
    part10(sequence(item(element('00100010', 'PN', Buffer.from('AB'))))),
    part10(pixel)
  ]) {
    await expectAllSplits(bytes, ({ handler }) => {
      expect(handler.events.filter(event => event == 'instance').length).toBe(1);
    }, { finishWithLastChunk: true });
  }

  const malformed = part10(sequence(item(element('00100010', 'PN', Buffer.from('AB'))), UNDEFINED_LENGTH));
  const parsed = await parseChunks(malformed, undefined, { finishWithLastChunk: true });
  expect(parsed.status).toBe(Status.FAIL);
  expect(parsed.handler.events).not.toContain('instance');
});


test('unsupported undefined-length UN nested datasets fail explicitly without fabricated completion', async () => {
  const nestedData = element('7FE00010', 'OW', sequenceEnd(), { implicit: true });
  for (const value of [
    Buffer.concat([item(nestedData), sequenceEnd()]),
    Buffer.concat([item(nestedData, UNDEFINED_LENGTH), itemEnd(), sequenceEnd()])
  ]) {
    const bytes = part10(element('0072006D', 'UN', value, { length: UNDEFINED_LENGTH }));
    await expectIncomplete(bytes);
    const parsed = await parseChunks(bytes);
    expect(parsed.parser.error.message).toContain('Unsupported undefined-length UN');
    expect(parsed.handler.events).not.toContain('attribute:0072006D');
  }
});


test.each([9, 10, 11])('materialized values and source bytes survive compaction at a %i-byte partial long header', async (partialHeaderLength) => {
  const prefix = Buffer.concat([
    element('00100010', 'PN', Buffer.from('AB')),
    element('00081030', 'LO', Buffer.alloc(180, 65))
  ]);
  const original = Buffer.concat([prefix, element('7FE00010', 'OB', Buffer.from([1, 2]))]);
  const source = Buffer.from(original);
  const firstChunkLength = prefix.length + partialHeaderLength;
  const parser = new DicomDataParser();
  parser.bulkDataPolicy = 'materialize';
  parser.handler = new CaptureHandler();

  expect(await parser.parse(source.subarray(0, firstChunkLength))).toBe(Status.CONTINUE);
  const patientName = parser.context.instance.dataSet.find(Tag.PatientName);
  const consumedView = patientName.access();
  expect(patientName.value).toBe('AB');

  expect(await parser.parse(source.subarray(firstChunkLength, firstChunkLength + 1))).toBe(Status.CONTINUE);
  expect(patientName.value).toBe('AB');
  expect(Buffer.from(consumedView)).toEqual(Buffer.from('AB'));
  expect(source).toEqual(original);

  expect(await parser.parse(source.subarray(firstChunkLength + 1), true)).toBe(Status.SUCCESS);
  expect(parser.result.dataSet.find(Tag.PatientName).value).toBe('AB');
  expect(Buffer.from(parser.result.dataSet.find(Tag.PixelData).access())).toEqual(Buffer.from([1, 2]));
  expect(source).toEqual(original);

  const whole = await parseChunks(Buffer.from(original));
  expect(whole.status).toBe(Status.SUCCESS);
  expect(parser.result.dataSet.find(Tag.PatientName).value).toBe(whole.instance.dataSet.find(Tag.PatientName).value);
});
