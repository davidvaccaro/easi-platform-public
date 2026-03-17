import DicomNativePixelDataToRGBADecoder from '../../../src/codecs/decoders/DicomNativePixelDataToRGBADecoder.js';
import { PhotometricInterpretationType } from '../../../src/dicom/Tag.js';

function createDecoder({
    photometricInterpretation = PhotometricInterpretationType.RGB,
    bitsStored = 8,
    samplesPerPixel = 3,
    planarConfiguration = 0
} = {}) {

    return new DicomNativePixelDataToRGBADecoder({
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

