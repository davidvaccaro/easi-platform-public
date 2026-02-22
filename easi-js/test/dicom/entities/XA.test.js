import XA from '../../../src/dicom/entities/XA.js';
import Image from '../../../src/dicom/entities/Image.js';
import Tag from '../../../src/dicom/Tag.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';

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

test("Test: XA Constructor Inheritance And AttributeSet", () => {
    var attributeSet = createAttributeSet();
    var xa = new XA(attributeSet);

    expect(xa).toBeInstanceOf(Image);
    expect(xa.attributeSet).toBe(attributeSet);
});

test("Test: XA Inherited IsMultiFrame", () => {
    var xa = new XA(createAttributeSet({
        [Tag.Modality.ID]: 'XA',
        [Tag.NumberOfFrames.ID]: '2'
    }));

    expect(xa.isMultiFrame).toBe(true);
});

test("Test: XA Inherited DecodeFrame Smoke Test", () => {
    var pixelData = new Uint8Array([1, 2, 3, 4, 5, 6]);
    var pixelDataAttribute = {
        tag: Tag.PixelData,
        transferSyntax: TransferSyntax.NONE,
        valueLength: pixelData.length
    };
    var xa = new XA(createAttributeSet({
        [Tag.Modality.ID]: 'XA',
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

    var result = xa.decodeFrame(destination, decoder, 0, 20, 40);

    expect(result).toBe(true);
    expect(decoderWasCalled).toBe(true);
});
