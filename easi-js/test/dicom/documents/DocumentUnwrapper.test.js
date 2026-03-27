import DocumentUnwrapper from "../../../src/dicom/documents/DocumentUnwrapper.js";
import EncapsulatedDocument from "../../../src/dicom/entities/EncapsulatedDocument.js";
import Instance from "../../../src/dicom/Instance.js";
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

function addUInt32Attribute(attributeSet, tag, value) {
    var data = new Uint8Array(4);
    var view = new DataView(data.buffer);
    view.setUint32(0, value, true);
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

function createEncapsulatedDocumentEntity({
    sopClassUid = SOPClass.EncapsulatedPDFStorage.ID,
    sopInstanceUid = '1.2.3.4',
    title = 'Report',
    mimeType = 'application/pdf',
    payload = new Uint8Array([1, 2, 3]),
    declaredLength = null
} = {}) {
    var instance = new Instance();
    instance.dataSet = new DataSet();
    addStringAttribute(instance.dataSet, Tag.SOPClassUID, sopClassUid);
    addStringAttribute(instance.dataSet, Tag.SOPInstanceUID, sopInstanceUid);
    if (title != null) {
        addStringAttribute(instance.dataSet, Tag.DocumentTitle, title);
    }
    if (mimeType != null) {
        addStringAttribute(instance.dataSet, Tag.MIMETypeOfEncapsulatedDocument, mimeType);
    }
    addBinaryAttribute(instance.dataSet, Tag.EncapsulatedDocument, payload);
    if (declaredLength != null) {
        addUInt32Attribute(instance.dataSet, Tag.EncapsulatedDocumentLength, declaredLength);
    }
    return new EncapsulatedDocument(instance);
}

test("Test: DocumentUnwrapper unwraps binary encapsulated document with declared length trimming", () => {
    var entity = createEncapsulatedDocumentEntity({
        payload: new Uint8Array([0x10, 0x20, 0x30, 0x00]),
        declaredLength: 3
    });

    var unwrapper = new DocumentUnwrapper();
    var document = unwrapper.unwrap(entity);

    expect(document).not.toBeNull();
    expect(document.mimeType).toBe('application/pdf');
    expect(document.extension).toBe('pdf');
    expect(document.fileName).toBe('Report.pdf');
    expect(document.declaredByteLength).toBe(3);
    expect(Array.from(document.bytes)).toEqual([0x10, 0x20, 0x30]);
    expect(document.text).toBeNull();
});

test("Test: DocumentUnwrapper decodes text payload for text MIME content", () => {
    var entity = createEncapsulatedDocumentEntity({
        title: 'notes',
        mimeType: 'text/plain; charset=utf-8',
        payload: new TextEncoder().encode('hello world')
    });

    var unwrapper = new DocumentUnwrapper();
    var document = unwrapper.unwrap(entity);

    expect(document.mimeType).toBe('text/plain');
    expect(document.extension).toBe('txt');
    expect(document.fileName).toBe('notes.txt');
    expect(document.text).toBe('hello world');
});

test("Test: DocumentUnwrapper infers extension from SOP Class when MIME is absent", () => {
    var entity = createEncapsulatedDocumentEntity({
        sopClassUid: SOPClass.EncapsulatedOBJStorage.ID,
        mimeType: null,
        title: 'mesh output'
    });

    var unwrapper = new DocumentUnwrapper();
    var document = unwrapper.unwrap(entity);

    expect(document.mimeType).toBe('application/octet-stream');
    expect(document.extension).toBe('obj');
    expect(document.fileName).toBe('mesh output.obj');
});
