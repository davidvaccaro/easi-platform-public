import Attribute from '../../src/dicom/Attribute.js';
import Item from '../../src/dicom/Item.js';
import AttributeSequence from '../../src/dicom/AttributeSequence.js';
import Constants from '../../src/dicom/Constants.js'
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import Tag from '../../src/dicom/Tag.js'

var sequence = null;

function createNewItem(index) {

    let item = new Item(Constants.UndefinedLength);
    item.add(new Attribute(Tag.FileMetaInformationGroupLength, 4, [255, index, 0, 0], TransferSyntax.NONE));

    let data = (new TextEncoder()).encode("The Title " + index.toString());
    item.add(new Attribute(Tag.SourceApplicationEntityTitle, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("Short String" + index.toString());
    item.add(new Attribute(Tag.ImplementationVersionName, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("1.2.3.4.5.6.7.8.9.0." + index.toString());
    item.add(new Attribute(Tag.ImplementationClassUID, data.length, data, TransferSyntax.NONE));

    data = new Uint8Array([255, 1, 255, 1])
    item.add(new Attribute(Tag.PixelData, data.length, data, TransferSyntax.NONE));

    return item;

}

beforeAll(() => {

    // Create the squence
    sequence = new AttributeSequence(Tag.DirectoryRecordSequence, Constants.UndefinedLength, [], TransferSyntax.NONE);
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