import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import { createDicomFixture } from '../fixtures/dicom/SyntheticDicom.js';

const formats = [
    ['unsigned monochrome 16-bit', { bitsAllocated: 16, bitsStored: 12, pixels: [0, 0x0123, 2048, 4095] }],
    ['signed monochrome 16-bit', { bitsAllocated: 16, bitsStored: 12, pixelRepresentation: 1, pixels: [-2048, -1, 0, 2047] }],
    ['RGB 16-bit', { bitsAllocated: 16, bitsStored: 12, samplesPerPixel: 3, photometricInterpretation: 'RGB', pixels: [0, 1, 2, 0x0123, 0x0456, 0x0789, 2048, 3000, 4095, 17, 34, 51] }],
    ['planar RGB 16-bit', { bitsAllocated: 16, bitsStored: 12, samplesPerPixel: 3, planarConfiguration: 1, photometricInterpretation: 'RGB', pixels: [0, 0x0123, 2048, 4095, 1, 0x0456, 3000, 17, 2, 0x0789, 4095, 34] }],
    ['monochrome 8-bit', { bitsAllocated: 8, bitsStored: 8, pixels: [0, 64, 128, 255] }],
    ['RGB 8-bit', { bitsAllocated: 8, bitsStored: 8, samplesPerPixel: 3, photometricInterpretation: 'RGB', pixels: [0, 1, 2, 64, 65, 66, 128, 129, 130, 253, 254, 255] }],
    ['multiple signed frames', { frames: 2, bitsAllocated: 16, bitsStored: 12, pixelRepresentation: 1, pixels: [-2048, -1, 0, 2047, -1024, 0x0123, -17, 1024] }]
];

function chunkSource(bytes, chunkLength) {
    let offset = 0;
    return {
        async read() {
            if (offset >= bytes.length) return { done: true };
            const value = bytes.subarray(offset, offset + chunkLength);
            offset += value.length;
            return { done: false, value };
        },
        releaseLock() {}
    };
}

function littleEndianPixels(expected) {
    if (expected.bitsAllocated === 8) return new Uint8Array(expected.pixels);
    const bytes = new Uint8Array(expected.pixels.length * 2);
    const view = new DataView(bytes.buffer);
    expected.pixels.forEach((pixel, index) => view.setUint16(index * 2, pixel & 0xFFFF, true));
    return bytes;
}

const inputModes = [
    ['whole buffer', null, 'materialize'],
    ['one-byte chunks with streamed pixels', 1, { mode: 'auto', knownLengthThreshold: 0 }],
    ['seven-byte chunks', 7, 'materialize']
];

describe.each(inputModes)('native BE to LE through %s', (_mode, chunkLength, bulkMode) => {
    test.each(formats)('preserves exact %s samples and numeric metadata', async (_format, overrides) => {
        const fixture = createDicomFixture('explicit-be', overrides);
        const originalBytes = fixture.bytes.slice();
        const concerns = [];
        const bytes = await EASI.pipelineBuilder().fromPartStream().ofDicomData({ includePart10Header: true }).
            withBulkDataPolicy(bulkMode).
            withTranscoding({ targetTransferSyntax: TransferSyntax.ExplicitVRLittleEndian.ID, onConcern: concern => concerns.push(concern) }).
            toDicomData().build().process({ source: chunkLength ? chunkSource(fixture.bytes, chunkLength) : fixture.bytes });
        const instance = await EASI.pipelineBuilder().fromByteStream().ofDicomData({ includePart10Header: true }).
            toInstances().build().process({ source: bytes });
        expect(concerns).toEqual([]);
        expect(fixture.bytes).toEqual(originalBytes);
        expect(instance.metaSet.transferSyntaxUID.ID).toBe(TransferSyntax.ExplicitVRLittleEndian.ID);
        for (const [tag, value] of [
            [Tag.Rows, fixture.expected.rows], [Tag.Columns, fixture.expected.columns],
            [Tag.BitsAllocated, fixture.expected.bitsAllocated], [Tag.BitsStored, fixture.expected.bitsStored],
            [Tag.HighBit, fixture.expected.highBit], [Tag.PixelRepresentation, fixture.expected.pixelRepresentation],
            [Tag.SamplesPerPixel, overrides.samplesPerPixel ?? 1]
        ]) expect(instance.dataSet.value(tag)).toBe(value);
        expect(Number(instance.dataSet.value(Tag.NumberOfFrames))).toBe(fixture.expected.frames);
        expect(instance.dataSet.value(Tag.PatientName)).toBe(fixture.expected.patientName);
        expect(instance.dataSet.value(Tag.SOPInstanceUID)).toBe(fixture.expected.sopInstanceUid);
        expect(instance.dataSet.value(Tag.PhotometricInterpretation)).toBe(fixture.expected.photometricInterpretation);
        if (overrides.samplesPerPixel === 3) expect(instance.dataSet.value(Tag.PlanarConfiguration)).toBe(overrides.planarConfiguration ?? 0);
        expect(instance.dataSet.find(Tag.Rows).access()).toEqual(new Uint8Array([2, 0]));
        expect(instance.dataSet.find(Tag.PixelData).access()).toEqual(littleEndianPixels(fixture.expected));
    });
});

test('BE to LE preserves all values in numeric metadata and swaps AT components independently', async () => {
    // Explicit private VRs avoid relying on dictionary scalar-value interpretation.
    const vectors = [
        ['00111010', 'US', [0x01, 0x23, 0x04, 0x56], [0x23, 0x01, 0x56, 0x04]],
        ['00111011', 'SS', [0xFF, 0xFF, 0xF8, 0x00], [0xFF, 0xFF, 0x00, 0xF8]],
        ['00111012', 'UL', [1, 2, 3, 4, 0x11, 0x22, 0x33, 0x44], [4, 3, 2, 1, 0x44, 0x33, 0x22, 0x11]],
        ['00111013', 'AT', [0x00, 0x28, 0x00, 0x10, 0x00, 0x28, 0x00, 0x11], [0x28, 0x00, 0x10, 0x00, 0x28, 0x00, 0x11, 0x00]],
        ['00111014', 'FD', [0x3F, 0xF8, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0xF8, 0x3F]]
    ];
    const fixture = createDicomFixture('explicit-be', { extraElements: vectors.map(([tag, vr, bytes]) => [tag, vr, new Uint8Array(bytes)]) });
    const bytes = await EASI.pipelineBuilder().fromPartStream().ofDicomData({ includePart10Header: true }).
        withTranscoding({ targetTransferSyntax: TransferSyntax.ExplicitVRLittleEndian.ID }).toDicomData().build().
        process({ source: chunkSource(fixture.bytes, 1) });
    const instance = await EASI.pipelineBuilder().fromByteStream().ofDicomData({ includePart10Header: true }).
        toInstances().build().process({ source: bytes });
    for (const [tag, vr, _source, expected] of vectors) {
        const attribute = instance.dataSet.find(Tag.find(tag));
        expect(attribute.vr.ID).toBe(vr);
        expect(attribute.access()).toEqual(new Uint8Array(expected));
    }
});

test('LE to BE remains explicitly unsupported rather than silently rewriting native pixels', async () => {
    const concerns = [];
    const pipeline = EASI.pipelineBuilder().fromByteStream().ofDicomData({ includePart10Header: true }).
        withTranscoding({ targetTransferSyntax: TransferSyntax.ExplicitVRBigEndian.ID, onConcern: concern => concerns.push(concern) }).
        toDicomData().build();
    await expect(pipeline.process({ source: createDicomFixture('unsigned-16').bytes })).rejects.toThrow();
    expect(concerns).toEqual([expect.objectContaining({ code: 'UnsupportedTransferSyntaxPair', actionTaken: 'failed' })]);
});
