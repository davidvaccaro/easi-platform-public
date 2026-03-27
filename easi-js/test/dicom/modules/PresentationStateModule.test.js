import PresentationStateModule from '../../../src/dicom/modules/PresentationStateModule.js';
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

test("Test: PresentationStateModule exposes presentation state fields", () => {
    var referencedSeriesSequence = { items: [{}] };
    var referencedImageSequence = { items: [{}] };

    var module = new PresentationStateModule(createAttributeSet({
        [Tag.ContentLabel.ID]: 'PS_LABEL',
        [Tag.ContentDescription.ID]: 'Presentation Description',
        [Tag.ContentCreatorName.ID]: 'Creator^One',
        [Tag.PresentationCreationDate.ID]: '20260327',
        [Tag.PresentationCreationTime.ID]: '102030'
    }, {
        [Tag.ReferencedSeriesSequence.ID]: referencedSeriesSequence,
        [Tag.ReferencedImageSequence.ID]: referencedImageSequence
    }));

    expect(module.contentLabel).toBe('PS_LABEL');
    expect(module.contentDescription).toBe('Presentation Description');
    expect(module.contentCreatorName).toBe('Creator^One');
    expect(module.presentationCreationDate).toBe('20260327');
    expect(module.presentationCreationTime).toBe('102030');
    expect(module.referencedSeriesSequence).toBe(referencedSeriesSequence);
    expect(module.referencedImageSequence).toBe(referencedImageSequence);
});
