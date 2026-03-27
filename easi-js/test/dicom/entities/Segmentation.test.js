import Segmentation from '../../../src/dicom/entities/Segmentation.js';
import Image from '../../../src/dicom/entities/Image.js';
import SegmentationModule from '../../../src/dicom/modules/SegmentationModule.js';

function createAttributeSet() {
    return {
        value() { return null; },
        find() { return null; }
    };
}

test("Test: Segmentation constructor inheritance and attributeSet", () => {
    var attributeSet = createAttributeSet();
    var entity = new Segmentation(attributeSet);

    expect(entity).toBeInstanceOf(Image);
    expect(entity.attributeSet).toBe(attributeSet);
});

test("Test: Segmentation exposes segmentation module", () => {
    var entity = new Segmentation(createAttributeSet());
    expect(entity.segmentationModule).toBeInstanceOf(SegmentationModule);
    expect(entity.segmentation).toBeInstanceOf(SegmentationModule);
});
