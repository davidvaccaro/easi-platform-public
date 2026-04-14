import TiffDecoder from "../../../src/codecs/decoders/TiffDecoder.js";

test("Test: TiffDecoder readValues supports RATIONAL and UNDEFINED field types", () => {

    var decoder = new TiffDecoder();

    var rationalBytes = new Uint8Array(8);
    var rationalView = new DataView(rationalBytes.buffer, rationalBytes.byteOffset, rationalBytes.byteLength);
    rationalView.setUint32(0, 300, true);
    rationalView.setUint32(4, 100, true);

    var rationalValues = decoder.readValues(rationalBytes, rationalView, 5, 1, 0, true);
    expect(rationalValues).toEqual([3]);

    var undefinedBytes = new Uint8Array([11, 22, 33, 44, 55, 66]);
    var undefinedView = new DataView(undefinedBytes.buffer, undefinedBytes.byteOffset, undefinedBytes.byteLength);
    var undefinedValues = decoder.readValues(undefinedBytes, undefinedView, 7, 6, 0, true);
    expect(undefinedValues).toEqual([11, 22, 33, 44, 55, 66]);

});

test("Test: TiffDecoder readValues ignores unsupported field types", () => {

    var decoder = new TiffDecoder();
    var bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(() => decoder.readValues(bytes, view, 11, 1, 0, true)).not.toThrow();
    expect(decoder.readValues(bytes, view, 11, 1, 0, true)).toEqual([]);

});

