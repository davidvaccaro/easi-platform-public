import zlib from "node:zlib";
import PngDecoder from "../../../src/codecs/decoders/PngDecoder.js";

test("Test: PngDecoder inflate expands deflated bytes", async () => {

    var source = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    var compressedBuffer = zlib.deflateSync(Buffer.from(source));
    var compressed = new Uint8Array(
        compressedBuffer.buffer,
        compressedBuffer.byteOffset,
        compressedBuffer.byteLength
    );

    var decoder = new PngDecoder();
    var inflated = await decoder.inflate(compressed);

    expect(inflated instanceof Uint8Array).toBe(true);
    expect(Array.from(inflated)).toEqual(Array.from(source));

});

