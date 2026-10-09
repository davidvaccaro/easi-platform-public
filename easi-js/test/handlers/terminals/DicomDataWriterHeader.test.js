import EASI from '../../../src/EASI.js';
import Tag from '../../../src/dicom/Tag.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';
import { ValueRepresentations } from '../../../src/dicom/ValueRepresentation.js';
import DicomDataWriterHandler from '../../../src/handlers/terminals/DicomDataWriterHandler.js';
import DicomDataParser from '../../../src/parsers/DicomDataParser.js';

// DICOM PS3.5 section 7.1.2: these VRs have reserved bytes and a 32-bit VL.
const longLengthVRs = ['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'SQ', 'SV', 'UC', 'UN', 'UR', 'UT', 'UV'];
const syntaxes = [TransferSyntax.ExplicitVRLittleEndian, TransferSyntax.ExplicitVRBigEndian];

test.each(longLengthVRs)('Test: writer uses a 32-bit explicit value length for %s in either byte order', (vr) => {

  const writer = new DicomDataWriterHandler();
  for (const syntax of syntaxes) {
    const header = writer.serializeHeader(Tag.find('00111010'), ValueRepresentations[vr], 65536, syntax);
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);

    expect(header.length).toBe(12);
    expect(String.fromCharCode(header[4], header[5])).toBe(vr);
    expect(Array.from(header.slice(6, 8))).toEqual([0, 0]);
    expect(view.getUint32(8, syntax.IsLittleEndian)).toBe(65536);
  }

});

test.each(['materialize', 'auto', 'stream'])('Test: native writer copies encapsulated fragments across every split (%s)', async (policy) => {

  const writer = new DicomDataWriterHandler();
  const syntax = TransferSyntax.ExplicitVRLittleEndian;
  const delimiter = writer.serializeHeader(Tag.SequenceDelimitationItem, Tag.SequenceDelimitationItem.VR, 0, syntax);
  // A delimiter signature inside a fragment is opaque payload data.
  const fragment = Buffer.concat([Buffer.from([1, 2]), delimiter]);
  const source = Buffer.concat([
    writer.serializeHeader(Tag.PixelData, ValueRepresentations.OB, 0xFFFFFFFF, syntax),
    writer.serializeHeader(Tag.Item, Tag.Item.VR, 0, syntax),
    writer.serializeHeader(Tag.Item, Tag.Item.VR, fragment.length, syntax), fragment, delimiter,
    writer.serializeHeader(Tag.PatientID, ValueRepresentations.LO, 2, syntax), Buffer.from('ID')
  ]);

  for (let split = 0; split <= source.length; split++) {
    const parser = new DicomDataParser();
    parser.bulkDataPolicy = policy;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(source.slice(0, split));
        controller.enqueue(source.slice(split));
        controller.close();
      }
    });
    const result = await EASI.pipelineBuilder().
    fromPartStream().withParser(parser).toDicomData().build().process(stream);

    expect(Buffer.from(result.first())).toEqual(source);
  }

});

test('Test: writer keeps the 16-bit explicit value length for LO', () => {

  const writer = new DicomDataWriterHandler();
  for (const syntax of syntaxes) {
    const header = writer.serializeHeader(Tag.PatientID, ValueRepresentations.LO, 4, syntax);
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);

    expect(header.length).toBe(8);
    expect(view.getUint16(6, syntax.IsLittleEndian)).toBe(4);
  }

});

test.each([
  ['SV', Tag.SelectorSVValue, -9007199254740993n],
  ['UV', Tag.SelectorUVValue, 18446744073709551615n]
])('Test: native writer preserves the raw 64-bit payload for %s', async (vr, tag, value) => {

  const source = new Uint8Array(20);
  const view = new DataView(source.buffer);
  view.setUint16(0, tag.Group, true);
  view.setUint16(2, tag.Element, true);
  source.set(new TextEncoder().encode(vr), 4);
  view.setUint32(8, 8, true);
  if (vr === 'SV') {
    view.setBigInt64(12, value, true);
  }
  else {
    view.setBigUint64(12, value, true);
  }

  const result = await EASI.pipelineBuilder().
  fromByteStream().ofDicomData().toDicomData().build().process(source);

  expect(Array.from(result.first())).toEqual(Array.from(source));

});
