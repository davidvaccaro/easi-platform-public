import CurrentRequestedProcedureEvidenceModule from '../../../src/dicom/modules/CurrentRequestedProcedureEvidenceModule.js';
import Tag from '../../../src/dicom/Tag.js';

function createItem(valueByTagId = {}, byFindTagId = {}) {
    return {
        value(tag, defaultValue = null) {
            if (Object.prototype.hasOwnProperty.call(valueByTagId, tag.ID))
                return valueByTagId[tag.ID];
            return defaultValue;
        },
        find(tag) {
            if (Object.prototype.hasOwnProperty.call(byFindTagId, tag.ID))
                return byFindTagId[tag.ID];
            return null;
        }
    };
}

test("Test: CurrentRequestedProcedureEvidenceModule normalizes study/series/instance references", () => {
    var referencedSopItemA = createItem({
        [Tag.ReferencedSOPClassUID.ID]: '1.2.840.10008.5.1.4.1.1.2',
        [Tag.ReferencedSOPInstanceUID.ID]: '1.2.3.4.1'
    });
    var referencedSopItemB = createItem({
        [Tag.ReferencedSOPClassUID.ID]: '1.2.840.10008.5.1.4.1.1.2',
        [Tag.ReferencedSOPInstanceUID.ID]: '1.2.3.4.2'
    });

    var seriesItem = createItem({
        [Tag.SeriesInstanceUID.ID]: '1.2.3.series.1'
    }, {
        [Tag.ReferencedSOPSequence.ID]: {
            items: [referencedSopItemA, referencedSopItemB]
        }
    });

    var studyItem = createItem({
        [Tag.StudyInstanceUID.ID]: '1.2.3.study.1'
    }, {
        [Tag.ReferencedSeriesSequence.ID]: {
            items: [seriesItem]
        }
    });

    var module = new CurrentRequestedProcedureEvidenceModule({
        find(tag) {
            if (tag.ID == Tag.CurrentRequestedProcedureEvidenceSequence.ID) {
                return { items: [studyItem] };
            }
            return null;
        }
    });

    expect(module.items.length).toBe(1);
    expect(module.studies).toEqual([
        {
            studyInstanceUid: '1.2.3.study.1',
            series: [
                {
                    seriesInstanceUid: '1.2.3.series.1',
                    instances: [
                        {
                            sopClassUid: '1.2.840.10008.5.1.4.1.1.2',
                            sopInstanceUid: '1.2.3.4.1'
                        },
                        {
                            sopClassUid: '1.2.840.10008.5.1.4.1.1.2',
                            sopInstanceUid: '1.2.3.4.2'
                        }
                    ]
                }
            ]
        }
    ]);
    expect(module.referencedSopInstanceUids).toEqual(['1.2.3.4.1', '1.2.3.4.2']);
});

test("Test: CurrentRequestedProcedureEvidenceModule handles missing sequence", () => {
    var module = new CurrentRequestedProcedureEvidenceModule({
        find() {
            return null;
        }
    });

    expect(module.items).toEqual([]);
    expect(module.studies).toEqual([]);
    expect(module.referencedSopInstanceUids).toEqual([]);
});
