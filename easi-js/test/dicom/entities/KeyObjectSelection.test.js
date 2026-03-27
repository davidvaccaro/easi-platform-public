import KeyObjectSelection from '../../../src/dicom/entities/KeyObjectSelection.js';
import Entity from '../../../src/dicom/entities/Entity.js';
import CurrentRequestedProcedureEvidenceModule from '../../../src/dicom/modules/CurrentRequestedProcedureEvidenceModule.js';
import Tag from '../../../src/dicom/Tag.js';

function createAttributeSet(withEvidence = false) {
    return {
        value() {
            return null;
        },
        find(tag) {
            if ((withEvidence == true) && (tag.ID == Tag.CurrentRequestedProcedureEvidenceSequence.ID)) {
                return {
                    items: [{
                        value(innerTag, defaultValue = null) {
                            if (innerTag.ID == Tag.StudyInstanceUID.ID)
                                return '1.2.3.study';
                            return defaultValue;
                        },
                        find(innerTag) {
                            if (innerTag.ID == Tag.ReferencedSeriesSequence.ID) {
                                return {
                                    items: [{
                                        value(seriesTag, defaultValue = null) {
                                            if (seriesTag.ID == Tag.SeriesInstanceUID.ID)
                                                return '1.2.3.series';
                                            return defaultValue;
                                        },
                                        find(seriesInnerTag) {
                                            if (seriesInnerTag.ID == Tag.ReferencedSOPSequence.ID) {
                                                return {
                                                    items: [{
                                                        value(sopTag, defaultValue = null) {
                                                            if (sopTag.ID == Tag.ReferencedSOPInstanceUID.ID)
                                                                return '1.2.3.instance';
                                                            if (sopTag.ID == Tag.ReferencedSOPClassUID.ID)
                                                                return '1.2.840.10008.5.1.4.1.1.2';
                                                            return defaultValue;
                                                        }
                                                    }]
                                                };
                                            }
                                            return null;
                                        }
                                    }]
                                };
                            }
                            return null;
                        }
                    }]
                };
            }
            return null;
        }
    };
}

test("Test: KeyObjectSelection Constructor Inheritance And AttributeSet", () => {
    var attributeSet = createAttributeSet();
    var entity = new KeyObjectSelection(attributeSet);

    expect(entity).toBeInstanceOf(Entity);
    expect(entity.attributeSet).toBe(attributeSet);
});

test("Test: KeyObjectSelection exposes evidence module and referenced SOP Instance UIDs", () => {
    var entity = new KeyObjectSelection(createAttributeSet(true));

    expect(entity.currentRequestedProcedureEvidenceModule).toBeInstanceOf(CurrentRequestedProcedureEvidenceModule);
    expect(entity.evidence).toBeInstanceOf(CurrentRequestedProcedureEvidenceModule);
    expect(entity.referencedSopInstanceUids).toEqual(['1.2.3.instance']);
});
