import MultiFrameModule from '../../../src/dicom/modules/MultiFrameModule.js';
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

test("Test: MultiFrameModule exposes frame-related accessors", () => {
    var module = new MultiFrameModule(createAttributeSet({
        [Tag.FrameIncrementPointer.ID]: '00181063',
        [Tag.StereoPairsPresent.ID]: 'NO',
        [Tag.NumberOfFrames.ID]: '10',
        [Tag.FrameTime.ID]: '33.3',
        [Tag.FrameTimeVector.ID]: '33.3\\33.3\\33.3',
        [Tag.RecommendedDisplayFrameRate.ID]: '30'
    }));

    expect(module.frameIncrementPointer).toBe('00181063');
    expect(module.stereoPairsPresent).toBe('NO');
    expect(module.numberOfFrames).toBe(10);
    expect(module.frameTime).toBe(33.3);
    expect(module.frameTimeVector).toEqual([33.3, 33.3, 33.3]);
    expect(module.recommendedDisplayFrameRate).toBe(30);
});
