import SegmentationModule from '../../../src/dicom/modules/SegmentationModule.js';
import Tag from '../../../src/dicom/Tag.js';

function createItem(valueByTagId = {}) {
    return {
        value(tag, defaultValue = null) {
            if (Object.prototype.hasOwnProperty.call(valueByTagId, tag.ID))
                return valueByTagId[tag.ID];
            return defaultValue;
        }
    };
}

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

test("Test: SegmentationModule exposes segmentation descriptors", () => {
    var segmentSequence = {
        items: [
            createItem({
                [Tag.SegmentNumber.ID]: 1,
                [Tag.SegmentLabel.ID]: 'Liver',
                [Tag.SegmentAlgorithmType.ID]: 'AUTOMATIC',
                [Tag.SegmentAlgorithmName.ID]: 'ModelA'
            }),
            createItem({
                [Tag.SegmentNumber.ID]: 2,
                [Tag.SegmentLabel.ID]: 'Tumor',
                [Tag.SegmentAlgorithmType.ID]: 'MANUAL',
                [Tag.SegmentAlgorithmName.ID]: 'Radiologist'
            })
        ]
    };

    var module = new SegmentationModule(createAttributeSet({
        [Tag.SegmentationType.ID]: 'BINARY',
        [Tag.SegmentsOverlap.ID]: 'NO'
    }, {
        [Tag.SegmentSequence.ID]: segmentSequence
    }));

    expect(module.segmentationType).toBe('BINARY');
    expect(module.segmentsOverlap).toBe('NO');
    expect(module.segmentSequence).toBe(segmentSequence);
    expect(module.segmentCount).toBe(2);
    expect(module.segments).toEqual([
        {
            number: 1,
            label: 'Liver',
            algorithmType: 'AUTOMATIC',
            algorithmName: 'ModelA'
        },
        {
            number: 2,
            label: 'Tumor',
            algorithmType: 'MANUAL',
            algorithmName: 'Radiologist'
        }
    ]);
});
