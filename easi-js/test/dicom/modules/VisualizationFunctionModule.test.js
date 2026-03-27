import VisualizationFunctionModule from '../../../src/dicom/modules/VisualizationFunctionModule.js';
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

test("Test: VisualizationFunctionModule exposes VOI accessors", () => {
    var module = new VisualizationFunctionModule(createAttributeSet({
        [Tag.WindowCenter.ID]: '40\\80',
        [Tag.WindowWidth.ID]: '400\\800',
        [Tag.WindowCenterWidthExplanation.ID]: 'SOFT\\LUNG'
    }));

    expect(module.windowCenter).toEqual([40, 80]);
    expect(module.windowWidth).toEqual([400, 800]);
    expect(module.windowCenterWidthExplanation).toBe('SOFT\\LUNG');
});
