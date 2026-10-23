import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';
import Tag from '../../src/dicom/Tag.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import AttributeSequence from '../../src/dicom/AttributeSequence.js';
import DicomDataWriterHandler from '../../src/handlers/terminals/DicomDataWriterHandler.js';
import { deflateRawSync } from 'node:zlib';
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
  const parser = options.parser ?? new DicomDataParser(options);
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


test('undefined-length UN parses nested implicit datasets without scanning delimiter-like opaque values', async () => {
  const nestedData = element('7FE00010', 'OW', sequenceEnd(), { implicit: true });
  for (const value of [
    Buffer.concat([item(nestedData), sequenceEnd()]),
    Buffer.concat([item(nestedData, UNDEFINED_LENGTH), itemEnd(), sequenceEnd()])
  ]) {
    const bytes = part10(element('0072006D', 'UN', value, { length: UNDEFINED_LENGTH }));
    await expectAllSplits(bytes, ({ instance, handler }) => {
      const unknown = instance.dataSet.find(Tag.find('0072006D'));
      expect(unknown).toBeInstanceOf(AttributeSequence);
      expect(unknown.vr.ID).toBe('UN');
      expect(unknown.items.length).toBe(1);
      expect(Buffer.from(unknown.items[0].find(Tag.PixelData).access())).toEqual(sequenceEnd());
      expect(handler.events).not.toContain('attribute:0072006D');
      expect(handler.events.filter(event => event === 'sequence:0072006D')).toHaveLength(1);
    });
  }
});

function unknownSequence(value, options = {}) {
  return element(options.id ?? '77771001', 'UN', value, { length: UNDEFINED_LENGTH, ...options });
}

function unknownValue(body, undefinedItem = false) {
  return Buffer.concat([item(body, undefinedItem ? UNDEFINED_LENGTH : body.length),
    ...(undefinedItem ? [itemEnd()] : []), sequenceEnd()]);
}

test.each([true, false])('UN item scopes use implicit little-endian and restore the enclosing endian (%s)', async littleEndian => {
  const syntax = littleEndian ? TransferSyntax.ExplicitVRLittleEndian : TransferSyntax.ExplicitVRBigEndian;
  const nested = Buffer.concat([
    element('00100010', 'PN', Buffer.from('AB'), { implicit: true }),
    element('00280010', 'US', uint(0x1234, 2), { implicit: true }),
    element('7FE00010', 'OW', sequenceEnd(), { implicit: true })
  ]);
  const pixels = Buffer.concat([uint(258, 2, littleEndian), uint(772, 2, littleEndian)]);
  for (const undefinedItem of [true, false]) {
    const bytes = part10(Buffer.concat([
      unknownSequence(unknownValue(nested, undefinedItem), { littleEndian }),
      element('00280010', 'US', uint(0x4321, 2, littleEndian), { littleEndian }),
      element('7FE00010', 'OW', pixels, { littleEndian })
    ]), syntax.ID);
    const before = Buffer.from(bytes);
    await expectAllSplits(bytes, ({ instance }) => {
      const unknown = instance.dataSet.find(Tag.find('77771001'));
      expect(unknown.vr.ID).toBe('UN');
      expect(unknown.transferSyntax).toBe(syntax);
      expect(unknown.isComplete).toBe(true);
      expect(unknown.isBulkStreamed).toBe(false);
      expect(unknown.items[0].find(Tag.Rows).transferSyntax).toBe(TransferSyntax.ImplicitVRLittleEndian);
      expect(unknown.items[0].find(Tag.Rows).value).toBe(0x1234);
      expect(Buffer.from(unknown.items[0].find(Tag.PixelData).access())).toEqual(sequenceEnd());
      expect(instance.dataSet.find(Tag.Rows).value).toBe(0x4321);
      expect(instance.dataSet.find(Tag.PixelData).transferSyntax).toBe(syntax);
      expect(Buffer.from(instance.dataSet.find(Tag.PixelData).access())).toEqual(pixels);
    });
    expect(bytes).toEqual(before);
  }
});

test('nested implicit private UN and ordinary SQ restore each enclosing scope and parent length', async () => {
  const innermost = element('00280010', 'US', uint(0x3456, 2), { implicit: true });
  const privateUnknown = unknownSequence(unknownValue(innermost, true), { id: '77771002', implicit: true });
  const implicitSequence = element('00400275', 'SQ', item(privateUnknown), { implicit: true });
  const outerUnknown = unknownSequence(unknownValue(implicitSequence), { littleEndian: false });
  const trailing = element('00280011', 'US', uint(0x4567, 2, false), { littleEndian: false });
  const outerItemBody = Buffer.concat([outerUnknown, trailing]);
  const outerSequence = element('00081115', 'SQ', control('FFFEE000', outerItemBody, outerItemBody.length, false), { littleEndian: false });
  const bytes = part10(Buffer.concat([outerSequence, trailing]), TransferSyntax.ExplicitVRBigEndian.ID);
  await expectAllSplits(bytes, ({ instance, handler }) => {
    const item = instance.dataSet.find(Tag.find('00081115')).items[0];
    const unknown = item.find(Tag.find('77771001'));
    const inner = unknown.items[0].find(Tag.RequestAttributesSequence).items[0].find(Tag.find('77771002'));
    expect(inner).toBeInstanceOf(AttributeSequence);
    expect(inner.vr.ID).toBe('UN');
    expect(inner.transferSyntax).toBe(TransferSyntax.ImplicitVRLittleEndian);
    expect(inner.items[0].find(Tag.Rows).value).toBe(0x3456);
    expect(item.find(Tag.Columns).value).toBe(0x4567);
    expect(instance.dataSet.find(Tag.Columns).value).toBe(0x4567);
    expect(handler.events.filter(event => event === 'item')).toHaveLength(4);
  });
});

test('empty UN scopes and unknown implicit sequences complete without changing a following attribute', async () => {
  for (const syntax of [TransferSyntax.ExplicitVRLittleEndian, TransferSyntax.ExplicitVRBigEndian, TransferSyntax.ImplicitVRLittleEndian]) {
    const options = { littleEndian: syntax.IsLittleEndian, implicit: !syntax.IsExplicit };
    const bytes = part10(Buffer.concat([unknownSequence(sequenceEnd(), options),
      element('00280010', 'US', uint(513, 2, syntax.IsLittleEndian), options)]), syntax.ID);
    await expectAllSplits(bytes, ({ instance }) => {
      const unknown = instance.dataSet.find(Tag.find('77771001'));
      expect(unknown.vr.ID).toBe('UN');
      expect(unknown.items).toEqual([]);
      expect(unknown.isComplete).toBe(true);
      expect(instance.dataSet.find(Tag.Rows).value).toBe(513);
    });
  }
});

test('defined-length UN remains opaque even when its bytes look like sequence items', async () => {
  const value = unknownValue(element('00280010', 'US', uint(513, 2), { implicit: true }));
  const bytes = part10(element('77771001', 'UN', value));
  await expectAllSplits(bytes, ({ instance }) => {
    const unknown = instance.dataSet.find(Tag.find('77771001'));
    expect(unknown).not.toBeInstanceOf(AttributeSequence);
    expect(unknown.items).toBeUndefined();
    expect(Buffer.from(unknown.access())).toEqual(value);
  });
});

test('UN sequences honor bulk streaming for nested values while retaining their structure', async () => {
  const nested = element('7FE00010', 'OW', sequenceEnd(), { implicit: true });
  const bytes = part10(Buffer.concat([unknownSequence(unknownValue(nested)),
    element('7FE00010', 'OW', Buffer.from([1, 2, 3, 4]))]));
  await expectAllSplits(bytes, ({ instance, handler }) => {
    const unknown = instance.dataSet.find(Tag.find('77771001'));
    expect(unknown.isBulkStreamed).toBe(false);
    expect(unknown.items).toHaveLength(1);
    expect(unknown.items[0].find(Tag.PixelData).isBulkStreamed).toBe(true);
    expect(unknown.items[0].find(Tag.PixelData).access().length).toBe(0);
    expect(Buffer.concat(handler.pixelChunks.map(chunk => chunk.bytes))).toEqual(sequenceEnd());
    expect(Buffer.from(instance.dataSet.find(Tag.PixelData).access())).toEqual(Buffer.from([1, 2, 3, 4]));
  }, { policy: { mode: 'auto', knownLengthThreshold: 8, hardSafetyCap: 16 } });
});

test('malformed UN containers reject before instance completion, including skipped containers', async () => {
  const attribute = element('00280010', 'US', uint(513, 2), { implicit: true });
  const value = unknownValue(attribute, true);
  for (const body of [
    value.subarray(0, -1), value.subarray(0, -8),
    Buffer.concat([item(attribute, UNDEFINED_LENGTH), sequenceEnd()]),
    Buffer.concat([item(attribute, UNDEFINED_LENGTH), itemEnd(2), sequenceEnd()]),
    Buffer.concat([item(attribute), sequenceEnd(2)]),
    Buffer.concat([item(attribute, attribute.length - 2), sequenceEnd()]),
    Buffer.concat([item(attribute, attribute.length + 2), sequenceEnd()]),
    unknownValue(element('00100010', 'PN', Buffer.from('A'), { implicit: true })),
    unknownValue(element('00400275', 'SQ', Buffer.alloc(0), { implicit: true, length: 1 })),
    unknownValue(element('00100010', 'PN', Buffer.from('AB'))),
    control('FFFEE000', attribute, attribute.length, false),
    Buffer.concat([attribute, sequenceEnd()])
  ]) {
    const bytes = part10(unknownSequence(body));
    await expectIncomplete(bytes);
    const handler = new CaptureHandler();
    handler.onStartSequence = () => Status.SKIP;
    await expectIncomplete(bytes, { handler });
  }
  const opaque = element('7FE00010', 'OW', sequenceEnd(), { implicit: true });
  await expectIncomplete(part10(unknownSequence(item(opaque))));
  const tooShort = element('00400275', 'SQ', item(unknownSequence(value)), { length: 10 });
  await expectIncomplete(part10(tooShort));
});

test('EOF in the final UN value chunk completes only structurally closed scopes', async () => {
  for (const value of [sequenceEnd(), unknownValue(element('00280010', 'US', uint(513, 2), { implicit: true }), true)]) {
    const bytes = part10(unknownSequence(value, { littleEndian: false }), TransferSyntax.ExplicitVRBigEndian.ID);
    await expectAllSplits(bytes, ({ instance, handler }) => {
      expect(instance.dataSet.find(Tag.find('77771001')).isComplete).toBe(true);
      expect(handler.events.filter(event => event === 'instance')).toHaveLength(1);
    }, { finishWithLastChunk: true });
  }
});

test('undefined-length UN in File Meta remains invalid and cannot enter dataset parsing', async () => {
  const bytes = Buffer.concat([Buffer.alloc(128), Buffer.from('DICM'),
    element('00020012', 'UN', sequenceEnd(), { length: UNDEFINED_LENGTH }),
    element('00280010', 'US', uint(513, 2))]);
  await expectIncomplete(bytes, { includePart10Header: true });
});

test.each([Status.STOP, Status.JUMP, Status.FAIL])('UN terminal lifecycle status remains scoped and reusable (%s)', async terminal => {
  const nested = element('00100010', 'PN', Buffer.from('AB'), { implicit: true });
  const bytes = part10(Buffer.concat([unknownSequence(unknownValue(nested, true), { littleEndian: false }),
    element('00280010', 'US', uint(513, 2, false), { littleEndian: false })]), TransferSyntax.ExplicitVRBigEndian.ID);
  for (const event of ['onStartSequence', 'onStartItem', 'onEndAttribute', 'onEndItem', 'onEndSequence']) {
    const handler = new CaptureHandler(), parser = new DicomDataParser();
    const original = handler[event].bind(handler);
    handler[event] = (context, attribute) => { original(context, attribute); return terminal; };
    const parsed = await parseChunks(bytes, undefined, { handler, parser });
    expect(parsed.status).toBe(terminal);
    expect(handler.events).not.toContain('attribute:00280010');
    expect(handler.events).not.toContain('dataset');
    if (terminal === Status.FAIL) expect(handler.events).not.toContain('instance');
    else expect(handler.events).toContain('instance');
    parser.reset();
    const next = await parseChunks(part10(element('00280010', 'US', uint(1025, 2))), undefined, { parser });
    expect(next.status).toBe(Status.SUCCESS);
    const nextInstance = Array.isArray(next.instance) ? next.instance[next.instance.length - 1] : next.instance;
    expect(nextInstance.dataSet.find(Tag.Rows).value).toBe(1025);
  }
});

test('UN SKIP is confined to its sequence or item and does not leak implicit syntax', async () => {
  const nested = element('00100010', 'PN', Buffer.from('AB'), { implicit: true });
  const value = Buffer.concat([item(nested), item(nested), sequenceEnd()]);
  const bytes = part10(Buffer.concat([unknownSequence(value, { littleEndian: false }),
    element('00280010', 'US', uint(513, 2, false), { littleEndian: false })]), TransferSyntax.ExplicitVRBigEndian.ID);
  for (const event of ['onStartSequence', 'onStartItem']) {
    const handler = new CaptureHandler(), original = handler[event].bind(handler);
    let calls = 0;
    handler[event] = (context, attribute) => calls++ === 0 ? Status.SKIP : original(context, attribute);
    const parsed = await parseChunks(bytes, Array(bytes.length).fill(1), { handler });
    expect(parsed.status).toBe(Status.SUCCESS);
    expect(parsed.instance.dataSet.find(Tag.Rows).value).toBe(513);
    const unknown = parsed.instance.dataSet.find(Tag.find('77771001'));
    if (event === 'onStartSequence') expect(unknown).toBeUndefined();
    else expect(unknown.items).toHaveLength(1);
  }
});

test.each([true, false])('native writer preserves UN header provenance and implicit item encoding (%s)', async littleEndian => {
  const syntax = littleEndian ? TransferSyntax.ExplicitVRLittleEndian : TransferSyntax.ExplicitVRBigEndian;
  const nested = element('00280010', 'US', uint(0x1234, 2), { implicit: true });
  const bytes = part10(Buffer.concat([unknownSequence(unknownValue(nested), { littleEndian }),
    element('00280011', 'US', uint(0x3456, 2, littleEndian), { littleEndian })]), syntax.ID);
  const writer = new DicomDataWriterHandler(), parser = new DicomDataParser({ includePart10Header: true });
  parser.handler = writer;
  expect(await parser.parse(bytes, true, bytes.length, bytes.length)).toBe(Status.SUCCESS);
  const parsed = await parseChunks(Buffer.from(parser.result));
  expect(parsed.status).toBe(Status.SUCCESS);
  const unknown = parsed.instance.dataSet.find(Tag.find('77771001'));
  expect(unknown.vr.ID).toBe('UN');
  expect(unknown.transferSyntax).toBe(syntax);
  expect(unknown.items[0].find(Tag.Rows).value).toBe(0x1234);
  expect(parsed.instance.dataSet.find(Tag.Columns).value).toBe(0x3456);
});

test.each([true, false])('deflated dataset syntax fails explicitly after File Meta, without treating compressed bytes as attributes (header=%s)', async includePart10Header => {
  const plain = element('00100010', 'PN', Buffer.from('AB'));
  const compressed = deflateRawSync(plain);
  const bodies = [compressed, compressed.subarray(0, Math.max(1, compressed.length - 2)), plain];
  for (const body of bodies) {
    const bytes = part10(body, TransferSyntax.DeflatedExplicitVRLittleEndian.ID);
    for (let split = 0; split <= bytes.length; split++) {
      const parsed = await parseChunks(bytes, [split, bytes.length - split], { includePart10Header });
      expect(parsed.status).toBe(Status.FAIL);
      expect(parsed.parser.error.code).toBe('NotImplemented');
      expect(parsed.parser.error.message).toBe('Deflated Explicit VR Little Endian datasets are not supported.');
      expect(parsed.handler.events).not.toContain('attribute:00100010');
      expect(parsed.handler.events).not.toContain('dataset');
      expect(parsed.handler.events).not.toContain('instance');
      expect(parsed.instance).toBeUndefined();
    }
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
