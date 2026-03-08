import PatientModule from '../../../src/dicom/modules/PatientModule.js';
import Tag from '../../../src/dicom/Tag.js';

function createAttributeSet(valueByTagId = {}) {
    return {
        value(tag, defaultValue = null) {
            if (Object.prototype.hasOwnProperty.call(valueByTagId, tag.ID)) {
                return valueByTagId[tag.ID];
            }
            return defaultValue;
        }
    };
}

test("Test: PatientModule Constructor Stores AttributeSet", () => {
    var attributeSet = createAttributeSet();
    var module = new PatientModule(attributeSet);

    expect(module.attributeSet).toBe(attributeSet);
});

test("Test: PatientModule Accessors Read Standard Patient Module Tags", () => {
    var attributeSet = createAttributeSet({
        [Tag.PatientName.ID]: 'Doe^Jane',
        [Tag.PatientID.ID]: '12345',
        [Tag.IssuerOfPatientID.ID]: 'HOSPITAL-A',
        [Tag.TypeOfPatientID.ID]: 'TEXT',
        [Tag.PatientBirthDate.ID]: '19800101',
        [Tag.PatientBirthTime.ID]: '101530',
        [Tag.PatientSex.ID]: 'F',
        [Tag.OtherPatientIDs.ID]: 'ALT001\\ALT002',
        [Tag.OtherPatientNames.ID]: 'Doe^J\\Smith^J',
        [Tag.EthnicGroup.ID]: 'N/A',
        [Tag.PatientComments.ID]: 'Sample patient comments'
    });

    var module = new PatientModule(attributeSet);

    expect(module.patientName).toBe('Doe^Jane');
    expect(module.patientId).toBe('12345');
    expect(module.issuerOfPatientID).toBe('HOSPITAL-A');
    expect(module.typeOfPatientID).toBe('TEXT');
    expect(module.patientBirthDate).toBe('19800101');
    expect(module.patientBirthTime).toBe('101530');
    expect(module.patientSex).toBe('F');
    expect(module.otherPatientIDs).toBe('ALT001\\ALT002');
    expect(module.otherPatientNames).toBe('Doe^J\\Smith^J');
    expect(module.ethnicGroup).toBe('N/A');
    expect(module.patientComments).toBe('Sample patient comments');
});
