import RleDecoder from '../../../src/codecs/decoders/RleDecoder.js';

function encodeLiteralSegment(bytes) {
    var source = bytes ?? new Uint8Array(0);
    var output = [];
    var offset = 0;

    while (offset < source.length) {
        var count = Math.min(128, (source.length - offset));
        output.push((count - 1) & 0xFF);
        for (var i = 0; i < count; i++) {
            output.push(source[offset + i]);
        }
        offset += count;
    }

    return new Uint8Array(output);
}

function buildRleFrame(segmentDataList) {

    var segmentCount = segmentDataList.length;
    var header = new Uint8Array(64);
    var view = new DataView(header.buffer);
    view.setUint32(0, segmentCount, true);

    var offset = 64;
    for (var s = 0; s < segmentCount; s++) {
        view.setUint32((4 + (s * 4)), offset, true);
        offset += segmentDataList[s].length;
    }

    var frame = new Uint8Array(offset);
    frame.set(header, 0);

    var cursor = 64;
    for (var index = 0; index < segmentDataList.length; index++) {
        var segment = segmentDataList[index];
        frame.set(segment, cursor);
        cursor += segment.length;
    }

    return frame;

}

test('Test: RleDecoder decodes 8-bit monochrome frame to RGBA', () => {

    var decoder = new RleDecoder();
    decoder.rows = 2;
    decoder.columns = 2;
    decoder.samplesPerPixel = 1;
    decoder.bitsAllocated = 8;
    decoder.bitsStored = 8;
    decoder.pixelRepresentation = 0;
    decoder.photometricInterpretation = 'MONOCHROME2';

    var segment = encodeLiteralSegment(new Uint8Array([0, 64, 128, 255]));
    var frame = buildRleFrame([segment]);
    var rgba = new Uint8Array(16);

    decoder.decode(frame, 0, frame.length, rgba, 0);

    expect(Array.from(rgba)).toEqual([
        0, 0, 0, 255,
        64, 64, 64, 255,
        128, 128, 128, 255,
        255, 255, 255, 255
    ]);

});

test('Test: RleDecoder decodes 8-bit palette-color frame to RGB using LUT data', () => {

    var decoder = new RleDecoder();
    decoder.rows = 2;
    decoder.columns = 2;
    decoder.samplesPerPixel = 1;
    decoder.bitsAllocated = 8;
    decoder.bitsStored = 8;
    decoder.pixelRepresentation = 0;
    decoder.photometricInterpretation = 'PALETTE COLOR';

    // Palette entries (16-bit): 0->0, 1->65535, 2->0, 3->0 (red channel)
    decoder.redPaletteColorLookupTableData = new Uint8Array([
        0, 0,
        255, 255,
        0, 0,
        0, 0
    ]);
    decoder.greenPaletteColorLookupTableData = new Uint8Array([
        0, 0,
        0, 0,
        255, 255,
        0, 0
    ]);
    decoder.bluePaletteColorLookupTableData = new Uint8Array([
        0, 0,
        0, 0,
        0, 0,
        255, 255
    ]);

    var segment = encodeLiteralSegment(new Uint8Array([0, 1, 2, 3]));
    var frame = buildRleFrame([segment]);
    var rgba = new Uint8Array(16);

    decoder.decode(frame, 0, frame.length, rgba, 0);

    expect(Array.from(rgba)).toEqual([
        0, 0, 0, 255,
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255
    ]);

});

test('Test: RleDecoder initializes decode context from dicomObject image metadata', () => {

    var segment = encodeLiteralSegment(new Uint8Array([0, 64, 128, 255]));
    var frame = buildRleFrame([segment]);
    var rgba = new Uint8Array(16);

    var dicomObject = {
        imagePixelModule: {
            rows: 2,
            columns: 2,
            samplesPerPixel: 1,
            bitsAllocated: 8,
            bitsStored: 8,
            pixelRepresentation: 0,
            photometricInterpretation: 'MONOCHROME2'
        },
        attributeSet: {
            find: function (_tag) {
                return null;
            }
        }
    };

    var decoder = new RleDecoder(dicomObject);
    decoder.decode(frame, 0, frame.length, rgba, 0);

    expect(Array.from(rgba)).toEqual([
        0, 0, 0, 255,
        64, 64, 64, 255,
        128, 128, 128, 255,
        255, 255, 255, 255
    ]);

});

test('Test: RleDecoder normalizes photometric interpretation from symbol and attribute-set value', () => {

    var dicomObject = {
        imagePixelModule: {
            rows: 1,
            columns: 1,
            samplesPerPixel: 1,
            bitsAllocated: 8,
            bitsStored: 8,
            pixelRepresentation: 0,
            photometricInterpretation: Symbol('PALETTE COLOR')
        },
        attributeSet: {
            value: function () {
                return 'PALETTE COLOR';
            },
            find: function () {
                return null;
            }
        }
    };

    var decoder = new RleDecoder(dicomObject);

    expect(decoder.photometricInterpretation).toBe('PALETTE COLOR');

});
