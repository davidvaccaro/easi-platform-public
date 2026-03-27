import EncapsulatedDocumentModule from '../../../src/dicom/modules/EncapsulatedDocumentModule.js';
import Tag from '../../../src/dicom/Tag.js';

function createAttributeSet(valueByTagId = {}) {
    return {
        value(tag, defaultValue = null) {
            if (Object.prototype.hasOwnProperty.call(valueByTagId, tag.ID))
                return valueByTagId[tag.ID];
            return defaultValue;
        }
    };
}

test("Test: EncapsulatedDocumentModule exposes payload and metadata", () => {
    var payload = new Uint8Array([1, 2, 3, 4, 5]);
    var module = new EncapsulatedDocumentModule(createAttributeSet({
        [Tag.DocumentTitle.ID]: 'REPORT',
        [Tag.MIMETypeOfEncapsulatedDocument.ID]: 'application/pdf',
        [Tag.EncapsulatedDocument.ID]: payload,
        [Tag.EncapsulatedDocumentLength.ID]: 5
    }));

    expect(module.documentTitle).toBe('REPORT');
    expect(module.mimeType).toBe('application/pdf');
    expect(module.document).toBe(payload);
    expect(module.declaredDocumentLength).toBe(5);
    expect(module.documentLength).toBe(5);
});
