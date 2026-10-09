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

    // DICOM RLE segments have even lengths; -128 is a PackBits NOP.
    if (output.length % 2 != 0)
        output.push(128);

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

test.each([
    ['signed 16-bit', 16, 16, 1, [[0x80, 0xFF, 0x00, 0x7F], [0x00, 0xFF, 0x00, 0xFF]], [0, 127, 128, 255]],
    ['signed 12-bit with unused high bits', 16, 12, 1, [[0xA8, 0xAF, 0xB0, 0xB7], [0x00, 0xFF, 0x00, 0xFF]], [0, 127, 128, 255]],
    ['signed 8-bit', 8, 8, 1, [[0x80, 0xFF, 0x00, 0x7F]], [0, 127, 128, 255]],
    ['signed 4-bit in an 8-bit sample', 8, 4, 1, [[0xF8, 0xFF, 0xB0, 0xA7]], [0, 119, 136, 255]],
    ['unsigned 4-bit with unused high bits', 8, 4, 0, [[0xB0, 0xB4, 0xB8, 0xBF]], [0, 68, 136, 255]]
])('Test: RleDecoder renders %s using the stored sample range', (_name, bitsAllocated, bitsStored, pixelRepresentation, planes, grayValues) => {
    // The byte planes are fixed two's-complement encodings, independent of any EASI encoder.
    const decoder = new RleDecoder({ imagePixelModule: {
        rows: 2, columns: 2, samplesPerPixel: 1,
        bitsAllocated, bitsStored, pixelRepresentation,
        photometricInterpretation: 'MONOCHROME2'
    } });
    const frame = buildRleFrame(planes.map(plane => encodeLiteralSegment(new Uint8Array(plane))));
    const rgba = new Uint8Array(16);

    expect(decoder.decode(frame, 0, frame.length, rgba, 0)).toBe(true);
    expect(Array.from(rgba)).toEqual(grayValues.flatMap(gray => [gray, gray, gray, 255]));
});

test('Test: RleDecoder normalizes stored bits independently for RGB components', () => {
    const decoder = new RleDecoder({ imagePixelModule: {
        rows: 1, columns: 2, samplesPerPixel: 3,
        bitsAllocated: 8, bitsStored: 4, pixelRepresentation: 0,
        photometricInterpretation: 'RGB'
    } });
    const planes = [[0xA0, 0xAF], [0xA4, 0xA8], [0xA8, 0xA4]];
    const frame = buildRleFrame(planes.map(plane => encodeLiteralSegment(new Uint8Array(plane))));
    const rgba = new Uint8Array(8);

    expect(decoder.decode(frame, 0, frame.length, rgba, 0)).toBe(true);
    expect(Array.from(rgba)).toEqual([0, 68, 136, 255, 255, 136, 68, 255]);
});
