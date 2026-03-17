import CodecRegistry from '../../src/codecs/CodecRegistry.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import Configuration from '../../src/environment/Configuration.js';
import Jpeg2000Decoder from '../../src/codecs/decoders/Jpeg2000Decoder.js';
import RleDecoder from '../../src/codecs/decoders/RleDecoder.js';
import Htj2kDecoder from '../../src/codecs/decoders/Htj2kDecoder.js';
import RleRgbaEncoder from '../../src/codecs/encoders/RleRgbaEncoder.js';

class FakeDecoder {
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
