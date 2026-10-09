import XmlDataParser from '../../../src/parsers/XmlDataParser.js';
import DicomXmlMetadataAdapter from '../../../src/handlers/adapters/DicomXmlMetadataAdapter.js';
import DicomInstanceHandler from '../../../src/handlers/terminals/DicomInstanceHandler.js';
import { Status } from '../../../src/parsers/Status.js';
import Tag from '../../../src/dicom/Tag.js';

test('Test: XML metadata adapter parses Native DICOM Model XML and emits Instance', async () => {

    const xml = `
<NativeDicomModel xmlns="http://dicom.nema.org/PS3.19/models/NativeDICOM">
  <DicomAttribute tag="00020010" vr="UI">
    <Value number="1">1.2.840.10008.1.2.1</Value>
  </DicomAttribute>
  <DicomAttribute tag="00080018" vr="UI">
    <Value number="1">1.2.3.4</Value>
  </DicomAttribute>
  <DicomAttribute tag="00100010" vr="PN">
    <PersonName number="1">
      <Alphabetic>
        <FamilyName>Doe</FamilyName>
        <GivenName>Jane</GivenName>
      </Alphabetic>
    </PersonName>
  </DicomAttribute>
  <DicomAttribute tag="00400275" vr="SQ">
    <Item number="1">
      <DicomAttribute tag="00080050" vr="SH">
        <Value number="1">ACC-123</Value>
      </DicomAttribute>
    </Item>
  </DicomAttribute>
  <DicomAttribute tag="7FE00010" vr="OB">
    <BulkData uri="http://localhost/dicom-web/bulk/7fe00010"/>
  </DicomAttribute>
</NativeDicomModel>`;

    const bytes = (new TextEncoder()).encode(xml);

    const parser = new XmlDataParser();
    parser.reset();
    parser.handler = new DicomXmlMetadataAdapter(new DicomInstanceHandler());

    const status = await parser.parse(bytes, true, bytes.length, bytes.length);

    expect(status).toBe(Status.SUCCESS);
    expect(parser.result).toBeTruthy();

    const instance = parser.result;
    expect(instance.metaSet).toBeTruthy();
    expect(instance.dataSet).toBeTruthy();

    expect(instance.metaSet.find(Tag.TransferSyntaxUID).value).toBe('1.2.840.10008.1.2.1');
    expect(instance.dataSet.find(Tag.SOPInstanceUID).value).toBe('1.2.3.4');

    const patientName = instance.dataSet.find(Tag.PatientName);
    expect(patientName).toBeTruthy();
    expect(typeof patientName.value).toBe('object');
    expect(patientName.value.Alphabetic).toBe('Doe^Jane');

    const requestAttributesSequence = instance.dataSet.find(Tag.find('00400275'));
    expect(requestAttributesSequence).toBeTruthy();
    expect(requestAttributesSequence.items.length).toBe(1);
    expect(requestAttributesSequence.items[0].find(Tag.find('00080050')).value).toBe('ACC-123');

    const pixelData = instance.dataSet.find(Tag.PixelData);
    expect(pixelData).toBeTruthy();
    expect(pixelData.isBulkDataURI).toBe(true);
    expect(pixelData.value).toBe('http://localhost/dicom-web/bulk/7fe00010');

});

test('Test: XML metadata adapter supports adapter-only materialization mode', async () => {

    const xml = `<NativeDicomModel><DicomAttribute tag="00080018" vr="UI"><Value number="1">1.2</Value></DicomAttribute></NativeDicomModel>`;
    const bytes = (new TextEncoder()).encode(xml);

    const parser = new XmlDataParser();
    parser.reset();
    parser.handler = new DicomXmlMetadataAdapter();

    const status = await parser.parse(bytes, true, bytes.length, bytes.length);

    expect(status).toBe(Status.SUCCESS);
    expect(Array.isArray(parser.result)).toBe(true);
    expect(parser.result.length).toBe(1);
    expect(parser.result[0].dataSet.find(Tag.SOPInstanceUID).value).toBe('1.2');

});

test('Test: XML metadata adapter parses fragmented synthetic DICOMweb XML metadata', async () => {

    const xml = `<NativeDicomModel xmlns="http://dicom.nema.org/PS3.19/models/NativeDICOM">
  <DicomAttribute tag="00080016" vr="UI"><Value number="1">1.2.840.10008.5.1.4.1.1.7</Value></DicomAttribute>
  <DicomAttribute tag="00080018" vr="UI"><Value number="1">2.25.903</Value></DicomAttribute>
  <DicomAttribute tag="0020000D" vr="UI"><Value number="1">2.25.901</Value></DicomAttribute>
  <DicomAttribute tag="0020000E" vr="UI"><Value number="1">2.25.902</Value></DicomAttribute>
</NativeDicomModel>`;
    const bytes = new TextEncoder().encode(xml);

    const parser = new XmlDataParser();
    parser.reset();
    parser.handler = new DicomXmlMetadataAdapter(new DicomInstanceHandler());

    let status;
    for (let offset = 0; offset < bytes.length; offset += 11) {
        const end = Math.min(offset + 11, bytes.length);
        status = await parser.parse(bytes.subarray(offset, end), end == bytes.length, end, bytes.length);
    }

    expect(status).toBe(Status.SUCCESS);
    expect(parser.result).toBeTruthy();
    expect(parser.result.dataSet.value(Tag.SOPClassUID)).toBe('1.2.840.10008.5.1.4.1.1.7');
    expect(parser.result.dataSet.value(Tag.SOPInstanceUID)).toBe('2.25.903');
    expect(parser.result.dataSet.value(Tag.StudyInstanceUID)).toBe('2.25.901');
    expect(parser.result.dataSet.value(Tag.SeriesInstanceUID)).toBe('2.25.902');
    expect(parser.result.dataSet.attributes.length).toBe(4);
});
