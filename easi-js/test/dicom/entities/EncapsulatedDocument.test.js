import EncapsulatedDocument from '../../../src/dicom/entities/EncapsulatedDocument.js';
import Entity from '../../../src/dicom/entities/Entity.js';
import EncapsulatedDocumentModule from '../../../src/dicom/modules/EncapsulatedDocumentModule.js';
import UnwrappedDocument from '../../../src/dicom/utilities/UnwrappedDocument.js';

function createAttributeSet() {
    return {
        value() { return null; },
        find() { return null; }
    };
}

test("Test: EncapsulatedDocument constructor inheritance and attributeSet", () => {
    var attributeSet = createAttributeSet();
    var entity = new EncapsulatedDocument(attributeSet);

    expect(entity).toBeInstanceOf(Entity);
    expect(entity.attributeSet).toBe(attributeSet);
});

test("Test: EncapsulatedDocument exposes document module", () => {
    var entity = new EncapsulatedDocument(createAttributeSet());
    expect(entity.encapsulatedDocumentModule).toBeInstanceOf(EncapsulatedDocumentModule);
    expect(entity.documentModule).toBeInstanceOf(EncapsulatedDocumentModule);
});

test("Test: EncapsulatedDocument.wrap returns one EncapsulatedDocument entity", () => {
    var entity = EncapsulatedDocument.wrap({
        title: "Bridge Report",
        mimeType: "application/pdf",
        bytes: new Uint8Array([0x01, 0x02, 0x03])
    });

    expect(entity).toBeInstanceOf(EncapsulatedDocument);
    expect(entity.documentModule.mimeType).toBe("application/pdf");
});

test("Test: EncapsulatedDocument.wrap preserves cardinality for descriptor arrays", () => {
    var entities = EncapsulatedDocument.wrap([
        {
            title: "Report 1",
            mimeType: "application/pdf",
            bytes: new Uint8Array([0x01])
        },
        {
            title: "Report 2",
            mimeType: "application/pdf",
            bytes: new Uint8Array([0x02])
        }
    ]);

    expect(Array.isArray(entities)).toBe(true);
    expect(entities.length).toBe(2);
    expect(entities[0]).toBeInstanceOf(EncapsulatedDocument);
    expect(entities[1]).toBeInstanceOf(EncapsulatedDocument);
});

test("Test: EncapsulatedDocument instance unwrap delegates to default unwrapper", () => {
    var entity = EncapsulatedDocument.wrap({
        title: "notes",
        mimeType: "text/xml; charset=utf-8",
        text: "hello world"
    });

    var document = entity.unwrap();

    expect(document).not.toBeNull();
    expect(document).toBeInstanceOf(UnwrappedDocument);
    expect(document.mimeType).toBe("text/xml");
    expect(document.fileName).toBe("notes.xml");
    expect(document.text).toBe("hello world");
});

test("Test: EncapsulatedDocument.unwrap accepts source instance", () => {
    var entity = EncapsulatedDocument.wrap({
        title: "instance-source",
        mimeType: "application/pdf",
        bytes: new Uint8Array([1, 2, 3])
    });

    var document = EncapsulatedDocument.unwrap(entity.instance);

    expect(document).not.toBeNull();
    expect(document).toBeInstanceOf(UnwrappedDocument);
    expect(document.fileName).toBe("instance-source.pdf");
    expect(Array.from(document.bytes)).toEqual([1, 2, 3]);
});
