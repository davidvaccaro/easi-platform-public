import Jpeg2000Decoder from '../../../src/codecs/decoders/Jpeg2000Decoder.js';
import OpenJpegRuntime from '../../../src/codecs/runtimes/OpenJpegRuntime.js';

function createFakeOpenJpegModule() {

    class J2KDecoder {
        getEncodedBuffer(length) {
            this.encoded = new Uint8Array(length);
            return this.encoded;
        }

        decode() {
        }

        getFrameInfo() {
            return {
                width: 2,
                height: 1,
                bitsPerSample: 8,
                componentCount: 3,
                isSigned: false
            };
        }

        getDecodedBuffer() {
            return new Uint8Array([
                10, 20, 30,
                40, 50, 60
            ]);
        }
    }

    return { J2KDecoder };

}

afterEach(() => {
    OpenJpegRuntime.clear();
});

test('Test: Jpeg2000Decoder decodes codestream bytes to RGBA', () => {

    var openjpeg = createFakeOpenJpegModule();
    var decoder = new Jpeg2000Decoder();
    decoder.openjpegModule = openjpeg;

    var source = new Uint8Array([0xFF, 0x4F, 0x01, 0x02, 0x03, 0xFF, 0xD9]);
    var destination = new Uint8Array(8);

    var success = decoder.decode(source, 0, source.length, destination, 0);
    expect(success).toBe(true);

    expect(Array.from(destination)).toEqual([
        10, 20, 30, 255,
        40, 50, 60, 255
    ]);

});
