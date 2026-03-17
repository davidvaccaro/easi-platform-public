import Jpeg2000RgbaEncoder from '../../../src/codecs/encoders/Jpeg2000RgbaEncoder.js';
import OpenJpegRuntime from '../../../src/codecs/runtimes/OpenJpegRuntime.js';

function buildRgba(width = 2, height = 2) {
    return new Uint8Array(width * height * 4).fill(127);
}

function hasPrefix(bytes, prefix) {
    if (bytes.length < prefix.length)
        return false;

    for (var i = 0; i < prefix.length; i++) {
        if (bytes[i] != prefix[i])
            return false;
    }

    return true;
}

test('Test: Jpeg2000RgbaEncoder uses function backend', async () => {

    var encoder = new Jpeg2000RgbaEncoder({
        backend: (rgba, width, height, options) => {
            expect(rgba.length).toBe(16);
            expect(width).toBe(2);
            expect(height).toBe(2);
            expect(options?.quality).toBe(0.8);
            return new Uint8Array([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20]);
        }
    });

    var encoded = await encoder.encode(buildRgba(), 2, 2, { quality: 0.8 });

    expect(encoded.format).toBe('jpeg2000');
    expect(encoded.mimeType).toBe('image/jp2');
    expect(encoded.bytes instanceof Uint8Array).toBe(true);
    expect(encoded.bytes.length).toBeGreaterThan(0);

});

test('Test: Jpeg2000RgbaEncoder uses object backend with encode method', async () => {

    var encoder = new Jpeg2000RgbaEncoder();

    var encoded = await encoder.encode(buildRgba(), 2, 2, {
        backend: {
            encode: () => ({
                bytes: new Uint8Array([0x01, 0x02, 0x03]),
                mimeType: 'image/jp2',
                format: 'jpeg2000'
            })
        }
    });

    expect(encoded.bytes.length).toBe(3);
    expect(encoded.mimeType).toBe('image/jp2');
    expect(encoded.format).toBe('jpeg2000');

});

function createFakeOpenJpegModule() {

    class J2KEncoder {
        getDecodedBuffer(info) {
            this.info = info;
            this.decoded = new Uint8Array(info.width * info.height * info.componentCount);
            return this.decoded;
        }

        setQuality(value) {
            this.quality = value;
        }

        setDecompositions(value) {
            this.decompositions = value;
        }

        setCompressionRatio(value) {
            this.compressionRatio = value;
        }

        encode() {
            this.encoded = new Uint8Array([0xFF, 0x4F, 0xFF, 0x51, this.decoded.length & 0xFF]);
        }

        getEncodedBuffer() {
            return this.encoded ?? new Uint8Array(0);
        }
    }

    return { J2KEncoder };

}

function createFakeOpenJpegModuleWithInt32Buffer() {

    var lastDecoded = null;

    class J2KEncoder {
        getDecodedBuffer(info) {
            this.info = info;
            this.decoded = new Int32Array(info.width * info.height * info.componentCount);
            lastDecoded = this.decoded;
            return this.decoded;
        }

        setQuality(value) {
            this.quality = value;
        }

        setDecompositions(value) {
            this.decompositions = value;
        }

        setCompressionRatio(value) {
            this.compressionRatio = value;
        }

        encode() {
            this.encoded = new Uint8Array([0xFF, 0x4F, 0xFF, 0x51, this.decoded.length & 0xFF]);
        }

        getEncodedBuffer() {
            return this.encoded ?? new Uint8Array(0);
        }
    }

    return {
        J2KEncoder,
        getLastDecoded: () => lastDecoded
    };

}

function createFakeOpenJpegModuleForMonochromeSamples() {

    var lastDecoded = null;
    var lastInfo = null;

    class J2KEncoder {
        getDecodedBuffer(info) {
            lastInfo = info;
            this.decoded = new Int32Array(info.width * info.height * info.componentCount);
            lastDecoded = this.decoded;
            return this.decoded;
        }

        setQuality(value) {
            this.quality = value;
        }

        setDecompositions(value) {
            this.decompositions = value;
        }

        setCompressionRatio(value) {
            this.compressionRatio = value;
        }

        encode() {
            this.encoded = new Uint8Array([0xFF, 0x4F, 0xFF, 0x51, this.decoded.length & 0xFF]);
        }

        getEncodedBuffer() {
            return this.encoded ?? new Uint8Array(0);
        }
    }

    return {
        J2KEncoder,
        getLastDecoded: () => lastDecoded,
        getLastInfo: () => lastInfo
    };

}

function createFakeOpenJpegModuleForMonochromeSampleBytes() {

    var lastDecoded = null;
    var lastInfo = null;

    class J2KEncoder {
        getDecodedBuffer(info) {
            lastInfo = info;
            var bytesPerSample = (Number(info?.bitsPerSample) > 8) ? 2 : 1;
            this.decoded = new Uint8Array(info.width * info.height * info.componentCount * bytesPerSample);
            lastDecoded = this.decoded;
            return this.decoded;
        }

        setQuality(value) {
            this.quality = value;
        }

        setDecompositions(value) {
            this.decompositions = value;
        }

        setCompressionRatio(value) {
            this.compressionRatio = value;
        }

        encode() {
            this.encoded = new Uint8Array([0xFF, 0x4F, 0xFF, 0x51, this.decoded.length & 0xFF]);
        }

        getEncodedBuffer() {
            return this.encoded ?? new Uint8Array(0);
        }
    }

    return {
        J2KEncoder,
        getLastDecoded: () => lastDecoded,
        getLastInfo: () => lastInfo
    };

}

afterEach(() => {
    OpenJpegRuntime.clear();
});

test('Test: Jpeg2000RgbaEncoder uses explicit OpenJPEG module', async () => {

    var openjpegModule = createFakeOpenJpegModule();
    var encoder = new Jpeg2000RgbaEncoder({
        openjpegModule
    });

    var width = 2;
    var height = 2;
    var rgba = new Uint8Array(width * height * 4);

    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            var offset = ((y * width) + x) * 4;
            rgba[offset] = (x % 256);
            rgba[offset + 1] = (y % 256);
            rgba[offset + 2] = ((x + y) % 256);
            rgba[offset + 3] = 255;
        }
    }

    var encoded = await encoder.encode(rgba, width, height, { quality: 90 });

    expect(encoded.bytes.length).toBeGreaterThan(0);
    expect(
        hasPrefix(encoded.bytes, new Uint8Array([0xFF, 0x4F, 0xFF, 0x51])) ||
        hasPrefix(encoded.bytes, new Uint8Array([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20]))
    ).toBe(true);
    expect(encoded.mimeType).toBe('image/jp2');
    expect(encoded.format).toBe('jpeg2000');

});

test('Test: Jpeg2000RgbaEncoder writes sample-wise values when OpenJPEG returns Int32 decoded buffers', async () => {

    var openjpegModule = createFakeOpenJpegModuleWithInt32Buffer();
    var encoder = new Jpeg2000RgbaEncoder({
        openjpegModule
    });

    var encoded = await encoder.encode(buildRgba(), 2, 2, { quality: 90, componentCount: 1 });
    expect(encoded.bytes.length).toBeGreaterThan(0);

    var decoded = openjpegModule.getLastDecoded();
    expect(decoded instanceof Int32Array).toBe(true);
    expect(decoded.length).toBe(4);

    for (var i = 0; i < decoded.length; i++) {
        expect(decoded[i]).toBe(127);
    }

});

test('Test: Jpeg2000RgbaEncoder uses async OpenJPEG factory', async () => {

    var openjpegModule = createFakeOpenJpegModule();
    var encoder = new Jpeg2000RgbaEncoder({
        openjpegFactory: async () => openjpegModule
    });

    var encoded = await encoder.encode(buildRgba(), 2, 2, { quality: 0.75 });
    expect(encoded.bytes.length).toBeGreaterThan(0);
    expect(encoded.mimeType).toBe('image/jp2');
    expect(encoded.format).toBe('jpeg2000');

});

test('Test: Jpeg2000RgbaEncoder preserves native monochrome samples for 10-bit source data', async () => {

    var openjpegModule = createFakeOpenJpegModuleForMonochromeSamples();
    var encoder = new Jpeg2000RgbaEncoder({
        openjpegModule
    });

    var frame = new Uint8Array([
        0x00, 0x00,
        0xFF, 0x03,
        0x00, 0x01,
        0xFF, 0x01
    ]);

    var encoded = await encoder.encodeMonochromeSamples(frame, 2, 2, {
        bitsAllocated: 16,
        bitsPerSample: 10,
        isSigned: false,
        littleEndian: true,
        compressionRatio: 1
    });

    expect(encoded.bytes.length).toBeGreaterThan(0);

    var info = openjpegModule.getLastInfo();
    expect(info).toBeDefined();
    expect(info.bitsPerSample).toBe(10);
    expect(info.isSigned).toBe(false);

    var decoded = openjpegModule.getLastDecoded();
    expect(decoded instanceof Int32Array).toBe(true);
    expect(Array.from(decoded)).toEqual([0, 1023, 256, 511]);

});

test('Test: Jpeg2000RgbaEncoder preserves native monochrome sample bytes when OpenJPEG decoded buffer is Uint8Array', async () => {

    var openjpegModule = createFakeOpenJpegModuleForMonochromeSampleBytes();
    var encoder = new Jpeg2000RgbaEncoder({
        openjpegModule
    });

    var frame = new Uint8Array([
        0x00, 0x00,
        0xFF, 0x03,
        0x00, 0x01,
        0xFF, 0x01
    ]);

    var encoded = await encoder.encodeMonochromeSamples(frame, 2, 2, {
        bitsAllocated: 16,
        bitsPerSample: 10,
        isSigned: false,
        littleEndian: true,
        compressionRatio: 1
    });

    expect(encoded.bytes.length).toBeGreaterThan(0);

    var info = openjpegModule.getLastInfo();
    expect(info).toBeDefined();
    expect(info.bitsPerSample).toBe(10);
    expect(info.isSigned).toBe(false);

    var decoded = openjpegModule.getLastDecoded();
    expect(decoded instanceof Uint8Array).toBe(true);
    expect(Array.from(decoded)).toEqual([
        0x00, 0x00,
        0xFF, 0x03,
        0x00, 0x01,
        0xFF, 0x01
    ]);

});
