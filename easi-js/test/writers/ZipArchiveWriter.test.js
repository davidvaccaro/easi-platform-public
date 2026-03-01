import ZipArchiveWriter from '../../src/writers/ZipArchiveWriter.js';

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

test('Test: ZipArchiveWriter writes and finalizes a valid ZIP with expected entries', async () => {

    var writer = new ZipArchiveWriter();

    await writer.addFile('metadata.json', (new TextEncoder()).encode('{"resourceType":"ImagingStudy"}'));
    await writer.addFile('frames/frame-000001.png', new Uint8Array([137, 80, 78, 71]));

    var output = await writer.finalize();

    expect(output instanceof Uint8Array).toBe(true);

    var names = listZipEntries(output).map((entry) => entry.name);

    expect(names).toContain('metadata.json');
    expect(names).toContain('frames/frame-000001.png');

    var metadataBytes = readZipEntry(output, 'metadata.json');
    var metadata = JSON.parse((new TextDecoder()).decode(metadataBytes));

    expect(metadata.resourceType).toBe('ImagingStudy');

});

test('Test: ZipArchiveWriter supports onChunk streaming without collecting output bytes', async () => {

    var chunkCount = 0;

    var writer = new ZipArchiveWriter({
        collectOutput: false,
        onChunk: () => {
            chunkCount += 1;
        }
    });

    await writer.addFile('data.bin', new Uint8Array([1, 2, 3, 4, 5]));
    var result = await writer.finalize();

    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
    expect(chunkCount).toBeGreaterThan(0);

});
