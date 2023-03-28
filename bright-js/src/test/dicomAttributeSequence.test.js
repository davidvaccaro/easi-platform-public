import DicomAttribute from '../dicomAttribute.js';
import DicomItem from '../dicomItem.js';
import DicomAttributeSequence from '../dicomAttributeSequence.js';
import DicomConstants from '../dicomConstants.js'
import { TransferSyntax } from '../dicomTransferSyntax.js';
import { Tag } from '../dicomTag.js'

var sequence = null;

function createNewItem(index) {

    let item = new DicomItem(DicomConstants.UndefinedLength);
    item.add(new DicomAttribute(Tag.FileMetaInformationGroupLength, 4, [255, index, 0, 0], TransferSyntax.NONE));

    let data = (new TextEncoder()).encode("The Title " + index.toString());
    item.add(new DicomAttribute(Tag.SourceApplicationEntityTitle, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("Short String" + index.toString());
    item.add(new DicomAttribute(Tag.ImplementationVersionName, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("1.2.3.4.5.6.7.8.9.0." + index.toString());
    item.add(new DicomAttribute(Tag.ImplementationClassUID, data.length, data, TransferSyntax.NONE));

    data = new Uint8Array([255, 1, 255, 1])
    item.add(new DicomAttribute(Tag.PixelData, data.length, data, TransferSyntax.NONE));

    return item;

}

beforeAll(() => {

    // Create the squence
    sequence = new DicomAttributeSequence(Tag.DirectoryRecordSequence, DicomConstants.UndefinedLength, [], TransferSyntax.NONE);
    sequence.add(createNewItem(0));
    sequence.add(createNewItem(1));
    sequence.add(createNewItem(2));
    sequence.add(createNewItem(3));

});

test("Test: Attribute Sequence Find", () => {
    expect(sequence.find(Tag.FileMetaInformationGroupLength).length).toBe(4);
});

test("Test: Attribute Sequence Has", () => {
    expect(sequence.has(Tag.PixelData)).toBe(true);
});

test("Test: Attribute Sequence Has NOT", () => {
    expect(sequence.has(Tag.AITDeviceType)).toBe(false);
});