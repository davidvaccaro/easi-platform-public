import EASI from '../../src/EASI.js';
import DicomToFHIRImagingStudyMapping from '../../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js';
import JpegDecoder from '../../src/codecs/decoders/JpegDecoder.js';
import Tag from '../../src/dicom/Tag.js';

const path = require('path');
const fs = require('fs');

function readDicomBytes(name = '0002.DCM') {
    var brightDicomRoot = process.cwd().split('easi-js')[0];
    return fs.readFileSync(path.join(brightDicomRoot, '/data/dicoms/' + name));
}

test('Test: toAssets metadata mapping emits mapped model via onMetadata and result metadata', async () => {

    var metadataEvents = [];
    var result = await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toAssets({
            metadata: {
                mapping: new DicomToFHIRImagingStudyMapping(),
                onMetadata: (metadata) => metadataEvents.push(metadata),
                collect: true
            }
        })
        .build()
        .process(readDicomBytes('0002.DCM'));

    expect(metadataEvents.length).toBe(1);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.resourceType).toBe('ImagingStudy');

});

test('Test: toAssets payload frame emits PNG bytes for first frame', async () => {

    var frameEvents = [];

    var result = await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toAssets({
            payload: {
                frame: {
                    frames: 'first',
                    decode: 'rgba',
                    encode: 'png'
                },
                onFrame: (frame) => frameEvents.push(frame),
                collect: true
            }
        })
        .build()
        .process(readDicomBytes('0002.DCM'));

    expect(frameEvents.length).toBe(1);
    expect(result.frames.length).toBe(1);
    expect(result.frames[0].mimeType).toBe('image/png');
    expect(result.frames[0].bytes[0]).toBe(137);
    expect(result.frames[0].bytes[1]).toBe(80);
    expect(result.frames[0].bytes[2]).toBe(78);
    expect(result.frames[0].bytes[3]).toBe(71);

});

test('Test: toAssets payload frame emits TIFF bytes for first frame', async () => {

    var frameEvents = [];

    var result = await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toAssets({
            payload: {
                frame: {
                    frames: 'first',
                    decode: 'rgba',
                    encode: 'tiff'
                },
                onFrame: (frame) => frameEvents.push(frame),
                collect: true
            }
        })
        .build()
        .process(readDicomBytes('0002.DCM'));

    expect(frameEvents.length).toBe(1);
    expect(result.frames.length).toBe(1);
    expect(result.frames[0].mimeType).toBe('image/tiff');
    expect(String.fromCharCode(result.frames[0].bytes[0], result.frames[0].bytes[1])).toBe('II');
    expect(result.frames[0].bytes[2]).toBe(42);
    expect(result.frames[0].bytes[3]).toBe(0);

});

test('Test: toAssets payload frame emits JPEG bytes for first frame', async () => {

    var frameEvents = [];

    var result = await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toAssets({
            payload: {
                frame: {
                    frames: 'first',
                    decode: 'rgba',
                    encode: 'jpeg',
                    quality: 0.9
                },
                onFrame: (frame) => frameEvents.push(frame),
                collect: true
            }
        })
        .build()
        .process(readDicomBytes('0002.DCM'));

    expect(frameEvents.length).toBe(1);
    expect(result.frames.length).toBe(1);
    expect(result.frames[0].mimeType).toBe('image/jpeg');
    expect(result.frames[0].bytes[0]).toBe(255);
    expect(result.frames[0].bytes[1]).toBe(216);
    expect(result.frames[0].bytes[result.frames[0].bytes.length - 2]).toBe(255);
    expect(result.frames[0].bytes[result.frames[0].bytes.length - 1]).toBe(217);

    var destination = new Uint8Array(result.frames[0].width * result.frames[0].height * 4);
    var decodeResult = new JpegDecoder().decode(
        result.frames[0].bytes,
        0,
        result.frames[0].bytes.length,
        destination,
        0
    );

    expect(decodeResult).toBe(true);

});

test('Test: toAssets still decodes frame payload when parser bulk-data policy streams PixelData', async () => {

    var frameEvents = [];

    var result = await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .withBulkDataPolicy({
            mode: 'auto',
            knownLengthThreshold: 1024,
            hardSafetyCap: (64 * 1024 * 1024)
        })
        .toAssets({
            payload: {
                frame: {
                    frames: 'first',
                    decode: 'rgba',
                    encode: 'png'
                },
                onFrame: (frame) => frameEvents.push(frame),
                collect: true
            }
        })
        .build()
        .process(readDicomBytes('0002.DCM'));

    expect(frameEvents.length).toBe(1);
    expect(result.frames.length).toBe(1);
    expect(result.frames[0].mimeType).toBe('image/png');
    expect(result.frames[0].bytes.length).toBeGreaterThan(0);

});

test('Test: toAssets can emit native frame chunks without materializing PixelData bytes', async () => {

    var frameChunkEvents = [];
    var pixelDataMaterializedLengths = [];

    await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .withBulkDataPolicy({
            mode: 'stream',
            knownLengthThreshold: 1,
            hardSafetyCap: (64 * 1024 * 1024)
        })
        .toAssets({
            payload: {
                mode: 'stream',
                frame: {
                    frames: 'first',
                    decode: 'native',
                    encode: 'none'
                },
                onFrameChunk: (frameChunk, scope) => {
                    frameChunkEvents.push(frameChunk);
                    var pixelData = scope?.instance?.dataSet?.find(Tag.PixelData);
                    pixelDataMaterializedLengths.push(pixelData?.length?.() ?? -1);
                }
            }
        })
        .build()
        .process(readDicomBytes('0002.DCM'));

    expect(frameChunkEvents.length).toBeGreaterThan(0);
    expect(frameChunkEvents[0].encoding).toBe('native');
    expect(frameChunkEvents.some((chunk) => chunk.isFinalChunk == true)).toBe(true);
    expect(pixelDataMaterializedLengths.every((length) => length == 0)).toBe(true);

});

test('Test: toAssets payload mode materialize prefers end-of-instance frame emission over chunk callbacks', async () => {

    var frameEvents = [];
    var frameChunkEvents = [];
    var pixelDataMaterializedLengths = [];

    await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .withBulkDataPolicy({
            mode: 'stream',
            knownLengthThreshold: 1,
            hardSafetyCap: (64 * 1024 * 1024)
        })
        .toAssets({
            payload: {
                mode: 'materialize',
                frame: {
                    frames: 'first',
                    decode: 'native',
                    encode: 'none'
                },
                onFrame: (frame, scope) => {
                    frameEvents.push(frame);
                    var pixelData = scope?.instance?.dataSet?.find(Tag.PixelData);
                    pixelDataMaterializedLengths.push(pixelData?.length?.() ?? -1);
                },
                onFrameChunk: (frameChunk) => frameChunkEvents.push(frameChunk),
                collect: false
            }
        })
        .build()
        .process(readDicomBytes('0002.DCM'));

    expect(frameEvents.length).toBe(1);
    expect(frameChunkEvents.length).toBe(0);
    expect(pixelDataMaterializedLengths.every((length) => length > 0)).toBe(true);

});
