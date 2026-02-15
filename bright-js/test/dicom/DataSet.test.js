import DataSet from '../../src/dicom/DataSet.js';
import Attribute from '../../src/dicom/Attribute.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import Tag from '../../src/dicom/Tag.js'

test("Test: Data Find", () => {
    let dataset = new DataSet();

    dataset.add(new Attribute(Tag.FileMetaInformationGroupLength, 4, [255, 0, 0, 0], TransferSyntax.NONE));

    let data = (new TextEncoder()).encode("The Title");
    dataset.add(new Attribute(Tag.SourceApplicationEntityTitle, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("Short String");
    dataset.add(new Attribute(Tag.ImplementationVersionName, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("1.2.3.4.5.6.7.8.9.0.");
    dataset.add(new Attribute(Tag.ImplementationClassUID, data.length, data, TransferSyntax.NONE));

    data = new Uint8Array([255, 1, 255, 1])
    dataset.add(new Attribute(Tag.PixelData, data.length, data, TransferSyntax.NONE));
    
    expect(dataset.find(Tag.FileMetaInformationGroupLength).value).toBe(255);
});