import DicomDocumentHandler from "../../../src/handlers/terminals/DicomDocumentHandler.js";
import DataSet from "../../../src/dicom/DataSet.js";
import Attribute from "../../../src/dicom/Attribute.js";
import Tag from "../../../src/dicom/Tag.js";
import TransferSyntax from "../../../src/dicom/TransferSyntax.js";
import SOPClass from "../../../src/dicom/SOPClass.js";

function addStringAttribute(attributeSet, tag, value) {
    var data = new TextEncoder().encode(value);
    attributeSet.add(new Attribute(
        tag,
        data.length,
        data,
        TransferSyntax.NONE
    ));
}

function addBinaryAttribute(attributeSet, tag, value) {
    attributeSet.add(new Attribute(
        tag,
        value.length,
        value,
        TransferSyntax.NONE
    ));
}

test("Test: DicomDocumentHandler unwraps one encapsulated document", () => {
    const handler = new DicomDocumentHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(context.instance.dataSet, Tag.SOPClassUID, SOPClass.EncapsulatedPDFStorage.ID);
    addStringAttribute(context.instance.dataSet, Tag.SOPInstanceUID, "1.2.3");
    addStringAttribute(context.instance.dataSet, Tag.DocumentTitle, "Radiology Report");
    addStringAttribute(context.instance.dataSet, Tag.MIMETypeOfEncapsulatedDocument, "application/pdf");
    addBinaryAttribute(context.instance.dataSet, Tag.EncapsulatedDocument, new Uint8Array([1, 2, 3]));

    const result = handler.onEndInstance(context);

    expect(result).not.toBeNull();
    expect(result.sopClassUid).toBe(SOPClass.EncapsulatedPDFStorage.ID);
    expect(result.sopInstanceUid).toBe("1.2.3");
    expect(result.mimeType).toBe("application/pdf");
    expect(result.fileName).toBe("Radiology Report.pdf");
    expect(Array.from(result.bytes)).toEqual([1, 2, 3]);
});

test("Test: DicomDocumentHandler ignores non-encapsulated instances and later emits document", () => {
    const handler = new DicomDocumentHandler();
    var context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(context.instance.dataSet, Tag.SOPClassUID, SOPClass.SecondaryCaptureImageStorage.ID);
    addStringAttribute(context.instance.dataSet, Tag.SOPInstanceUID, "1.2.840.1");

    const first = handler.onEndInstance(context);
    expect(first).toBeNull();

    context = handler.onStartInstance(context);
    context.instance.dataSet = new DataSet();
    addStringAttribute(context.instance.dataSet, Tag.SOPClassUID, SOPClass.EncapsulatedPDFStorage.ID);
    addStringAttribute(context.instance.dataSet, Tag.SOPInstanceUID, "1.2.840.2");
    addStringAttribute(context.instance.dataSet, Tag.DocumentTitle, "Report");
    addStringAttribute(context.instance.dataSet, Tag.MIMETypeOfEncapsulatedDocument, "application/pdf");
    addBinaryAttribute(context.instance.dataSet, Tag.EncapsulatedDocument, new Uint8Array([7, 8]));

    const second = handler.onEndInstance(context);
    expect(second).not.toBeNull();
    expect(second.sopInstanceUid).toBe("1.2.840.2");
});

test("Test: DicomDocumentHandler supports custom file-name factory", () => {
    const handler = new DicomDocumentHandler({
        fileNameFactory(output) {
            return "custom-" + output.sopInstanceUid;
        }
    });
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(context.instance.dataSet, Tag.SOPClassUID, SOPClass.EncapsulatedPDFStorage.ID);
    addStringAttribute(context.instance.dataSet, Tag.SOPInstanceUID, "1.2.3.4");
    addStringAttribute(context.instance.dataSet, Tag.MIMETypeOfEncapsulatedDocument, "application/pdf");
    addBinaryAttribute(context.instance.dataSet, Tag.EncapsulatedDocument, new Uint8Array([1]));

    const result = handler.onEndInstance(context);
    expect(result.fileName).toBe("custom-1.2.3.4.pdf");
});
