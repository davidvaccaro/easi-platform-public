import MultipartDemuxer from '../../../src/readers/parts/MultipartDemuxer.js';

test('Test: MultipartDemuxer emits part headers/data/end for multipart payload', async () => {

    const headers = [];
    const chunks = [];
    let endCount = 0;

    const demuxer = new MultipartDemuxer('abc123', {
        onPartStart: async (partHeaders) => headers.push(partHeaders),
        onPartData: async (bytes) => {
            if ((bytes != null) && (bytes.length > 0))
                chunks.push((new TextDecoder()).decode(bytes));
        },
        onPartEnd: async () => {},
        onEnd: async () => { endCount++; }
    });

    const payload =
        '--abc123\r\n' +
        'Content-Type: application/dicom\r\n' +
        '\r\n' +
        'A' +
        '\r\n--abc123\r\n' +
        'Content-Type: application/dicom\r\n' +
        '\r\n' +
        'BC' +
        '\r\n--abc123--\r\n';

    const bytes = (new TextEncoder()).encode(payload);
    await demuxer.push(bytes.subarray(0, 25), false);
    await demuxer.push(bytes.subarray(25, 53), false);
    await demuxer.push(bytes.subarray(53), true);

    expect(headers.length).toBe(2);
    expect(headers[0]['content-type']).toBe('application/dicom');
    expect(headers[1]['content-type']).toBe('application/dicom');
    expect(chunks.join('')).toBe('ABC');
    expect(endCount).toBe(1);

});
