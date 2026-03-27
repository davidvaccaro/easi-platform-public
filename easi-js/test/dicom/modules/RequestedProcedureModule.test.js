import RequestedProcedureModule from '../../../src/dicom/modules/RequestedProcedureModule.js';
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

test("Test: RequestedProcedureModule exposes requested procedure fields", () => {
    var module = new RequestedProcedureModule(createAttributeSet({
        [Tag.AccessionNumber.ID]: 'ACC-001',
        [Tag.RequestedProcedureID.ID]: 'RP-100',
        [Tag.RequestedProcedureDescription.ID]: 'CT CHEST W CONTRAST',
        [Tag.StudyInstanceUID.ID]: '1.2.3.4.5'
    }));

    expect(module.accessionNumber).toBe('ACC-001');
    expect(module.requestedProcedureId).toBe('RP-100');
    expect(module.requestedProcedureDescription).toBe('CT CHEST W CONTRAST');
    expect(module.studyInstanceUid).toBe('1.2.3.4.5');
});
