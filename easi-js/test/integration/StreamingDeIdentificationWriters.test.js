import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import DicomDataWriterHandler from '../../src/handlers/terminals/DicomDataWriterHandler.js';
import DicomDeIdentificationFilter from '../../src/handlers/filters/DicomDeIdentificationFilter.js';

const fs = require('fs');
const path = require('path');
const stream = require('stream');

const LongExplicitVRs = new Set(['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'SQ', 'UC', 'UR', 'UT', 'UN']);
const BinaryPadVRs = new Set(['OB', 'OD', 'OF', 'OL', 'OV', 'OW', 'UN', 'AT', 'US', 'SS', 'UL', 'SL', 'FL', 'FD', 'UV', 'SV']);

function toUint16LE(value) {
    const bytes = new Uint8Array(2);
    (new DataView(bytes.buffer)).setUint16(0, Number(value), true);
    return bytes;
}

function toUint32LE(value) {
    const bytes = new Uint8Array(4);
    (new DataView(bytes.buffer)).setUint32(0, Number(value), true);
    return bytes;
}

function toTextBytes(value) {
    return (new TextEncoder()).encode(String(value));
}

function padEven(bytes, vr) {

    if ((bytes.length % 2) == 0)
        return bytes;

    var padded = new Uint8Array(bytes.length + 1);
    padded.set(bytes, 0);
    padded[padded.length - 1] = (vr == 'UI' || BinaryPadVRs.has(vr)) ? 0x00 : 0x20;

    return padded;

}

function concatBytes(chunks) {

    var totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    var result = new Uint8Array(totalLength);
    var offset = 0;

    for (var i = 0; i < chunks.length; i++) {
        result.set(chunks[i], offset);
        offset += chunks[i].length;
    }

    return result;

}

function writeOutputBytes(outputDirectory, fileName, bytes) {

    var outputPath = path.join(outputDirectory, fileName);
    fs.writeFileSync(outputPath, Buffer.from(bytes));
    return outputPath;

}

function resolveEasiJsRoot() {

    var marker = `${path.sep}easi-js`;
    var cwd = process.cwd();
    var markerIndex = cwd.lastIndexOf(marker);

    if (markerIndex > -1)
        return cwd.substring(0, markerIndex + marker.length);

    return cwd;

}

function explicitElement(group, element, vr, valueBytes) {

    var bytes = padEven(valueBytes, vr);
    var usesLongHeader = LongExplicitVRs.has(vr);
    var headerLength = usesLongHeader ? 12 : 8;
    var result = new Uint8Array(headerLength + bytes.length);
    var view = new DataView(result.buffer);

    view.setUint16(0, group, true);
    view.setUint16(2, element, true);
    result[4] = vr.charCodeAt(0);
    result[5] = vr.charCodeAt(1);

    if (usesLongHeader == true) {
        result[6] = 0;
        result[7] = 0;
        view.setUint32(8, bytes.length, true);
        result.set(bytes, 12);
    }
    else {
        view.setUint16(6, bytes.length, true);
        result.set(bytes, 8);
    }

    return result;

}

function expectedFramePixel(frameIndex, x, y) {
    return ((frameIndex * 17) + (x * 3) + (y * 5) + 29) & 0xFF;
}

function createBurnedPixelData(rows, columns, frameCount) {

    var frameSize = (rows * columns);
    var bytes = new Uint8Array(frameSize * frameCount);

    for (var frame = 0; frame < frameCount; frame++) {

        var frameOffset = (frame * frameSize);

        for (var y = 0; y < rows; y++) {
            for (var x = 0; x < columns; x++) {
                bytes[frameOffset + (y * columns) + x] = expectedFramePixel(frame, x, y);
            }
        }

        // Burn explicit frame signature markers at the front of each frame.
        bytes[frameOffset + 0] = frame & 0xFF;
        bytes[frameOffset + 1] = (frame * 7) & 0xFF;
        bytes[frameOffset + 2] = 0xA5;
        bytes[frameOffset + 3] = 0x5A;

    }

    return bytes;

}

function buildSyntheticMultiFrameDicom(options = null) {

    var rows = options?.rows ?? 256;
    var columns = options?.columns ?? 256;
    var numberOfFrames = options?.numberOfFrames ?? 64;
    var patientName = options?.patientName ?? 'SYNTHETIC^PATIENT';
    var patientID = options?.patientID ?? 'SYNTH-001';

    var sopClassUid = '1.2.840.10008.5.1.4.1.1.7';
    var sopInstanceUid = '1.2.826.0.1.3680043.10.5432.1.1.1';
    var studyInstanceUid = '1.2.826.0.1.3680043.10.5432.1.2.1';
    var seriesInstanceUid = '1.2.826.0.1.3680043.10.5432.1.3.1';

    var pixelData = createBurnedPixelData(rows, columns, numberOfFrames);

    var metaBody = concatBytes([
        explicitElement(0x0002, 0x0001, 'OB', new Uint8Array([0, 1])),
        explicitElement(0x0002, 0x0002, 'UI', toTextBytes(sopClassUid)),
        explicitElement(0x0002, 0x0003, 'UI', toTextBytes(sopInstanceUid)),
        explicitElement(0x0002, 0x0010, 'UI', toTextBytes('1.2.840.10008.1.2.1')),
        explicitElement(0x0002, 0x0012, 'UI', toTextBytes('1.2.826.0.1.3680043.10.5432.99')),
        explicitElement(0x0002, 0x0013, 'SH', toTextBytes('EASI-JS-TEST'))
    ]);

    var metaSet = concatBytes([
        explicitElement(0x0002, 0x0000, 'UL', toUint32LE(metaBody.length)),
        metaBody
    ]);

    var dataSet = concatBytes([
        explicitElement(0x0008, 0x0016, 'UI', toTextBytes(sopClassUid)),
        explicitElement(0x0008, 0x0018, 'UI', toTextBytes(sopInstanceUid)),
        explicitElement(0x0008, 0x0060, 'CS', toTextBytes('CT')),
        explicitElement(0x0010, 0x0010, 'PN', toTextBytes(patientName)),
        explicitElement(0x0010, 0x0020, 'LO', toTextBytes(patientID)),
        explicitElement(0x0020, 0x000D, 'UI', toTextBytes(studyInstanceUid)),
        explicitElement(0x0020, 0x000E, 'UI', toTextBytes(seriesInstanceUid)),
        explicitElement(0x0028, 0x0002, 'US', toUint16LE(1)),
        explicitElement(0x0028, 0x0004, 'CS', toTextBytes('MONOCHROME2')),
        explicitElement(0x0028, 0x0008, 'IS', toTextBytes(String(numberOfFrames))),
        explicitElement(0x0028, 0x0010, 'US', toUint16LE(rows)),
        explicitElement(0x0028, 0x0011, 'US', toUint16LE(columns)),
        explicitElement(0x0028, 0x0100, 'US', toUint16LE(8)),
        explicitElement(0x0028, 0x0101, 'US', toUint16LE(8)),
        explicitElement(0x0028, 0x0102, 'US', toUint16LE(7)),
        explicitElement(0x0028, 0x0103, 'US', toUint16LE(0)),
        explicitElement(0x7FE0, 0x0010, 'OB', pixelData)
    ]);

    var preamble = new Uint8Array(128);
    var prefix = toTextBytes('DICM');

    return {
        rows,
        columns,
        numberOfFrames,
        patientName,
        patientID,
        bytes: concatBytes([preamble, prefix, metaSet, dataSet])
    };

}

async function parseDicomInstance(bytes) {
    return await EASI.pipelineBuilder()
        .fromByteStream()
        .ofDicomData()
        .toInstances()
        .build()
        .process(bytes);
}

class MockSocket {

    constructor() {
        this.readyState = 1;
        this.sent = [];
    }

    send(chunk) {
        this.sent.push(chunk);
    }

}

class ProbeDicomDataWriterHandler extends DicomDataWriterHandler {

    trackPixelDataMaterializedLength(attribute) {

        if (attribute?.tag?.ID != Tag.PixelData.ID)
            return;

        var current = (typeof attribute.length === 'function') ? attribute.length() : 0;
        this.peakPixelDataMaterializedBytes = Math.max(this.peakPixelDataMaterializedBytes, current);

    }

    onAppendAttribute(context, attribute) {
        this.trackPixelDataMaterializedLength(attribute);
        return super.onAppendAttribute(context, attribute);
    }

    async onAttributeChunk(context, payload) {

        if (payload?.attribute?.tag?.ID == Tag.PixelData.ID) {
            this.pixelDataChunkCount++;
            this.trackPixelDataMaterializedLength(payload.attribute);
        }

        return super.onAttributeChunk(context, payload);

    }

    async onEndAttribute(context, attribute) {
        this.trackPixelDataMaterializedLength(attribute);
        return super.onEndAttribute(context, attribute);
    }

    constructor(options = null) {
        super(options);
        this.pixelDataChunkCount = 0;
        this.peakPixelDataMaterializedBytes = 0;
    }

}

describe('Streaming de-identification and writer integration', () => {

    var outputDirectory = null;
    var inputPath = null;
    var synthetic = null;
    const deIdentificationMask = new Map([
        [Tag.PatientName, '[MASKED-NAME]']
    ]);

    beforeAll(() => {

        outputDirectory = path.join(
            resolveEasiJsRoot(),
            'test',
            'output',
            'integration',
            'StreamingDeIdentificationWriters'
        );

        fs.rmSync(outputDirectory, { recursive: true, force: true });
        fs.mkdirSync(outputDirectory, { recursive: true });

        synthetic = buildSyntheticMultiFrameDicom({
            rows: 256,
            columns: 256,
            numberOfFrames: 64
        });

        inputPath = path.join(outputDirectory, 'SYNTHETIC_LARGE.dcm');
        fs.writeFileSync(inputPath, Buffer.from(synthetic.bytes));

    });

    afterAll(() => {
    });

    test('Test: synthetic multi-frame PixelData frame extraction preserves burned markers per frame index', async () => {

        var selectedFrames = [0, Math.floor(synthetic.numberOfFrames / 2), (synthetic.numberOfFrames - 1)];
        var frameEvents = [];

        await EASI.pipelineBuilder()
            .fromByteStream()
            .ofDicomData()
            .toAssets({
                payload: {
                    frame: {
                        frames: selectedFrames,
                        decode: 'native',
                        encode: 'none'
                    },
                    onFrame: (frame) => frameEvents.push(frame),
                    collect: false
                }
            })
            .build()
            .process(synthetic.bytes);

        expect(frameEvents.length).toBe(selectedFrames.length);

        var probePoints = [
            { x: 11, y: 7 },
            { x: synthetic.columns - 1, y: synthetic.rows - 1 }
        ];

        for (var i = 0; i < frameEvents.length; i++) {

            var frame = frameEvents[i];
            expect(frame.encoding).toBe('native');
            expect(frame.bytes.length).toBe(synthetic.rows * synthetic.columns);

            // Verify burned frame signature pixels.
            expect(frame.bytes[0]).toBe(frame.index & 0xFF);
            expect(frame.bytes[1]).toBe((frame.index * 7) & 0xFF);
            expect(frame.bytes[2]).toBe(0xA5);
            expect(frame.bytes[3]).toBe(0x5A);

            for (var p = 0; p < probePoints.length; p++) {

                var point = probePoints[p];
                var expected = expectedFramePixel(frame.index, point.x, point.y);
                var offset = ((point.y * synthetic.columns) + point.x);

                expect(frame.bytes[offset]).toBe(expected);

            }

        }

    });

    test('Test: node-stream read -> parse -> de-identify -> DICOM write streams PixelData without materializing it', async () => {

        var outputChunks = [];
        var outputChunkLengths = [];

        var terminalHandler = new ProbeDicomDataWriterHandler({
            collectOutput: false,
            onChunk: (chunk) => {
                outputChunks.push(new Uint8Array(chunk));
                outputChunkLengths.push(chunk.length);
            }
        });

        var pipeline = EASI.pipelineBuilder()
            .fromNodeStreamAdapter()
            .ofDicomData()
            .withBulkDataPolicy({
                mode: 'auto',
                knownLengthThreshold: 4096,
                hardSafetyCap: (1024 * 1024)
            })
            .withHandler(new DicomDeIdentificationFilter(terminalHandler, deIdentificationMask))
            .build();

        var sourceStream = fs.createReadStream(inputPath, { highWaterMark: (16 * 1024) });
        var sourceLength = fs.statSync(inputPath).size;

        var bytesWritten = await pipeline.process(sourceStream, {
            contentType: 'application/dicom',
            contentLength: sourceLength
        });

        expect(typeof bytesWritten).toBe('number');
        expect(bytesWritten).toBeGreaterThan(0);
        expect(outputChunks.length).toBeGreaterThan(20);
        expect(Math.max(...outputChunkLengths)).toBeLessThanOrEqual(24 * 1024);

        expect(terminalHandler.pixelDataChunkCount).toBeGreaterThan(0);
        expect(terminalHandler.peakPixelDataMaterializedBytes).toBe(0);

        var rewrittenBytes = concatBytes(outputChunks);
        expect(rewrittenBytes.length).toBe(bytesWritten);
        writeOutputBytes(outputDirectory, 'SYNTHETIC_LARGE_DEID_STREAM_HANDLER.dcm', rewrittenBytes);

        var rewrittenInstance = await parseDicomInstance(rewrittenBytes);
        expect(rewrittenInstance.dataSet.find(Tag.PatientName).value).toBe('[MASKED-NAME]');
        expect(rewrittenInstance.dataSet.find(Tag.PixelData)).toBeDefined();
        expect(Number(rewrittenInstance.dataSet.find(Tag.NumberOfFrames).value)).toBe(synthetic.numberOfFrames);

    });

    test('Test: pipeline output can be written through ByteStreamWriter sink', async () => {

        var byteWriterChunks = [];

        var result = await EASI.pipelineBuilder()
            .fromFileStream()
            .ofDicomData()
            .withDeIdentification(deIdentificationMask)
            .toDicomData()
            .intoByteStream({
                chunkSize: 8192,
                collectOutput: true,
                onChunk: (chunk) => byteWriterChunks.push(chunk)
            })
            .build()
            .process(inputPath);

        expect(result.bytesWritten).toBeGreaterThan(0);
        expect(result.body instanceof Uint8Array).toBe(true);
        expect(byteWriterChunks.length).toBeGreaterThan(1);
        writeOutputBytes(outputDirectory, 'SYNTHETIC_LARGE_DEID_BYTE_WRITER.dcm', result.body);

        var instance = await parseDicomInstance(result.body);
        expect(instance.dataSet.find(Tag.PatientName).value).toBe('[MASKED-NAME]');

    });

    test('Test: pipeline output can be written through FileStreamWriter sink', async () => {

        var outputPath = path.join(outputDirectory, 'SYNTHETIC_LARGE_DEID_FILE_WRITER.dcm');

        var result = await EASI.pipelineBuilder()
            .fromFileStream()
            .ofDicomData()
            .withDeIdentification(deIdentificationMask)
            .toDicomData()
            .intoFileStream(outputPath, {
                chunkSize: 8192
            })
            .build()
            .process(inputPath);

        expect(result.bytesWritten).toBeGreaterThan(0);
        expect(fs.existsSync(outputPath)).toBe(true);

        var outputBytes = new Uint8Array(fs.readFileSync(outputPath));
        var instance = await parseDicomInstance(outputBytes);
        expect(instance.dataSet.find(Tag.PatientName).value).toBe('[MASKED-NAME]');

    });

    test('Test: pipeline output can be written through NodeStreamAdapterWriter sink', async () => {

        var sinkChunks = [];
        var writable = new stream.Writable({
            write(chunk, encoding, callback) {
                sinkChunks.push(new Uint8Array(chunk));
                callback();
            }
        });

        var result = await EASI.pipelineBuilder()
            .fromFileStream()
            .ofDicomData()
            .withDeIdentification(deIdentificationMask)
            .toDicomData()
            .intoNodeStreamAdapter(writable, {
                chunkSize: 8192,
                end: true
            })
            .build()
            .process(inputPath);

        expect(result.bytesWritten).toBeGreaterThan(0);
        expect(sinkChunks.length).toBeGreaterThan(1);

        var outputBytes = concatBytes(sinkChunks);
        writeOutputBytes(outputDirectory, 'SYNTHETIC_LARGE_DEID_NODE_WRITER.dcm', outputBytes);
        var instance = await parseDicomInstance(outputBytes);
        expect(instance.dataSet.find(Tag.PatientName).value).toBe('[MASKED-NAME]');

    });

    test('Test: pipeline output can be written through WebSocketStreamWriter sink', async () => {

        var socket = new MockSocket();

        var result = await EASI.pipelineBuilder()
            .fromFileStream()
            .ofDicomData()
            .withDeIdentification(deIdentificationMask)
            .toDicomData()
            .intoWebSocketStream(socket, {
                chunkSize: 8192,
                closeOnDone: false
            })
            .build()
            .process(inputPath);

        expect(result.bytesWritten).toBeGreaterThan(0);
        expect(socket.sent.length).toBeGreaterThan(1);

        var outputBytes = concatBytes(socket.sent);
        writeOutputBytes(outputDirectory, 'SYNTHETIC_LARGE_DEID_WEBSOCKET_WRITER.dcm', outputBytes);
        var instance = await parseDicomInstance(outputBytes);
        expect(instance.dataSet.find(Tag.PatientName).value).toBe('[MASKED-NAME]');

    });

});
