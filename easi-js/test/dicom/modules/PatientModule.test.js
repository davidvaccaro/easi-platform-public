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
        [Tag.PatientAge.ID]: '045Y',
        [Tag.PatientSize.ID]: '1.72',
        [Tag.PatientWeight.ID]: '74.5',
        [Tag.PatientIdentityRemoved.ID]: 'YES',
        [Tag.OtherPatientIDs.ID]: 'ALT001\\ALT002',
        [Tag.OtherPatientNames.ID]: 'Doe^J\\Smith^J',
        [Tag.EthnicGroup.ID]: 'N/A',
        [Tag.PatientComments.ID]: 'Sample patient comments'
    });

    var module = new PatientModule(attributeSet);

    expect(module.patientName).toBe('Doe^Jane');
    expect(module.name).toBe('Doe^Jane');
    expect(module.patientId).toBe('12345');
    expect(module.id).toBe('12345');
    expect(module.issuerOfPatientID).toBe('HOSPITAL-A');
    expect(module.typeOfPatientID).toBe('TEXT');
    expect(module.patientBirthDate).toBe('19800101');
    expect(module.birthDate).toBe('19800101');
    expect(module.patientBirthTime).toBe('101530');
    expect(module.birthTime).toBe('101530');
    expect(module.patientSex).toBe('F');
    expect(module.sex).toBe('F');
    expect(module.patientAge).toBe('045Y');
    expect(module.patientSize).toBe(1.72);
    expect(module.patientWeight).toBe(74.5);
    expect(module.patientIdentityRemoved).toBe('YES');
    expect(module.otherPatientIDs).toBe('ALT001\\ALT002');
    expect(module.otherPatientNames).toBe('Doe^J\\Smith^J');
    expect(module.ethnicGroup).toBe('N/A');
    expect(module.patientComments).toBe('Sample patient comments');
});
