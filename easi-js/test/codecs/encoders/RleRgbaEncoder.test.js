import RleRgbaEncoder from '../../../src/codecs/encoders/RleRgbaEncoder.js';
import RleDecoder from '../../../src/codecs/decoders/RleDecoder.js';

test('Test: RleRgbaEncoder encodes RGB planes that round-trip through RleDecoder', async () => {

    var encoder = new RleRgbaEncoder();
    var decoder = new RleDecoder();

    var width = 2;
    var height = 2;
    var rgba = new Uint8Array([
        10, 20, 30, 255,
        40, 50, 60, 255,
        70, 80, 90, 255,
        100, 110, 120, 255
    ]);

    var encoded = await encoder.encode(rgba, width, height, { componentCount: 3 });
    expect(encoded.bytes instanceof Uint8Array).toBe(true);
    expect(encoded.bytes.length).toBeGreaterThan(64);

    decoder.rows = height;
    decoder.columns = width;
    decoder.samplesPerPixel = 3;
    decoder.bitsAllocated = 8;
    decoder.bitsStored = 8;
    decoder.pixelRepresentation = 0;
    decoder.photometricInterpretation = 'RGB';

    var decoded = new Uint8Array(width * height * 4);
    decoder.decode(encoded.bytes, 0, encoded.bytes.length, decoded, 0);

    expect(Array.from(decoded)).toEqual(Array.from(rgba));

});

test('Test: RleRgbaEncoder encodes monochrome output when componentCount is 1', async () => {

    var encoder = new RleRgbaEncoder();
    var decoder = new RleDecoder();

    var width = 2;
    var height = 2;
    var rgba = new Uint8Array([
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
        255, 255, 255, 255
    ]);

    var encoded = await encoder.encode(rgba, width, height, { componentCount: 1 });
    expect(encoded.bytes instanceof Uint8Array).toBe(true);
    expect(encoded.bytes.length).toBeGreaterThan(64);

    decoder.rows = height;
    decoder.columns = width;
    decoder.samplesPerPixel = 1;
    decoder.bitsAllocated = 8;
    decoder.bitsStored = 8;
    decoder.pixelRepresentation = 0;
    decoder.photometricInterpretation = 'MONOCHROME2';

    var decoded = new Uint8Array(width * height * 4);
    decoder.decode(encoded.bytes, 0, encoded.bytes.length, decoded, 0);

    expect(Array.from(decoded)).toEqual([
        77, 77, 77, 255,
        149, 149, 149, 255,
        29, 29, 29, 255,
        255, 255, 255, 255
    ]);

});
