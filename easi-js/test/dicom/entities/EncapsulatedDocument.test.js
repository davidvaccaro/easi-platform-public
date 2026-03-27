import EncapsulatedDocument from '../../../src/dicom/entities/EncapsulatedDocument.js';
import Entity from '../../../src/dicom/entities/Entity.js';
import EncapsulatedDocumentModule from '../../../src/dicom/modules/EncapsulatedDocumentModule.js';

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
