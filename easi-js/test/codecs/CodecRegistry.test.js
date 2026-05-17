import CodecRegistry from '../../src/codecs/CodecRegistry.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import Configuration from '../../src/environment/Configuration.js';
import Jpeg2000Decoder from '../../src/codecs/decoders/Jpeg2000Decoder.js';
import JpegLsDecoder from '../../src/codecs/decoders/JpegLsDecoder.js';
import RleDecoder from '../../src/codecs/decoders/RleDecoder.js';
import Htj2kDecoder from '../../src/codecs/decoders/Htj2kDecoder.js';
import RleRgbaEncoder from '../../src/codecs/encoders/RleRgbaEncoder.js';
import PngDecoder from '../../src/codecs/decoders/PngDecoder.js';
import TiffDecoder from '../../src/codecs/decoders/TiffDecoder.js';
import JpegDecoder from '../../src/codecs/decoders/JpegDecoder.js';

class FakeDecoder {
    constructor(dicomObject) {
        this.dicomObject = dicomObject;
    }

    decode(source, sourceStart, sourceStop, destination, destinationStart) {
        return true;
    }
}

class FakeEncoder {
    encode() {
        return {
            bytes: new Uint8Array(0),
            mimeType: "application/octet-stream",
            format: "fake"
        };
    }
}

class FakeImageDecoder {
    constructor(context) {
        this.context = context;
    }

    decodeImage() {
        return {
            width: 1,
            height: 1,
            bytes: new Uint8Array([0, 0, 0, 255])
        };
    }
}

class InvalidDecoderClass {
    constructor(dicomObject) {
        this.dicomObject = dicomObject;
    }
}

test('Test: CodecRegistry resolves transfer-syntax decoder and fallback decoder', () => {

    var registry = new CodecRegistry();
    registry.setDecoderForTransferSyntax(TransferSyntax.NONE, FakeDecoder);

    var decoder = registry.getDecoderForTransferSyntax(TransferSyntax.NONE, { name: 'dicom-object' });
    expect(decoder instanceof FakeDecoder).toBe(true);
    expect(decoder.dicomObject.name).toBe('dicom-object');

    var fallback = registry.getDecoderForTransferSyntax('1.2.840.10008.1.2.4.50', { name: 'fallback' });
    expect(fallback instanceof FakeDecoder).toBe(true);
    expect(fallback.dicomObject.name).toBe('fallback');

});

test('Test: CodecRegistry registers and resolves format encoders case-insensitively', () => {

    var registry = new CodecRegistry();
    var encoder = { encode: () => ({ bytes: new Uint8Array([1]) }) };

    registry.setEncoder('PNG', encoder);

    expect(registry.hasEncoder('png')).toBe(true);
    expect(registry.hasEncoder('Png')).toBe(true);
    expect(registry.getEncoder('png')).toBe(encoder);

});

test('Test: CodecRegistry resolves constructor and factory codec registrations consistently', () => {

    var registry = new CodecRegistry();

    registry.setDecoderForTransferSyntax(
        TransferSyntax.JPEGBaseline8Bit,
        (context) => new FakeDecoder(context)
    );
    registry.setDecoderForImageFormat("image/png", FakeImageDecoder);
    registry.setEncoder("fake", FakeEncoder);

    var tsDecoder = registry.getDecoderForTransferSyntax(TransferSyntax.JPEGBaseline8Bit, { marker: "x" });
    expect(tsDecoder instanceof FakeDecoder).toBe(true);
    expect(tsDecoder.dicomObject.marker).toBe("x");

    var imageDecoder = registry.getDecoderForImageFormat("png", { scope: "image" });
    expect(imageDecoder instanceof FakeImageDecoder).toBe(true);
    expect(imageDecoder.context.scope).toBe("image");

    var firstEncoder = registry.getEncoder("fake");
    var secondEncoder = registry.getEncoder("fake");
    expect(firstEncoder instanceof FakeEncoder).toBe(true);
    expect(secondEncoder instanceof FakeEncoder).toBe(true);
    expect(firstEncoder === secondEncoder).toBe(false);

});

test('Test: CodecRegistry registers and resolves image decoders by format/media-type case-insensitively', () => {

    var registry = new CodecRegistry();
    registry.setDecoderForImageFormat("PNG", FakeImageDecoder);

    expect(registry.hasDecoderForImageFormat("png")).toBe(true);
    expect(registry.hasDecoderForImageFormat("image/png")).toBe(true);

    var decoder = registry.getDecoderForImageFormat("image/png", { id: "context" });
    expect(decoder instanceof FakeImageDecoder).toBe(true);
    expect(decoder.context.id).toBe("context");

    registry.setDecoderForMediaType("image/tiff", FakeImageDecoder);
    expect(registry.hasDecoderForImageFormat("tif")).toBe(true);
    expect(registry.hasDecoderForMediaType("image/tiff")).toBe(true);

});

test('Test: Configuration seeds default codec registry with png/tiff/jpeg/jpeg2000 encoders', () => {

    var configuration = new Configuration();

    expect(configuration.codecRegistry).toBeDefined();
    expect(configuration.getEncoderFor('png')).toBeDefined();
    expect(configuration.getEncoderFor('tiff')).toBeDefined();
    expect(configuration.getEncoderFor('jpeg')).toBeDefined();
    expect(configuration.getEncoderFor('jpeg2000')).toBeDefined();
    expect(configuration.getEncoderFor('jpeg-2000')).toBeDefined();
    expect(configuration.getEncoderFor('jpeg 2000')).toBeDefined();
    expect(configuration.getEncoderFor('jp2')).toBeDefined();
    expect(configuration.getEncoderFor('j2k')).toBeDefined();

});

test('Test: Configuration seeds default image decoders for JPEG/PNG/TIFF', () => {

    var configuration = new Configuration();

    expect(configuration.getImageDecoderFor('jpeg') instanceof JpegDecoder).toBe(true);
    expect(configuration.getImageDecoderFor('jpg') instanceof JpegDecoder).toBe(true);
    expect(configuration.getImageDecoderFor('image/jpeg') instanceof JpegDecoder).toBe(true);
    expect(configuration.getImageDecoderFor('png') instanceof PngDecoder).toBe(true);
    expect(configuration.getImageDecoderFor('image/png') instanceof PngDecoder).toBe(true);
    expect(configuration.getImageDecoderFor('tiff') instanceof TiffDecoder).toBe(true);
    expect(configuration.getImageDecoderFor('tif') instanceof TiffDecoder).toBe(true);
    expect(configuration.getImageDecoderFor('image/tiff') instanceof TiffDecoder).toBe(true);

});

test('Test: Configuration seeds JPEG2000 transfer-syntax decoders', () => {

    var configuration = new Configuration();

    expect(configuration.getDecoderFor(TransferSyntax.JPEG2000Lossless, null) instanceof Jpeg2000Decoder).toBe(true);
    expect(configuration.getDecoderFor(TransferSyntax.JPEG2000, null) instanceof Jpeg2000Decoder).toBe(true);
    expect(configuration.getDecoderFor(TransferSyntax.JPEG2000MCLossless, null) instanceof Jpeg2000Decoder).toBe(true);
    expect(configuration.getDecoderFor(TransferSyntax.JPEG2000MC, null) instanceof Jpeg2000Decoder).toBe(true);

});

test('Test: Configuration seeds RLE Lossless transfer-syntax decoder', () => {

    var configuration = new Configuration();
    expect(configuration.getDecoderFor(TransferSyntax.RLELossless, null) instanceof RleDecoder).toBe(true);

});

test('Test: Configuration seeds HTJ2K transfer-syntax decoders', () => {

    var configuration = new Configuration();
    expect(configuration.getDecoderFor(TransferSyntax.HTJ2KLossless, null) instanceof Htj2kDecoder).toBe(true);
    expect(configuration.getDecoderFor(TransferSyntax.HTJ2KLosslessRPCL, null) instanceof Htj2kDecoder).toBe(true);
    expect(configuration.getDecoderFor(TransferSyntax.HTJ2K, null) instanceof Htj2kDecoder).toBe(true);

});

test('Test: Configuration seeds JPEG-LS transfer-syntax decoders', () => {

    var configuration = new Configuration();
    expect(configuration.getDecoderFor(TransferSyntax.JPEGLSLossless, null) instanceof JpegLsDecoder).toBe(true);
    expect(configuration.getDecoderFor(TransferSyntax.JPEGLSNearLossless, null) instanceof JpegLsDecoder).toBe(true);

});

test('Test: Configuration seeds HTJ2K encoder aliases', () => {

    var configuration = new Configuration();
    expect(configuration.getEncoderFor('htj2k')).toBeDefined();
    expect(configuration.getEncoderFor('ht-j2k')).toBeDefined();
    expect(configuration.getEncoderFor('jph')).toBeDefined();

});

test('Test: Configuration seeds RLE encoder aliases', () => {

    var configuration = new Configuration();

    expect(configuration.getEncoderFor('rle') instanceof RleRgbaEncoder).toBe(true);
    expect(configuration.getEncoderFor('rle-lossless') instanceof RleRgbaEncoder).toBe(true);
    expect(configuration.getEncoderFor('dicom-rle') instanceof RleRgbaEncoder).toBe(true);

});

test('Test: CodecRegistry validate fails when default decoder is not configured', () => {

    var registry = new CodecRegistry();
    var report = registry.validate();

    expect(report.ok).toBe(false);
    expect(report.errors.find((error) => error.code == "MissingDefaultDecoder")).toBeDefined();

});

test('Test: CodecRegistry assertValid throws when an encoder registration is invalid', () => {

    var registry = new CodecRegistry();
    registry.setDecoderForTransferSyntax(TransferSyntax.NONE, FakeDecoder);
    expect(() => registry.setEncoder('png', {})).toThrow("Invalid encoder registration");

});

test('Test: CodecRegistry throws precise interface error for invalid decoder class registration', () => {

    var registry = new CodecRegistry();

    expect(() => {
        registry.setDecoderForTransferSyntax(TransferSyntax.NONE, InvalidDecoderClass);
    }).toThrow("Invalid transfer-syntax decoder registration. Constructor 'InvalidDecoderClass' is missing required method(s): decode.");

});

test('Test: CodecRegistry validate reports promise-based codec provider violations', () => {

    var registry = new CodecRegistry();
    registry.setDecoderForTransferSyntax(TransferSyntax.NONE, FakeDecoder);
    registry.setDecoderForTransferSyntax("1.2.840.10008.1.2.4.999", () => Promise.resolve(new FakeDecoder(null)));

    var report = registry.validate({
        requireDefaultDecoder: true,
        requiredTransferSyntaxes: ["1.2.840.10008.1.2.4.999"],
        validateProviderFactories: true
    });

    expect(report.ok).toBe(false);
    expect(report.errors.find((error) => error.code == "InvalidDecoderProviderOutput")).toBeDefined();
    expect(report.errors.find((error) => (error.message ?? "").includes("must resolve synchronously"))).toBeDefined();

});

test('Test: CodecRegistry validate reports missing required methods from provider output', () => {

    var registry = new CodecRegistry();
    registry.setDecoderForTransferSyntax(TransferSyntax.NONE, FakeDecoder);
    registry.setEncoder("broken", () => ({ notEncode: true }));

    var report = registry.validate({
        requireDefaultDecoder: true,
        requiredEncoders: ["broken"],
        validateProviderFactories: true
    });

    expect(report.ok).toBe(false);
    expect(report.errors.find((error) => error.code == "InvalidEncoderProviderOutput")).toBeDefined();
    expect(report.errors.find((error) => (error.message ?? "").includes("missing required method(s): encode"))).toBeDefined();

});

test('Test: CodecRegistry runtime resolution errors include precise missing-method details', () => {

    var registry = new CodecRegistry();
    registry.setEncoder("broken", () => ({ foo: "bar" }));

    expect(() => registry.getEncoder("broken")).toThrow(
        "Invalid encoder registration for format 'broken'. Resolved encoder instance is missing required method(s): encode."
    );

});

test('Test: CodecRegistry clone creates independent registration maps', () => {

    var registry = new CodecRegistry();
    registry.setDecoderForTransferSyntax(TransferSyntax.NONE, FakeDecoder);
    registry.setDecoderForImageFormat("png", FakeImageDecoder);
    registry.setEncoder('png', new FakeEncoder());

    var clone = registry.clone();
    clone.setEncoder('jpeg', new FakeEncoder());
    clone.setDecoderForImageFormat("tiff", FakeImageDecoder);

    expect(clone.hasEncoder('jpeg')).toBe(true);
    expect(registry.hasEncoder('jpeg')).toBe(false);
    expect(clone.hasEncoder('png')).toBe(true);
    expect(registry.hasEncoder('png')).toBe(true);
    expect(clone.hasDecoderForImageFormat("tiff")).toBe(true);
    expect(registry.hasDecoderForImageFormat("tiff")).toBe(false);
    expect(clone.hasDecoderForImageFormat("png")).toBe(true);
    expect(registry.hasDecoderForImageFormat("png")).toBe(true);

});

test('Test: Configuration.createDefaultCodecRegistry returns an independent validated default registry', () => {

    var first = Configuration.createDefaultCodecRegistry();
    var second = Configuration.createDefaultCodecRegistry();

    expect(first instanceof CodecRegistry).toBe(true);
    expect(second instanceof CodecRegistry).toBe(true);

    var firstValidation = first.assertValid();
    var secondValidation = second.assertValid();
    expect(firstValidation.ok).toBe(true);
    expect(secondValidation.ok).toBe(true);

    second.setEncoder('custom', new FakeEncoder());
    expect(first.hasEncoder('custom')).toBe(false);
    expect(second.hasEncoder('custom')).toBe(true);

});
