import DicomAttribute from '../dicomAttribute.js';
import { TransferSyntax } from '../dicomTransferSyntax.js';
import { Tag } from '../dicomTag.js'

test("Test: Attribute UL Value Array", () => {
    let attribute = new DicomAttribute(Tag.FileMetaInformationGroupLength, 4, [255, 1, 0, 0], TransferSyntax.NONE);
    expect(attribute.value).toBe(511);
});

test("Test: Attribute UL Value Uint8Array", () => {
    let attribute = new DicomAttribute(Tag.FileMetaInformationGroupLength, 4, new Uint8Array([255, 1, 0, 0]), TransferSyntax.NONE);
    expect(attribute.value).toBe(511);
});

test("Test: Attribute AE Value", () => {
    let data = (new TextEncoder()).encode("The Title");
    let attribute = new DicomAttribute(Tag.SourceApplicationEntityTitle, data.length, data, TransferSyntax.NONE);
    expect(attribute.value).toBe("The Title");
});

test("Test: Attribute SH Value", () => {
    let data = (new TextEncoder()).encode("Short String");
    let attribute = new DicomAttribute(Tag.ImplementationVersionName, data.length, data, TransferSyntax.NONE);
    expect(attribute.value).toBe("Short String");
});

test("Test: Attribute UI Value", () => {
    let data = (new TextEncoder()).encode("1.2.3.4.5.6.7.8.9.0");
    let attribute = new DicomAttribute(Tag.ImplementationClassUID, data.length, data, TransferSyntax.NONE);
    expect(attribute.value).toBe("1.2.3.4.5.6.7.8.9.0");
});

test("Test: Attribute OB Value", () => {
    let data = new Uint8Array([255, 1, 255, 1])
    let attribute = new DicomAttribute(Tag.PixelData, data.length, data, TransferSyntax.NONE);
    expect(attribute.value).toStrictEqual(data);
});

test("Test: Attribute UN Value", () => {
    let data = new Uint8Array([255, 1, 255, 1])
    let attribute = new DicomAttribute(Tag.SelectorUNValue, data.length, data, TransferSyntax.NONE);
    expect(attribute.value).toStrictEqual(data);
});