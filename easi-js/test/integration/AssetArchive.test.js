import EASI from '../../src/EASI.js';
import DicomToFHIRImagingStudyMapping from '../../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js';

const path = require('path');
const fs = require('fs');

function readDicomBytes(name = '0002.DCM') {
    var root = process.cwd().split('easi-js')[0];
    return fs.readFileSync(path.join(root, '/data/dicoms/' + name));
}

function findEndOfCentralDirectory(bytes) {
    for (var i = bytes.length - 22; i >= 0; i--) {
        if ((bytes[i] == 0x50) && (bytes[i + 1] == 0x4B) && (bytes[i + 2] == 0x05) && (bytes[i + 3] == 0x06)) {
            return i;
        }
    }
    return -1;
}

function listZipEntries(bytes) {

    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var eocdOffset = findEndOfCentralDirectory(bytes);

    if (eocdOffset < 0)
        return [];

    var centralSize = view.getUint32(eocdOffset + 12, true);
    var centralOffset = view.getUint32(eocdOffset + 16, true);

    var entries = [];
    var offset = centralOffset;
    var centralEnd = centralOffset + centralSize;
    var decoder = new TextDecoder();

    while (offset < centralEnd) {

        var signature = view.getUint32(offset, true);
        if (signature != 0x02014B50) {
            break;
        }

        var compressedSize = view.getUint32(offset + 20, true);
        var fileNameLength = view.getUint16(offset + 28, true);
        var extraLength = view.getUint16(offset + 30, true);
        var commentLength = view.getUint16(offset + 32, true);
        var localOffset = view.getUint32(offset + 42, true);

        var nameBytes = bytes.subarray(offset + 46, offset + 46 + fileNameLength);
        var name = decoder.decode(nameBytes);

        entries.push({
            name,
            compressedSize,
            localOffset
        });

        offset += 46 + fileNameLength + extraLength + commentLength;

    }

    return entries;

}

function readZipEntry(bytes, name) {

    var entries = listZipEntries(bytes);
    var entry = entries.find((value) => value.name == name);

    if (entry == null)
        return null;

    var view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var localOffset = entry.localOffset;

    var signature = view.getUint32(localOffset, true);
    if (signature != 0x04034B50)
        return null;

    var fileNameLength = view.getUint16(localOffset + 26, true);
    var extraLength = view.getUint16(localOffset + 28, true);

    var dataStart = localOffset + 30 + fileNameLength + extraLength;
    var dataEnd = dataStart + entry.compressedSize;

    return bytes.subarray(dataStart, dataEnd);

}

function concatChunks(chunks) {

    var total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    var output = new Uint8Array(total);
    var offset = 0;

    for (var i = 0; i < chunks.length; i++) {
        output.set(chunks[i], offset);
        offset += chunks[i].length;
    }

    return output;

}

test('Test: toAssetArchive packages metadata and PNG frame payloads into ZIP', async () => {

    var result = await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toAssetArchive({
            metadata: {
                mapping: new DicomToFHIRImagingStudyMapping()
            },
            payload: {
                frame: {
                    frames: 'first',
                    decode: 'rgba',
                    encode: 'png'
                }
            }
        })
        .build()
        .process(readDicomBytes('0002.DCM'));

    expect(result instanceof Uint8Array).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    var entryNames = listZipEntries(result).map((entry) => entry.name);

    expect(entryNames).toContain('metadata.json');
    expect(entryNames).toContain('manifest.json');
    expect(entryNames).toContain('frames/frame-000001.png');

    var metadataBytes = readZipEntry(result, 'metadata.json');
    var metadata = JSON.parse((new TextDecoder()).decode(metadataBytes));

    expect(metadata.resourceType).toBe('ImagingStudy');

    var frameBytes = readZipEntry(result, 'frames/frame-000001.png');
    expect(frameBytes[0]).toBe(137);
    expect(frameBytes[1]).toBe(80);
    expect(frameBytes[2]).toBe(78);
    expect(frameBytes[3]).toBe(71);

    var manifestBytes = readZipEntry(result, 'manifest.json');
    var manifest = JSON.parse((new TextDecoder()).decode(manifestBytes));

    expect(manifest.version).toBe('easi-assets-zip-1.0');
    expect(manifest.frameCount).toBe(1);

});

test('Test: toAssetArchive can stream ZIP chunks without materializing archive bytes in-memory', async () => {

    var chunks = [];

    var result = await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toAssetArchive({
            metadata: {
                mapping: new DicomToFHIRImagingStudyMapping()
            },
            payload: {
                frame: {
                    frames: 'first',
                    decode: 'rgba',
                    encode: 'png'
                }
            },
            collectOutput: false,
            onChunk: (chunk) => chunks.push(chunk)
        })
        .build()
        .process(readDicomBytes('0002.DCM'));

    expect(result.resultType).toBe('PipelineOperationResult');
    expect(result.operation).toBe('toAssetArchive');
    expect(result.materialized).toBe(false);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(0);

    var archiveBytes = concatChunks(chunks);
    expect(archiveBytes.length).toBe(result.bytesWritten);

    var entryNames = listZipEntries(archiveBytes).map((entry) => entry.name);
    expect(entryNames).toContain('metadata.json');
    expect(entryNames).toContain('manifest.json');
    expect(entryNames).toContain('frames/frame-000001.png');

});
