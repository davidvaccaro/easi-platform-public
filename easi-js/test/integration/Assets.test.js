import EASI from '../../src/EASI.js';
import DicomToFHIRImagingStudyMapping from '../../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js';
import jpegDecoder from '../../src/codecs/decoders/jpegDecoder.js';

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
    var decodeResult = new jpegDecoder().decode(
        result.frames[0].bytes,
        0,
        result.frames[0].bytes.length,
        destination,
        0
    );

    expect(decodeResult).toBe(true);

});
