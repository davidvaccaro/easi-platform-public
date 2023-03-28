import DicomDataSet from '../dicomDataSet.js';
import DicomAttribute from '../dicomAttribute.js';
import { TransferSyntax } from '../dicomTransferSyntax.js';
import { Tag } from '../dicomTag.js'

test("Test: Data Find", () => {
    let dataset = new DicomDataSet();

    dataset.add(new DicomAttribute(Tag.FileMetaInformationGroupLength, 4, [255, 0, 0, 0], TransferSyntax.NONE));

    let data = (new TextEncoder()).encode("The Title");
    dataset.add(new DicomAttribute(Tag.SourceApplicationEntityTitle, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("Short String");
    dataset.add(new DicomAttribute(Tag.ImplementationVersionName, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("1.2.3.4.5.6.7.8.9.0.");
    dataset.add(new DicomAttribute(Tag.ImplementationClassUID, data.length, data, TransferSyntax.NONE));

    data = new Uint8Array([255, 1, 255, 1])
    dataset.add(new DicomAttribute(Tag.PixelData, data.length, data, TransferSyntax.NONE));
    
    expect(dataset.find(Tag.FileMetaInformationGroupLength).value).toBe(255);
});