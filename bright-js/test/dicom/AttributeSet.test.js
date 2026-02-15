import Attribute from '../../src/dicom/Attribute.js';
import AttributeSet from '../../src/dicom/AttributeSet.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import Tag from '../../src/dicom/Tag.js'

var attributes = null;

beforeAll(() => {

    // Create the squence
    attributes = new AttributeSet();

    attributes.add(new Attribute(Tag.FileMetaInformationGroupLength, 4, [255, 0, 0, 0], TransferSyntax.NONE));

    let data = (new TextEncoder()).encode("The Title");
    attributes.add(new Attribute(Tag.SourceApplicationEntityTitle, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("Short String");
    attributes.add(new Attribute(Tag.ImplementationVersionName, data.length, data, TransferSyntax.NONE));

    data = (new TextEncoder()).encode("1.2.3.4.5.6.7.8.9.0.");
    attributes.add(new Attribute(Tag.ImplementationClassUID, data.length, data, TransferSyntax.NONE));

    data = new Uint8Array([255, 1, 255, 1])
    attributes.add(new Attribute(Tag.PixelData, data.length, data, TransferSyntax.NONE));

});

test("Test: AttributeSet Find", () => {
    expect(attributes.find(Tag.FileMetaInformationGroupLength).value).toBe(255);
});

test("Test: AttributeSet Value", () => {
    expect(attributes.value(Tag.FileMetaInformationGroupLength)).toBe(255);
});

test("Test: AttributeSet Value DEFAULT", () => {
    expect(attributes.value(Tag.ALineRate, 100)).toBe(100);
});

test("Test: AttributeSet Is Complete NOT", () => {
    expect(attributes.isComplete).toBe(false);
});

test("Test: AttributeSet Is Complete", () => {
    attributes.isComplete = true;
    expect(attributes.isComplete).toBe(true);
});