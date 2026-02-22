import StreamingWriter from '../../src/writers/StreamingWriter.js';

test('Test: StreamingWriter writeSinglePart emits application/dicom payload by default', async () => {

    var source = Uint8Array.from([0x01, 0x02, 0x03, 0x04]);
    var writer = new StreamingWriter();

    var result = await writer.writeSinglePart(source);

    expect(result.isMultiPart).toBe(false);
    expect(result.contentType).toBe('application/dicom');
    expect(result.boundary).toBe(null);
    expect(result.partCount).toBe(1);
    expect(result.bytesWritten).toBe(source.length);
    expect(result.body).toEqual(source);

});

test('Test: StreamingWriter writeSinglePart can stream chunked output without collecting', async () => {

    var chunks = [];
    var writer = new StreamingWriter({
        onChunk: (chunk) => chunks.push(chunk),
        collectOutput: false,
        chunkSize: 3
    });

    var source = Uint8Array.from([0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38]);
    var result = await writer.writeSinglePart(source);

    expect(result.body).toBe(null);
    expect(result.bytesWritten).toBe(8);
    expect(chunks.length).toBe(3);
    expect(chunks[0].length).toBe(3);
    expect(chunks[1].length).toBe(3);
    expect(chunks[2].length).toBe(2);

});

test('Test: StreamingWriter writeMultiPart emits MIME boundaries and per-part headers', async () => {

    var encoder = new TextEncoder();
    var decoder = new TextDecoder();

    var writer = new StreamingWriter();
    var result = await writer.writeMultiPart([
        encoder.encode('PART-ONE'),
        {
            data: encoder.encode('PART-TWO'),
            headers: {
                'Content-ID': '<second-part>'
            }
        }
    ], {
        boundary: 'test-boundary',
        includeContentLength: true
    });

    expect(result.isMultiPart).toBe(true);
    expect(result.boundary).toBe('test-boundary');
    expect(result.partCount).toBe(2);
    expect(result.contentType).toContain('multipart/related');
    expect(result.contentType).toContain('boundary=test-boundary');

    var bodyText = decoder.decode(result.body);
    expect(bodyText).toContain('--test-boundary\r\n');
    expect(bodyText).toContain('Content-Type: application/dicom\r\n');
    expect(bodyText).toContain('Content-Length: 8\r\n');
    expect(bodyText).toContain('Content-ID: <second-part>\r\n');
    expect(bodyText.endsWith('--test-boundary--\r\n')).toBe(true);

});

test('Test: StreamingWriter write auto-selects single-part for byte arrays and multipart for part arrays', async () => {

    var decoder = new TextDecoder();
    var writer = new StreamingWriter();

    var singlePartResult = await writer.write([65, 66, 67]);
    expect(singlePartResult.isMultiPart).toBe(false);
    expect(decoder.decode(singlePartResult.body)).toBe('ABC');

    var multiPartResult = await writer.write([
        Uint8Array.from([65]),
        Uint8Array.from([66])
    ], {
        boundary: 'auto-boundary'
    });
    expect(multiPartResult.isMultiPart).toBe(true);
    expect(multiPartResult.boundary).toBe('auto-boundary');
    expect(multiPartResult.contentType).toContain('boundary=auto-boundary');

});
