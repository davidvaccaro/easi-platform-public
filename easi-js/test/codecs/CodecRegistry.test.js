import CodecRegistry from '../../src/codecs/CodecRegistry.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import Configuration from '../../src/environment/Configuration.js';

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

test('Test: Configuration seeds default codec registry with png/tiff/jpeg encoders', () => {

    var configuration = new Configuration();

    expect(configuration.codecRegistry).toBeDefined();
    expect(configuration.getEncoderFor('png')).toBeDefined();
    expect(configuration.getEncoderFor('tiff')).toBeDefined();
    expect(configuration.getEncoderFor('jpeg')).toBeDefined();

});
