import DumpParser from '../../../src/tools/dicom/DumpParser.js';
import DicomInstanceHandler from '../../../src/handlers/terminals/DicomInstanceHandler.js';
import Tag from '../../../src/dicom/Tag.js';

// Fictional dcdump-format text exercises values and sequence lifecycle without a corpus.
const syntheticDump = [
    '(0x0002,0x0010) UI Transfer Syntax UID VR=<UI> VL=<0x0014> <1.2.840.10008.1.2.1>',
    '(0x0008,0x0016) UI SOP Class UID VR=<UI> VL=<0x001a> <1.2.840.10008.5.1.4.1.1.7>',
    '(0x0008,0x0018) UI SOP Instance UID VR=<UI> VL=<0x0008> <2.25.803>',
    '(0x0010,0x0010) PN Patient Name VR=<PN> VL=<0x000e> <SYNTHETIC^DUMP>',
    '(0x0028,0x0010) US Rows VR=<US> VL=<0x0002> <2>',
    '(0x0028,0x0011) US Columns VR=<US> VL=<0x0002> <2>',
    '(0x0040,0x0275) SQ Request Attributes Sequence VR=<SQ> VL=<0xffffffff>',
    '----:',
    '> (0x0008,0x0050) SH Accession Number VR=<SH> VL=<0x0008> <EASI-001>',
    '----:',
    '> (0x0008,0x0050) SH Accession Number VR=<SH> VL=<0x0008> <EASI-002>',
    '',
    '(0x7fe0,0x0010) OB Pixel Data VR=<OB> VL=<0x0004> <0x01,0x02,0x03,0x04>'
].join('\n');

test('Test: DumpParser parses synthetic metadata, numeric pixels, and multiple sequence items', () => {
    const parser = new DumpParser(new DicomInstanceHandler());

    expect(parser.parse(syntheticDump)).toBe(true);
    expect(parser.result.metaSet.attributes.length).toBe(1);
    expect(parser.result.dataSet.attributes.length).toBe(7);
    expect(parser.result.metaSet.value(Tag.TransferSyntaxUID)).toBe('1.2.840.10008.1.2.1');
    expect(parser.result.dataSet.value(Tag.PatientName)).toBe('SYNTHETIC^DUMP');
    expect(parser.result.dataSet.value(Tag.Rows)).toBe(2);
    expect(parser.result.dataSet.value(Tag.Columns)).toBe(2);
    // A textual dump supplies bulk metadata, rather than a native encoded PixelData buffer.
    expect(parser.result.dataSet.find(Tag.PixelData).valueLength).toBe(4);
    expect(parser.parseTagDetails(syntheticDump.split('\n').at(-1)).value).
    toEqual(new Uint8Array([1, 2, 3, 4]));
    const sequence = parser.result.dataSet.find(Tag.RequestAttributesSequence);
    expect(sequence.items).toHaveLength(2);
    expect(sequence.items.map(item => item.value(Tag.AccessionNumber))).toEqual(['EASI-001', 'EASI-002']);
});
