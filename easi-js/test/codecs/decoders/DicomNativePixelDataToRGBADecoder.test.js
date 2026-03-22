import DicomNativePixelDataToRGBADecoder from '../../../src/codecs/decoders/DicomNativePixelDataToRGBADecoder.js';
import Tag, { PhotometricInterpretationType } from '../../../src/dicom/Tag.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';

function createDecoder({
    photometricInterpretation = PhotometricInterpretationType.RGB,
    bitsStored = 8,
    samplesPerPixel = 3,
    planarConfiguration = 0,
    attributeMap = {}
} = {}) {

    var attributeSet = {
        find(tag) {
            return attributeMap?.[tag?.ID] ?? null;
        }
    };

    return new DicomNativePixelDataToRGBADecoder({
        attributeSet,
        imagePixelModule: {
            photometricInterpretation,
            bitsStored,
            samplesPerPixel,
            planarConfiguration
        },
        generalSeriesModule: {
            modality: null
        },
        modalityLookUpTableModule: {
            rescaleIntercept: null,
            rescaleSlope: null
        }
    });

}

function createAttribute(bytes) {
    return {
        transferSyntax: TransferSyntax.NONE,
        access() {
            return bytes;
        }
    };
}

test('Test: DicomNativePixelDataToRGBADecoder decodes 8-bit interleaved RGB to RGBA', () => {

    var decoder = createDecoder({
        planarConfiguration: 0
    });

    var source = new Uint8Array([
        255, 0, 0,
        0, 255, 0
    ]);
    var destination = new Uint8Array(8);

    var result = decoder.decode(source, 0, source.length, destination, 0);

    expect(result).toBe(true);
    expect(Array.from(destination)).toEqual([
        255, 0, 0, 255,
        0, 255, 0, 255
    ]);

});

test('Test: DicomNativePixelDataToRGBADecoder decodes 8-bit planar RGB to RGBA', () => {

    var decoder = createDecoder({
        planarConfiguration: 1
    });

    // 2 pixels planar: R plane [10,20], G plane [30,40], B plane [50,60]
    var source = new Uint8Array([
        10, 20,
        30, 40,
        50, 60
    ]);
    var destination = new Uint8Array(8);

    var result = decoder.decode(source, 0, source.length, destination, 0);

    expect(result).toBe(true);
    expect(Array.from(destination)).toEqual([
        10, 30, 50, 255,
        20, 40, 60, 255
    ]);

});

test('Test: DicomNativePixelDataToRGBADecoder decodes 8-bit interleaved YBR_FULL to RGBA', () => {

    var decoder = createDecoder({
        photometricInterpretation: PhotometricInterpretationType.YBR_FULL,
        planarConfiguration: 0
    });

    // Two pixels:
    //   Y=100,Cb=128,Cr=128 => RGB ~= (100,100,100)
    //   Y=50, Cb=128,Cr=128 => RGB ~= (50,50,50)
    var source = new Uint8Array([
        100, 128, 128,
        50, 128, 128
    ]);
    var destination = new Uint8Array(8);

    var result = decoder.decode(source, 0, source.length, destination, 0);

    expect(result).toBe(true);
    expect(Array.from(destination)).toEqual([
        100, 100, 100, 255,
        50, 50, 50, 255
    ]);

});

test('Test: DicomNativePixelDataToRGBADecoder decodes PALETTE COLOR with direct 16-bit LUT data', () => {

    var descriptor = new Uint8Array([4, 0, 0, 0, 16, 0]); // entries=4, first=0, bits=16
    var lutData = new Uint8Array([
        0, 0,
        85, 85,
        170, 170,
        255, 255
    ]);

    var decoder = createDecoder({
        photometricInterpretation: PhotometricInterpretationType.PALETTECOLOR,
        bitsStored: 8,
        samplesPerPixel: 1,
        attributeMap: {
            [Tag.RedPaletteColorLookupTableDescriptor.ID]: createAttribute(descriptor),
            [Tag.GreenPaletteColorLookupTableDescriptor.ID]: createAttribute(descriptor),
            [Tag.BluePaletteColorLookupTableDescriptor.ID]: createAttribute(descriptor),
            [Tag.RedPaletteColorLookupTableData.ID]: createAttribute(lutData),
            [Tag.GreenPaletteColorLookupTableData.ID]: createAttribute(lutData),
            [Tag.BluePaletteColorLookupTableData.ID]: createAttribute(lutData)
        }
    });

    var source = new Uint8Array([0, 1, 2, 3]);
    var destination = new Uint8Array(16);

    var result = decoder.decode(source, 0, source.length, destination, 0);

    expect(result).toBe(true);
    expect(Array.from(destination)).toEqual([
        0, 0, 0, 255,
        85, 85, 85, 255,
        170, 170, 170, 255,
        255, 255, 255, 255
    ]);

});

test('Test: DicomNativePixelDataToRGBADecoder decodes PALETTE COLOR with segmented LUT data', () => {

    var descriptor = new Uint8Array([4, 0, 0, 0, 8, 0]); // entries=4, first=0, bits=8

    // opcode=0 (discrete), count=1, value=0
    // opcode=1 (linear),   count=3, end=255 => [85,170,255]
    var segmented = new Uint8Array([0, 1, 0, 1, 3, 255]);

    var decoder = createDecoder({
        photometricInterpretation: PhotometricInterpretationType.PALETTECOLOR,
        bitsStored: 8,
        samplesPerPixel: 1,
        attributeMap: {
            [Tag.RedPaletteColorLookupTableDescriptor.ID]: createAttribute(descriptor),
            [Tag.GreenPaletteColorLookupTableDescriptor.ID]: createAttribute(descriptor),
            [Tag.BluePaletteColorLookupTableDescriptor.ID]: createAttribute(descriptor),
            [Tag.SegmentedRedPaletteColorLookupTableData.ID]: createAttribute(segmented),
            [Tag.SegmentedGreenPaletteColorLookupTableData.ID]: createAttribute(segmented),
            [Tag.SegmentedBluePaletteColorLookupTableData.ID]: createAttribute(segmented)
        }
    });

    var source = new Uint8Array([0, 1, 2, 3]);
    var destination = new Uint8Array(16);

    var result = decoder.decode(source, 0, source.length, destination, 0);

    expect(result).toBe(true);
    expect(Array.from(destination)).toEqual([
        0, 0, 0, 255,
        85, 85, 85, 255,
        170, 170, 170, 255,
        255, 255, 255, 255
    ]);

});
