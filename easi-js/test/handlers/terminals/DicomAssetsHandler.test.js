import DicomAssetsHandler from '../../../src/handlers/terminals/DicomAssetsHandler.js';
import Tag from '../../../src/dicom/Tag.js';
import Attribute from '../../../src/dicom/Attribute.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';
import Constants from '../../../src/dicom/Constants.js';
import EASI from '../../../src/EASI.js';
import Configuration from '../../../src/environment/Configuration.js';
import OpenJpegRuntime from '../../../src/codecs/runtimes/OpenJpegRuntime.js';
import Jpeg2000Decoder from '../../../src/codecs/decoders/Jpeg2000Decoder.js';
import { readFileSync } from 'node:fs';
import { createDicomFixture } from '../../fixtures/dicom/SyntheticDicom.js';

function toUint32LE(value) {
    return new Uint8Array([
        (value & 0xFF),
        ((value >> 8) & 0xFF),
        ((value >> 16) & 0xFF),
        ((value >> 24) & 0xFF)
    ]);
}

function createEncapsulatedPixelDataAttribute(frameOffsets) {
    var tableLength = frameOffsets.length * 4;
    return {
        tag: Tag.PixelData,
        transferSyntax: TransferSyntax.RLELossless,
        valueLength: Constants.UndefinedLength,
        length() {
            return 256;
        },
        indexOf(index, pattern) {
            if (pattern == null)
                return -1;

            // Return BOT item start once when scanning from beginning.
            if ((index <= 0) && (pattern.length == 4) && (pattern[0] == 0xFE) && (pattern[1] == 0xFF))
                return 0;

            return -1;
        },
        peek(start, length) {
            if ((start == 4) && (length == 4)) {
                return toUint32LE(tableLength);
            }

            if ((start >= 8) && (start < (8 + tableLength)) && (length == 4)) {
                var offsetIndex = ((start - 8) / 4);
                return toUint32LE(frameOffsets[offsetIndex]);
            }

            return null;
        }
    };
}

test('Test: DicomAssetsHandler emits onContent and collected content for encapsulated document payload', async () => {

    var contentEvents = [];
    var contentBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

    var handler = new DicomAssetsHandler({
        payload: {
            onContent: (content) => contentEvents.push(content),
            collect: true
        }
    });

    var context = {
        assets: {
            metadata: [],
            frames: [],
            content: [],
            metadataCount: 0,
            framesEmitted: 0,
            contentEmitted: 0,
            instances: []
        }
    };

    var encapsulatedDocumentAttribute = {
        tag: Tag.EncapsulatedDocument,
        access: () => contentBytes,
        transferSyntax: null
    };

    var instance = {
        sopInstanceUid: '1.2.3',
        dataSet: {
            find: (tag) => ((tag.ID == Tag.EncapsulatedDocument.ID) ? encapsulatedDocumentAttribute : null)
        }
    };

    var result = await handler.processInstance(context, instance);

    expect(contentEvents.length).toBe(1);
    expect(contentEvents[0].tag.ID).toBe(Tag.EncapsulatedDocument.ID);
    expect(contentEvents[0].bytes).toBe(contentBytes);
    expect(result.content.length).toBe(1);
    expect(result.content[0].tag.ID).toBe(Tag.EncapsulatedDocument.ID);
    expect(context.assets.contentEmitted).toBe(1);

});

test('Test: DicomAssetsHandler emits onContentChunk without materializing encapsulated document bytes', async () => {

    var contentChunkEvents = [];
    var handler = new DicomAssetsHandler({
        payload: {
            onContentChunk: (contentChunk) => contentChunkEvents.push(contentChunk)
        }
    });

    var context = handler.onStartInstance(null);
    handler.onStartDataSet(context);

    var attribute = new Attribute(
        Tag.EncapsulatedDocument,
        6,
        null,
        TransferSyntax.ExplicitVRLittleEndian
    );

    handler.onStartAttribute(context, attribute);

    await handler.onAttributeChunk(context, {
        attribute,
        chunk: new Uint8Array([1, 2, 3]),
        isFinalChunk: false
    });

    await handler.onAttributeChunk(context, {
        attribute,
        chunk: new Uint8Array([4, 5, 6]),
        isFinalChunk: true
    });

    handler.onEndAttribute(context, attribute);

    expect(contentChunkEvents.length).toBe(2);
    expect(contentChunkEvents[0].offset).toBe(0);
    expect(contentChunkEvents[1].offset).toBe(3);
    expect(contentChunkEvents[0].isFirstChunk).toBe(true);
    expect(contentChunkEvents[1].isFinalChunk).toBe(true);
    expect(attribute.length()).toBe(0);

});

test('Test: DicomAssetsHandler resolves effective frame count from encapsulated offsets', () => {

    var handler = new DicomAssetsHandler();
    var pixelDataAttribute = createEncapsulatedPixelDataAttribute([0, 100]);
    var image = {
        multiFrameModule: {
            numberOfFrames: 10
        }
    };

    var frameCount = handler.resolveEffectiveFrameCount(pixelDataAttribute, image);

    expect(frameCount).toBe(2);

});

test.each([null, new Uint8Array(0)])('Test: DicomAssetsHandler emits an empty final native frame marker at the streamed byte offset', async (finalChunk) => {

    const frameChunks = [];
    const handler = new DicomAssetsHandler({
        payload: {
            mode: 'stream',
            frame: { frames: 'first', decode: 'native', encode: 'none' },
            onFrameChunk: (chunk) => frameChunks.push(chunk)
        }
    });
    const context = handler.onStartInstance(null);
    handler.onStartDataSet(context);
    const attribute = new Attribute(Tag.PixelData, Constants.UndefinedLength, null, TransferSyntax.RLELossless);
    attribute.isBulkStreamed = true;
    handler.onStartAttribute(context, attribute);

    await handler.onAttributeChunk(context, { attribute, chunk: new Uint8Array([1, 2, 3]), isFinalChunk: false });
    await handler.onAttributeChunk(context, { attribute, chunk: new Uint8Array(0), isFinalChunk: false });
    await handler.onAttributeChunk(context, { attribute, chunk: new Uint8Array([4, 5]), isFinalChunk: false });
    await handler.onAttributeChunk(context, { attribute, chunk: finalChunk, isFinalChunk: true });

    expect(frameChunks).toHaveLength(3);
    expect(frameChunks[2]).toEqual(expect.objectContaining({
        index: 0,
        bytes: new Uint8Array(0),
        absoluteOffset: 5,
        frameOffset: 5,
        isFirstChunk: false,
        isFinalChunk: true
    }));
    expect(context.assetsRuntime.payloadStates.get(attribute).bytesSeen).toBe(5);
    expect(context.assets.frameChunksEmitted).toBe(3);
    expect(attribute.length()).toBe(0);

});

test('Test: DicomAssetsHandler preserves an empty content stream completion marker', async () => {

    const chunks = [];
    const handler = new DicomAssetsHandler({ payload: { mode: 'stream', onContentChunk: (chunk) => chunks.push(chunk) } });
    const context = handler.onStartInstance(null);
    handler.onStartDataSet(context);
    const attribute = new Attribute(Tag.EncapsulatedDocument, 3, null, TransferSyntax.ExplicitVRLittleEndian);
    attribute.isBulkStreamed = true;
    handler.onStartAttribute(context, attribute);

    await handler.onAttributeChunk(context, { attribute, chunk: new Uint8Array([1, 2, 3]), isFinalChunk: false });
    await handler.onAttributeChunk(context, { attribute, chunk: new Uint8Array(0), isFinalChunk: true });

    expect(chunks).toHaveLength(2);
    expect(chunks[1]).toEqual(expect.objectContaining({ bytes: new Uint8Array(0), offset: 3, isFirstChunk: false, isFinalChunk: true }));
    expect(attribute.length()).toBe(0);

});

test('Test: DicomAssetsHandler avoids a duplicate completion marker for a frame with known bounds', async () => {

    const chunks = [];
    const handler = new DicomAssetsHandler({
        payload: { mode: 'stream', frame: { decode: 'native', encode: 'none' }, onFrameChunk: (chunk) => chunks.push(chunk) }
    });
    const context = handler.onStartInstance(null);
    const attribute = new Attribute(Tag.PixelData, 3, null, TransferSyntax.ExplicitVRLittleEndian);
    context.assetsRuntime.payloadStates.set(attribute, {
        type: 'frame',
        bytesSeen: 0,
        valueLength: 3,
        frameSize: 3,
        frameCount: 1,
        unsplitMode: false,
        selectedFrameSet: new Set([0])
    });

    await handler.onAttributeChunk(context, { attribute, chunk: new Uint8Array([1, 2, 3]), isFinalChunk: false });
    await handler.onAttributeChunk(context, { attribute, chunk: new Uint8Array(0), isFinalChunk: true });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].isFinalChunk).toBe(true);

});

function sharedCodecState() {
    const registry = Configuration.global.codecRegistry;
    return {
        registry,
        decoderProviders: { ...registry.decoderProviders },
        imageDecoderProviders: { ...registry.imageDecoderProviders },
        encoderProviders: { ...registry.encoderProviders },
        openjpegModule: OpenJpegRuntime.module,
        openjpegFactory: OpenJpegRuntime.factory,
        openjpegModulePromise: OpenJpegRuntime.modulePromise,
        globalOpenjpegModule: globalThis.EASIOpenJPEGModule,
        globalOpenjpegFactory: globalThis.EASIOpenJPEGFactory
    };
}

test.each([
    ['specific transfer-syntax registration', TransferSyntax.ExplicitVRLittleEndian],
    ['configured registry default', TransferSyntax.NONE]
])('Test: asset rendering uses the %s without changing global codecs', async (_name, registeredSyntax) => {
    const globalState = sharedCodecState();
    const fixture = createDicomFixture('default', { rows: 2, columns: 2, frames: 1, pixels: [9, 19, 29, 39] });
    const expectedRgba = new Uint8Array([
        17, 18, 19, 255, 27, 28, 29, 255,
        37, 38, 39, 255, 47, 48, 49, 255
    ]);
    const contexts = [];
    const decode = jest.fn((source, start, stop, destination, destinationStart) => {
        expect(source.subarray(start, stop)).toEqual(fixture.expected.pixelBytes);
        destination.set(expectedRgba, destinationStart * 4);
        return true;
    });
    const registry = EASI.codecRegistryBuilder().withDefaultCodecs().build();
    registry.setDecoderForTransferSyntax(registeredSyntax, image => {
        if (image != null)
            contexts.push(image);
        return { decode };
    });

    const result = await EASI.pipelineBuilder().fromByteStream().ofDicomData().
        withCodecRegistry(registry).
        toAssets({ payload: { frame: { frames: 'first', decode: 'rgba', encode: 'none' }, collect: true } }).
        build().process({ source: fixture.bytes });

    expect(decode).toHaveBeenCalledTimes(1);
    expect(contexts).toHaveLength(1);
    expect(contexts[0].imagePixelModule.rows).toBe(2);
    expect(contexts[0].imagePixelModule.columns).toBe(2);
    expect(contexts[0].attributeSet.value(Tag.SOPInstanceUID)).toBe(fixture.expected.sopInstanceUid);
    expect(result.frames).toHaveLength(1);
    expect(result.frames[0]).toEqual(expect.objectContaining({ width: 2, height: 2, encoding: 'rgba', bytes: expectedRgba }));
    expect(sharedCodecState()).toEqual(globalState);
});

test('Test: asset rendering decodes exact JPEG 2000 pixels through an isolated OpenJPEG registry', async () => {
    const globalState = sharedCodecState();
    const factory = require('@voxelmed/openjpegjs/dist/openjpegwasm.js');
    const wasmBinary = readFileSync(require.resolve('@voxelmed/openjpegjs/dist/openjpegwasm.wasm'));
    const openjpegModule = await factory({ wasmBinary, print() {}, printErr() {} });
    const fixture = createDicomFixture('jpeg2000');
    const registry = EASI.codecRegistryBuilder().withDefaultCodecs().build();
    registry.setDecoderForTransferSyntax(fixture.expected.transferSyntaxUid, image => {
        const decoder = new Jpeg2000Decoder(image);
        decoder.openjpegModule = openjpegModule;
        return decoder;
    });

    const result = await EASI.pipelineBuilder().fromByteStream().ofDicomData().
        withCodecRegistry(registry).
        toAssets({ payload: { frame: { frames: 'first', decode: 'rgba', encode: 'none' }, collect: true } }).
        build().process({ source: fixture.bytes });

    expect(result.frames).toHaveLength(1);
    expect(result.frames[0]).toEqual(expect.objectContaining({
        width: fixture.expected.columns,
        height: fixture.expected.rows,
        encoding: 'rgba',
        bytes: fixture.expected.firstFrameRgba
    }));
    expect(sharedCodecState()).toEqual(globalState);
});
