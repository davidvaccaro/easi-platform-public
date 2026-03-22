import JpegLsDecoder from '../../../src/codecs/decoders/JpegLsDecoder.js';
import JpegLsRuntime from '../../../src/codecs/runtimes/JpegLsRuntime.js';

afterEach(() => {
    JpegLsRuntime.clear();
    delete globalThis.EASIJpegLsModule;
    delete globalThis.EASIJPEGLSModule;
    delete globalThis.EASIJpegLsFactory;
    delete globalThis.EASIJPEGLSFactory;
});

test('Test: JpegLsDecoder uses explicit jpegLsDecoder override', () => {

    var decoder = new JpegLsDecoder();
    decoder.jpegLsDecoder = function ({ destination, destinationStart }) {
        var byteOffset = (destinationStart * 4);
        destination[byteOffset + 0] = 10;
        destination[byteOffset + 1] = 20;
        destination[byteOffset + 2] = 30;
        destination[byteOffset + 3] = 255;
        return true;
    };

    var destination = new Uint8Array(4);
    var success = decoder.decode(new Uint8Array([1, 2, 3, 4]), 0, 4, destination, 0);

    expect(success).toBe(true);
    expect(Array.from(destination)).toEqual([10, 20, 30, 255]);

});

test('Test: JpegLsDecoder resolves runtime module decode surface from JpegLsRuntime', () => {

    JpegLsRuntime.setModule({
        decode: function (source, sourceStart, sourceStop, destination, destinationStart, options) {
            expect(source instanceof Uint8Array).toBe(true);
            expect(sourceStart).toBe(0);
            expect(sourceStop).toBe(4);
            expect(options).toBeDefined();
            var byteOffset = (destinationStart * 4);
            destination[byteOffset + 0] = 11;
            destination[byteOffset + 1] = 22;
            destination[byteOffset + 2] = 33;
            destination[byteOffset + 3] = 255;
            return true;
        }
    });

    var decoder = new JpegLsDecoder();
    decoder.rows = 1;
    decoder.columns = 1;
    decoder.samplesPerPixel = 1;
    decoder.bitsAllocated = 8;
    decoder.bitsStored = 8;
    decoder.pixelRepresentation = 0;
    decoder.planarConfiguration = 0;
    decoder.photometricInterpretation = 'MONOCHROME2';

    var destination = new Uint8Array(4);
    var success = decoder.decode(new Uint8Array([5, 6, 7, 8]), 0, 4, destination, 0);

    expect(success).toBe(true);
    expect(Array.from(destination)).toEqual([11, 22, 33, 255]);

});

test('Test: JpegLsDecoder resolves runtime decoder class surface', () => {

    class FakeRuntimeJpegLsDecoder {
        decode(source, sourceStart, sourceStop, destination, destinationStart) {
            expect(sourceStop).toBe(4);
            var byteOffset = (destinationStart * 4);
            destination[byteOffset + 0] = 44;
            destination[byteOffset + 1] = 55;
            destination[byteOffset + 2] = 66;
            destination[byteOffset + 3] = 255;
            return true;
        }
    }

    JpegLsRuntime.setModule({
        JpegLsDecoder: FakeRuntimeJpegLsDecoder
    });

    var decoder = new JpegLsDecoder();
    var destination = new Uint8Array(4);
    var success = decoder.decode(new Uint8Array([9, 10, 11, 12]), 0, 4, destination, 0);

    expect(success).toBe(true);
    expect(Array.from(destination)).toEqual([44, 55, 66, 255]);

});
