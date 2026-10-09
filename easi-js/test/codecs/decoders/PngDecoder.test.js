import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
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

function browserDecoder(globals = {}) {
    const source = fs.readFileSync(path.join(__dirname, "../../../src/codecs/decoders/PngDecoder.js"), "utf8");
    const sandbox = { module: { exports: {} }, Uint8Array, ...globals };
    vm.runInNewContext(source.replace("export default class", "class") + "\nmodule.exports = PngDecoder;", sandbox);
    return new sandbox.module.exports();
}

test("PngDecoder uses browser decompression even when a process shim exists", async () => {
    const requireNodeModule = jest.fn(() => { throw new Error("Node modules must not load in the browser"); });
    const decoder = browserDecoder({
        process: { versions: {} }, require: requireNodeModule,
        DecompressionStream, Response, Blob
    });
    const expected = new Uint8Array([1, 4, 16, 64, 255]);
    const bytes = new Uint8Array(zlib.deflateSync(expected));
    expect(Array.from(await decoder.inflate(bytes))).toEqual(Array.from(expected));
    expect(requireNodeModule).not.toHaveBeenCalled();
});

test("PngDecoder reports an unavailable runtime without trying Node modules in browsers", async () => {
    const requireNodeModule = jest.fn();
    const decoder = browserDecoder({ process: {}, require: requireNodeModule });
    await expect(decoder.inflate(new Uint8Array())).rejects.toThrow("ZLIB inflation is not available");
    expect(requireNodeModule).not.toHaveBeenCalled();
});

