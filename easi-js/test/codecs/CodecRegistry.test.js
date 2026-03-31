import CodecRegistry from '../../src/codecs/CodecRegistry.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import Configuration from '../../src/environment/Configuration.js';
import Jpeg2000Decoder from '../../src/codecs/decoders/Jpeg2000Decoder.js';
import JpegLsDecoder from '../../src/codecs/decoders/JpegLsDecoder.js';
import RleDecoder from '../../src/codecs/decoders/RleDecoder.js';
import Htj2kDecoder from '../../src/codecs/decoders/Htj2kDecoder.js';
import RleRgbaEncoder from '../../src/codecs/encoders/RleRgbaEncoder.js';

class FakeDecoder {
    constructor(dicomObject) {
        this.dicomObject = dicomObject;
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
    registry.setEncoder('png', {});

    expect(() => registry.assertValid()).toThrow("CodecRegistry validation failed");

});

test('Test: CodecRegistry clone creates independent registration maps', () => {

    var registry = new CodecRegistry();
    registry.setDecoderForTransferSyntax(TransferSyntax.NONE, FakeDecoder);
    registry.setEncoder('png', new FakeEncoder());

    var clone = registry.clone();
    clone.setEncoder('jpeg', new FakeEncoder());

    expect(clone.hasEncoder('jpeg')).toBe(true);
    expect(registry.hasEncoder('jpeg')).toBe(false);
    expect(clone.hasEncoder('png')).toBe(true);
    expect(registry.hasEncoder('png')).toBe(true);

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
