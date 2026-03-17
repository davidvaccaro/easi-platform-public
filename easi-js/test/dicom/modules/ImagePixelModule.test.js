import ImagePixelModule from '../../../src/dicom/modules/ImagePixelModule.js';
import Tag, { PhotometricInterpretationType } from '../../../src/dicom/Tag.js';

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

test('Test: ImagePixelModule maps PALETTE COLOR photometric interpretation', () => {

    var attributeSet = createAttributeSet({
        [Tag.PhotometricInterpretation.ID]: 'PALETTE COLOR'
    });

    var module = new ImagePixelModule(attributeSet);

    expect(module.photometricInterpretation).toBe(PhotometricInterpretationType.PALETTECOLOR);

});

