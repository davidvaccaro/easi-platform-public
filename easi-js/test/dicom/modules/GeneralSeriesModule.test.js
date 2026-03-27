import GeneralSeriesModule from '../../../src/dicom/modules/GeneralSeriesModule.js';
import Tag from '../../../src/dicom/Tag.js';
import Modality from '../../../src/dicom/Modality.js';

function createAttributeSet(valueByTagId = {}) {
    return {
        value(tag, defaultValue = null) {
            if (Object.prototype.hasOwnProperty.call(valueByTagId, tag.ID))
                return valueByTagId[tag.ID];
            return defaultValue;
        }
    };
}

test("Test: GeneralSeriesModule maps modality and exposes core series fields", () => {
    var module = new GeneralSeriesModule(createAttributeSet({
        [Tag.Modality.ID]: 'MR',
        [Tag.StudyInstanceUID.ID]: '1.2.3',
        [Tag.SeriesInstanceUID.ID]: '1.2.3.4',
        [Tag.SeriesNumber.ID]: '7',
        [Tag.SeriesDescription.ID]: 'AX T2',
        [Tag.SeriesDate.ID]: '20260102',
        [Tag.SeriesTime.ID]: '120305',
        [Tag.BodyPartExamined.ID]: 'BRAIN',
        [Tag.Laterality.ID]: 'R',
        [Tag.ProtocolName.ID]: 'STANDARD',
        [Tag.OperatorsName.ID]: 'Tech^One'
    }));

    expect(module.modality).toBe(Modality.MR);
    expect(module.studyInstanceUid).toBe('1.2.3');
    expect(module.seriesInstanceUid).toBe('1.2.3.4');
    expect(module.seriesNumber).toBe(7);
    expect(module.seriesDescription).toBe('AX T2');
    expect(module.seriesDate).toBe('20260102');
    expect(module.seriesTime).toBe('120305');
    expect(module.bodyPartExamined).toBe('BRAIN');
    expect(module.laterality).toBe('R');
    expect(module.protocolName).toBe('STANDARD');
    expect(module.operatorsName).toBe('Tech^One');
});

test("Test: GeneralSeriesModule returns NONE modality when missing", () => {
    var module = new GeneralSeriesModule(createAttributeSet());
    expect(module.modality).toBe(Modality.NONE);
});
