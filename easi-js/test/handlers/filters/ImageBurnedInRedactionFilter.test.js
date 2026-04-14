import ImageBurnedInRedactionFilter from "../../../src/handlers/filters/ImageBurnedInRedactionFilter.js";
import JpegDecoder from "../../../src/codecs/decoders/JpegDecoder.js";
import JpegRgbaEncoder from "../../../src/codecs/encoders/JpegRgbaEncoder.js";
import PngRgbaEncoder from "../../../src/codecs/encoders/PngRgbaEncoder.js";
import TiffRgbaEncoder from "../../../src/codecs/encoders/TiffRgbaEncoder.js";
import PngDecoder from "../../../src/codecs/decoders/PngDecoder.js";
import TiffDecoder from "../../../src/codecs/decoders/TiffDecoder.js";
import Exception from "../../../src/environment/Exception.js";
import { GeneralErrorCodes } from "../../../src/environment/Exception.js";

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

test("Test: ImageBurnedInRedactionFilter redacts JPEG image payload with normalized region coordinates", async () => {

    var width = 12;
    var height = 12;
    var sourceRGBA = buildSolidRGBA(width, height, 255, 255, 255, 255);

    var encoder = new JpegRgbaEncoder();
    var sourceEncoded = encoder.encode(sourceRGBA, width, height, { quality: 0.95 });

    var filter = new ImageBurnedInRedactionFilter({
        onEnd(_context, payload) {
            return payload;
        }
    }, {
        coordinateMode: "normalized",
        regions: [
            { x: 0, y: 0, width: 1, height: 1 }
        ],
        quality: 0.95
    });

    var redactedPayload = await filter.onEnd({}, {
        bytes: sourceEncoded.bytes,
        imageFormat: "jpeg",
        contentType: {
            mediaType: "image/jpeg",
            sourcePath: "/tmp/source.jpg"
        },
        sourcePath: "/tmp/source.jpg"
    });

    expect(redactedPayload?.bytes instanceof Uint8Array).toBe(true);
    expect(redactedPayload.imageFormat).toBe("jpeg");

    var decoder = new JpegDecoder();
    var sourceDecoded = decoder.decodeImage(sourceEncoded.bytes, 0, sourceEncoded.bytes.length);
    var redactedDecoded = decoder.decodeImage(redactedPayload.bytes, 0, redactedPayload.bytes.length);

    var sourceAverage = averageLuma(sourceDecoded.bytes);
    var redactedAverage = averageLuma(redactedDecoded.bytes);

    expect(sourceAverage).toBeGreaterThan(220);
    expect(redactedAverage).toBeLessThan(40);

});

test("Test: ImageBurnedInRedactionFilter redacts PNG image payload with normalized region coordinates", async () => {

    var width = 10;
    var height = 10;
    var sourceRGBA = buildSolidRGBA(width, height, 255, 255, 255, 255);

    var encoder = new PngRgbaEncoder();
    var sourceEncoded = encoder.encode(sourceRGBA, width, height);

    var filter = new ImageBurnedInRedactionFilter({
        onEnd(_context, payload) {
            return payload;
        }
    }, {
        coordinateMode: "normalized",
        regions: [{ x: 0, y: 0, width: 1, height: 1 }]
    });

    var redactedPayload = await filter.onEnd({}, {
        bytes: sourceEncoded.bytes,
        imageFormat: "png",
        contentType: {
            mediaType: "image/png",
            sourcePath: "/tmp/source.png"
        }
    });

    expect(redactedPayload?.bytes instanceof Uint8Array).toBe(true);
    expect(redactedPayload.imageFormat).toBe("png");

    var decoder = new PngDecoder();
    var sourceDecoded = await decoder.decodeImage(sourceEncoded.bytes, 0, sourceEncoded.bytes.length);
    var redactedDecoded = await decoder.decodeImage(redactedPayload.bytes, 0, redactedPayload.bytes.length);

    expect(averageLuma(sourceDecoded.bytes)).toBeGreaterThan(220);
    expect(averageLuma(redactedDecoded.bytes)).toBeLessThan(20);

});

test("Test: ImageBurnedInRedactionFilter redacts TIFF image payload with normalized region coordinates", async () => {

    var width = 10;
    var height = 10;
    var sourceRGBA = buildSolidRGBA(width, height, 255, 255, 255, 255);

    var encoder = new TiffRgbaEncoder();
    var sourceEncoded = encoder.encode(sourceRGBA, width, height);

    var filter = new ImageBurnedInRedactionFilter({
        onEnd(_context, payload) {
            return payload;
        }
    }, {
        coordinateMode: "normalized",
        regions: [{ x: 0, y: 0, width: 1, height: 1 }]
    });

    var redactedPayload = await filter.onEnd({}, {
        bytes: sourceEncoded.bytes,
        imageFormat: "tiff",
        contentType: {
            mediaType: "image/tiff",
            sourcePath: "/tmp/source.tiff"
        }
    });

    expect(redactedPayload?.bytes instanceof Uint8Array).toBe(true);
    expect(redactedPayload.imageFormat).toBe("tiff");

    var decoder = new TiffDecoder();
    var sourceDecoded = decoder.decodeImage(sourceEncoded.bytes, 0, sourceEncoded.bytes.length);
    var redactedDecoded = decoder.decodeImage(redactedPayload.bytes, 0, redactedPayload.bytes.length);

    expect(averageLuma(sourceDecoded.bytes)).toBeGreaterThan(220);
    expect(averageLuma(redactedDecoded.bytes)).toBeLessThan(20);

});

test("Test: ImageBurnedInRedactionFilter rejects unsupported source format", async () => {

    var filter = new ImageBurnedInRedactionFilter({
        onEnd(_context, payload) {
            return payload;
        }
    }, {
        regions: [{ x: 0, y: 0, width: 1, height: 1 }]
    });

    var error = null;
    try {
        await filter.onEnd({}, {
            bytes: new Uint8Array([0x47, 0x49, 0x46, 0x38]),
            imageFormat: "gif",
            contentType: {
                mediaType: "image/gif"
            }
        });
    }
    catch (ex) {
        error = ex;
    }

    expect(error instanceof Exception).toBe(true);
    expect(error.code).toBe(GeneralErrorCodes.NotImplemented);

});
