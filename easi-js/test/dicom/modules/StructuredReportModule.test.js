import StructuredReportModule from '../../../src/dicom/modules/StructuredReportModule.js';
import Tag from '../../../src/dicom/Tag.js';

function createAttributeSet(valueByTagId = {}, findByTagId = {}) {
    return {
        value(tag, defaultValue = null) {
            if (Object.prototype.hasOwnProperty.call(valueByTagId, tag.ID))
                return valueByTagId[tag.ID];
            return defaultValue;
        },
        find(tag) {
            if (Object.prototype.hasOwnProperty.call(findByTagId, tag.ID))
                return findByTagId[tag.ID];
            return null;
        }
    };
}

test("Test: StructuredReportModule exposes SR fields and content details", () => {
    var contentSequence = { items: [{}, {}] };
    var conceptNameCodeSequence = { items: [{}] };

    var module = new StructuredReportModule(createAttributeSet({
        [Tag.ValueType.ID]: 'CONTAINER',
        [Tag.CompletionFlag.ID]: 'COMPLETE',
        [Tag.VerificationFlag.ID]: 'VERIFIED'
    }, {
        [Tag.ContentSequence.ID]: contentSequence,
        [Tag.ConceptNameCodeSequence.ID]: conceptNameCodeSequence
    }));

    expect(module.valueType).toBe('CONTAINER');
    expect(module.completionFlag).toBe('COMPLETE');
    expect(module.verificationFlag).toBe('VERIFIED');
    expect(module.conceptNameCodeSequence).toBe(conceptNameCodeSequence);
    expect(module.contentSequence).toBe(contentSequence);
    expect(module.contentItemCount).toBe(2);
    expect(module.hasContent).toBe(true);
});

test("Test: StructuredReportModule handles missing content sequence", () => {
    var module = new StructuredReportModule(createAttributeSet());
    expect(module.contentItemCount).toBe(0);
    expect(module.hasContent).toBe(false);
});
