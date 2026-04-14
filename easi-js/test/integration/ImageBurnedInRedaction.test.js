import EASI from "../../src/EASI.js";
import JpegRgbaEncoder from "../../src/codecs/encoders/JpegRgbaEncoder.js";
import PngRgbaEncoder from "../../src/codecs/encoders/PngRgbaEncoder.js";
import TiffRgbaEncoder from "../../src/codecs/encoders/TiffRgbaEncoder.js";
import JpegDecoder from "../../src/codecs/decoders/JpegDecoder.js";
import PngDecoder from "../../src/codecs/decoders/PngDecoder.js";
import TiffDecoder from "../../src/codecs/decoders/TiffDecoder.js";

function buildSolidRGBA(width, height, red = 255, green = 255, blue = 255, alpha = 255) {
    var rgba = new Uint8Array(width * height * 4);
    for (var i = 0; i < rgba.length; i += 4) {
        rgba[i] = red;
        rgba[i + 1] = green;
        rgba[i + 2] = blue;
        rgba[i + 3] = alpha;
    }
    return rgba;
}

function averageLuma(rgba) {
    if ((rgba == null) || (rgba.length == 0))
        return 0;

    var total = 0;
    var pixelCount = Math.floor(rgba.length / 4);
    for (var i = 0; i < rgba.length; i += 4) {
        total += ((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3);
    }
    return (pixelCount > 0) ? (total / pixelCount) : 0;
}

test("Test: withBurnedInRedaction redacts non-DICOM JPEG image routes", async () => {

    var width = 16;
    var height = 16;
    var sourceRGBA = buildSolidRGBA(width, height, 255, 255, 255, 255);

    var sourceEncoded = new JpegRgbaEncoder().encode(sourceRGBA, width, height, { quality: 0.95 });

    var resultCollection = await EASI.pipelineBuilder().
    fromByteStream().
    ofImageData().
    withBurnedInRedaction({
        coordinateMode: "normalized",
        regions: [{ x: 0, y: 0, width: 1, height: 1 }],
        quality: 0.95
    }).
    toImageData().
    build().
    process(sourceEncoded.bytes);

    var result = (typeof resultCollection?.first == "function")
        ? resultCollection.first()
        : resultCollection;

    expect(result?.kind).toBe("image");
    expect(result?.format).toBe("jpeg");
    expect(result?.bytes instanceof Uint8Array).toBe(true);

    var decoder = new JpegDecoder();
    var sourceDecoded = decoder.decodeImage(sourceEncoded.bytes, 0, sourceEncoded.bytes.length);
    var redactedDecoded = decoder.decodeImage(result.bytes, 0, result.bytes.length);

    expect(averageLuma(sourceDecoded.bytes)).toBeGreaterThan(220);
    expect(averageLuma(redactedDecoded.bytes)).toBeLessThan(45);

});

test("Test: withBurnedInRedaction redacts non-DICOM PNG image routes", async () => {

    var width = 14;
    var height = 14;
    var sourceRGBA = buildSolidRGBA(width, height, 255, 255, 255, 255);

    var sourceEncoded = new PngRgbaEncoder().encode(sourceRGBA, width, height);

    var resultCollection = await EASI.pipelineBuilder().
    fromByteStream().
    ofImageData().
    withBurnedInRedaction({
        coordinateMode: "normalized",
        regions: [{ x: 0, y: 0, width: 1, height: 1 }]
    }).
    toImageData().
    build().
    process(sourceEncoded.bytes);

    var result = (typeof resultCollection?.first == "function")
        ? resultCollection.first()
        : resultCollection;

    expect(result?.kind).toBe("image");
    expect(result?.format).toBe("png");
    expect(result?.bytes instanceof Uint8Array).toBe(true);

    var decoder = new PngDecoder();
    var sourceDecoded = await decoder.decodeImage(sourceEncoded.bytes, 0, sourceEncoded.bytes.length);
    var redactedDecoded = await decoder.decodeImage(result.bytes, 0, result.bytes.length);

    expect(averageLuma(sourceDecoded.bytes)).toBeGreaterThan(220);
    expect(averageLuma(redactedDecoded.bytes)).toBeLessThan(20);

});

test("Test: withBurnedInRedaction redacts non-DICOM TIFF image routes", async () => {

    var width = 14;
    var height = 14;
    var sourceRGBA = buildSolidRGBA(width, height, 255, 255, 255, 255);

    var sourceEncoded = new TiffRgbaEncoder().encode(sourceRGBA, width, height);

    var resultCollection = await EASI.pipelineBuilder().
    fromByteStream().
    ofImageData().
    withBurnedInRedaction({
        coordinateMode: "normalized",
        regions: [{ x: 0, y: 0, width: 1, height: 1 }]
    }).
    toImageData().
    build().
    process(sourceEncoded.bytes);

    var result = (typeof resultCollection?.first == "function")
        ? resultCollection.first()
        : resultCollection;

    expect(result?.kind).toBe("image");
    expect(result?.format).toBe("tiff");
    expect(result?.bytes instanceof Uint8Array).toBe(true);

    var decoder = new TiffDecoder();
    var sourceDecoded = decoder.decodeImage(sourceEncoded.bytes, 0, sourceEncoded.bytes.length);
    var redactedDecoded = decoder.decodeImage(result.bytes, 0, result.bytes.length);

    expect(averageLuma(sourceDecoded.bytes)).toBeGreaterThan(220);
    expect(averageLuma(redactedDecoded.bytes)).toBeLessThan(20);

});
