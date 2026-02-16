import CT from '../../../src/dicom/entities/CT.js';
import Image from '../../../src/dicom/entities/Image.js';
import Tag from '../../../src/dicom/Tag.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';
import ImagePlaneModule from '../../../src/dicom/modules/ImagePlaneModule.js';

function createAttributeSet(valueByTagId = {}, pixelDataAttribute = null) {
    return {
        value(tag, defaultValue = null) {
            if (Object.prototype.hasOwnProperty.call(valueByTagId, tag.ID)) {
                return valueByTagId[tag.ID];
            }
            return defaultValue;
        },
        find(tag) {
            if (tag.ID != Tag.PixelData.ID) {
                return null;
            }
            return pixelDataAttribute;
        }
    };
}

test("Test: CT Constructor Inheritance And AttributeSet", () => {
    var attributeSet = createAttributeSet();
    var ct = new CT(attributeSet);

    expect(ct).toBeInstanceOf(Image);
    expect(ct.attributeSet).toBe(attributeSet);
});

test("Test: CT ImagePlaneModule Getter", () => {
    var attributeSet = createAttributeSet();
    var ct = new CT(attributeSet);
    var module = ct.imagePlaneModule;

    expect(module).toBeInstanceOf(ImagePlaneModule);
    expect(module.attributeSet).toBe(attributeSet);
});

test("Test: CT ImagePlaneModule Is Not Cached", () => {
    var ct = new CT(createAttributeSet());
    expect(ct.imagePlaneModule).not.toBe(ct.imagePlaneModule);
});

test("Test: CT Inherited IsMultiFrame", () => {
    var ct = new CT(createAttributeSet({
        [Tag.Modality.ID]: 'CT',
        [Tag.NumberOfFrames.ID]: '3'
    }));

    expect(ct.isMultiFrame).toBe(true);
});

test("Test: CT Inherited DecodeFrame Smoke Test", () => {
    var pixelData = new Uint8Array([1, 2, 3, 4, 5, 6]);
    var pixelDataAttribute = {
        tag: Tag.PixelData,
        transferSyntax: TransferSyntax.NONE,
        valueLength: pixelData.length
    };
    var ct = new CT(createAttributeSet({
        [Tag.Modality.ID]: 'CT',
        [Tag.NumberOfFrames.ID]: '1',
        [Tag.Rows.ID]: 2,
        [Tag.Columns.ID]: 3,
        [Tag.SamplesPerPixel.ID]: 1,
        [Tag.BitsAllocated.ID]: 8,
        [Tag.PixelData.ID]: pixelData
    }, pixelDataAttribute));
    var destination = new Uint8Array(64);
    var decoderWasCalled = false;
    var decoder = {
        decode() {
            decoderWasCalled = true;
            return true;
        }
    };

    var result = ct.decodeFrame(destination, decoder, 0, 20, 40);

    expect(result).toBe(true);
    expect(decoderWasCalled).toBe(true);
});
