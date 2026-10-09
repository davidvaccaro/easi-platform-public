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

test.each(['', 'BODY', 'A'.repeat(64)])('Test: MultipartDemuxer rejects EOF before closing delimiter (body length=%s)', async (body) => {

    const onPartData = jest.fn();
    const onPartEnd = jest.fn();
    const onEnd = jest.fn();
    const demuxer = new MultipartDemuxer('abc123', { onPartData, onPartEnd, onEnd });
    const bytes = (new TextEncoder()).encode('--abc123\r\nContent-Type: application/dicom\r\n\r\n' + body);

    await demuxer.push(bytes, false);
    await expect(demuxer.push(null, true)).rejects.toThrow('Missing closing boundary');

    expect(onPartData.mock.calls.some((call) => call[1] === true)).toBe(false);
    expect(onPartEnd).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();

});

test.each(['', 'Content-Type: application/dicom\r\n', 'Content-Type: application/dicom\r\n\r\n'])('Test: MultipartDemuxer rejects EOF after non-final delimiter while awaiting next part', async (nextPart) => {

    const onPartEnd = jest.fn();
    const onEnd = jest.fn();
    const demuxer = new MultipartDemuxer('abc123', { onPartEnd, onEnd });
    const bytes = (new TextEncoder()).encode('--abc123\r\nContent-Type: application/dicom\r\n\r\nONE\r\n--abc123\r\n' + nextPart);

    await expect(demuxer.push(bytes, true)).rejects.toThrow('Invalid multipart payload');

    expect(onPartEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();

});

test.each(['', 'preamble only', '--abc123', '--abc123-', '--abc123\r\nContent-Type: application/dicom\r\n\r\nONE\r\n--abc123-'])('Test: MultipartDemuxer rejects incomplete envelopes at EOF', async (payload) => {

    const onEnd = jest.fn();
    const demuxer = new MultipartDemuxer('abc123', { onEnd });

    await expect(demuxer.push((new TextEncoder()).encode(payload), true)).rejects.toThrow('Invalid multipart payload');
    expect(onEnd).not.toHaveBeenCalled();

});

test.each(['', '\r\n', '\r\nignored epilogue'])('Test: MultipartDemuxer accepts a closing delimiter and optional epilogue across every chunk split', async (epilogue) => {

    const payload = '--abc123\r\nContent-Type: application/dicom\r\n\r\nONE\r\n--abc123\r\nContent-Type: application/dicom\r\n\r\nTWO\r\n--abc123--' + epilogue;
    const bytes = (new TextEncoder()).encode(payload);

    for (var split = 0; split <= bytes.length; split++) {

        const chunks = [];
        const onPartEnd = jest.fn();
        const onEnd = jest.fn();
        const demuxer = new MultipartDemuxer('abc123', {
            onPartData: (value) => chunks.push((new TextDecoder()).decode(value)),
            onPartEnd,
            onEnd
        });

        await demuxer.push(bytes.slice(0, split), false);
        await demuxer.push(bytes.slice(split), true);

        expect(chunks.join('')).toBe('ONETWO');
        expect(onPartEnd).toHaveBeenCalledTimes(2);
        expect(onEnd).toHaveBeenCalledTimes(1);

    }

});
