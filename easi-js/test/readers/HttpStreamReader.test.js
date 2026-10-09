import HttpStreamReader from '../../src/readers/HttpStreamReader.js';
import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';

test('Test: read forwards fetch headers/options for URL sources', async () => {

    const originalFetch = global.fetch;

    try {

        const body = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array([1]));
                controller.close();
            }
        });

        const partReader = {
            read: jest.fn(),
            readStream: jest.fn().mockResolvedValue({ ok: true }),
            parser: null,
            onPart: null
        };

        global.fetch = jest.fn().mockResolvedValue({
            headers: {
                get(name) {
                    if (String(name).toLowerCase() === 'content-type')
                        return 'application/dicom+xml';
                    if (String(name).toLowerCase() === 'content-length')
                        return '1';
                    return null;
                }
            },
            body: body
        });

        const reader = new HttpStreamReader(partReader);
        const onEmit = () => {};
        const result = await reader.read('http://example.test/metadata', {
            headers: {
                Accept: 'application/dicom+xml'
            },
            onEmit: onEmit
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('http://example.test/metadata', expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
                Accept: 'application/dicom+xml'
            })
        }));
        expect(global.fetch.mock.calls[0][1].onEmit).toBeUndefined();

        expect(partReader.readStream).toHaveBeenCalledTimes(1);
        expect(partReader.readStream).toHaveBeenCalledWith(body, expect.objectContaining({
            contentLength: '1',
            onEmit: onEmit,
            contentType: expect.objectContaining({
                'content-type': 'application/dicom+xml',
                isMultiPart: false
            })
        }));
        expect(result).toEqual({ ok: true });

    }
    finally {
        global.fetch = originalFetch;
    }

});

test.each([400, 404, 500, 0])('Test: HTTP status %s is rejected before parsing and cancels its response body', async (status) => {

    const originalFetch = global.fetch;

    try {
        const cancel = jest.fn();
        const body = new ReadableStream({ cancel });
        const partReader = { readStream: jest.fn() };
        global.fetch = jest.fn().mockResolvedValue({ status, statusText: 'Failure', body });

        const reader = new HttpStreamReader(partReader);
        await expect(reader.read('https://example.test/data')).rejects.toThrow(
            'HTTP request failed for https://example.test/data: ' + status + ' Failure.'
        );
        expect(partReader.readStream).not.toHaveBeenCalled();
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(body.locked).toBe(false);
    } finally {
        global.fetch = originalFetch;
    }

});

test('Test: HTTP failure remains visible when cancelling the response body fails', async () => {

    const originalFetch = global.fetch;

    try {
        const body = { cancel: jest.fn().mockRejectedValue(new Error('cleanup failed')) };
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, body });

        await expect(new HttpStreamReader().read('https://example.test/data')).rejects.toThrow('503');
        expect(body.cancel).toHaveBeenCalledTimes(1);
    } finally {
        global.fetch = originalFetch;
    }

});

test('Test: HTTP missing-body errors include the URL', async () => {

    const originalFetch = global.fetch;

    try {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204, body: null });
        await expect(new HttpStreamReader().read('https://example.test/empty')).rejects.toThrow(
            'Invalid HTTP response for https://example.test/empty. Missing response body stream.'
        );
    } finally {
        global.fetch = originalFetch;
    }

});

test('Test: HTTP abort after headers cancels the body without starting the parser', async () => {

    const originalFetch = global.fetch;

    try {
        const controller = new AbortController();
        const abortError = new Error('Request cancelled');
        const cancel = jest.fn();
        const body = new ReadableStream({ cancel });
        const partReader = { readStream: jest.fn() };
        global.fetch = jest.fn().mockImplementation(async () => {
            controller.abort(abortError);
            return { ok: true, status: 200, body };
        });

        await expect(new HttpStreamReader(partReader).read('https://example.test/data', {
            signal: controller.signal
        })).rejects.toBe(abortError);
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(partReader.readStream).not.toHaveBeenCalled();
    } finally {
        global.fetch = originalFetch;
    }

});

test('Test: HTTP pipeline parses chunked DICOM JSON from a successful response', async () => {

    const originalFetch = global.fetch;

    try {
        const metadata = new TextEncoder().encode(JSON.stringify([
            { '00080018': { vr: 'UI', Value: ['1.2.3.1'] } },
            { '00080018': { vr: 'UI', Value: ['1.2.3.2'] } }
        ]));
        const body = new ReadableStream({
            start(controller) {
                for (let offset = 0; offset < metadata.length; offset += 7)
                    controller.enqueue(metadata.subarray(offset, offset + 7));
                controller.close();
            }
        });
        global.fetch = jest.fn().mockResolvedValue(new Response(body, {
            headers: { 'Content-Type': 'application/dicom+json' }
        }));

        const pipeline = EASI.pipelineBuilder().fromHttpStream().ofDicomMetadata().toInstances().build();
        const result = await pipeline.process('https://example.test/metadata');

        expect(result.count).toBe(2);
        expect(result[0].dataSet.value(Tag.SOPInstanceUID)).toBe('1.2.3.1');
        expect(result[1].dataSet.value(Tag.SOPInstanceUID)).toBe('1.2.3.2');
    } finally {
        global.fetch = originalFetch;
    }

});

test('Test: HTTP validates the emission callback before fetching a response', async () => {

    const originalFetch = global.fetch;

    try {
        global.fetch = jest.fn();
        await expect(new HttpStreamReader().read('https://example.test/data', { onEmit: 'invalid' })).rejects.toThrow('Invalid "onEmit" option');
        expect(global.fetch).not.toHaveBeenCalled();
    } finally {
        global.fetch = originalFetch;
    }

});

test('Test: HTTP pipeline cancels an unused body when parser session initialization fails', async () => {

    const originalFetch = global.fetch;

    try {
        const cancel = jest.fn();
        const body = new ReadableStream({ cancel });
        const bodyCancel = jest.spyOn(body, 'cancel');
        global.fetch = jest.fn().mockResolvedValue(new Response(body, {
            headers: { 'Content-Type': 'application/dicom+json' }
        }));
        const failure = new Error('Session initialization failed');
        const pipeline = EASI.pipelineBuilder().fromHttpStream().ofDicomMetadata().toInstances().build();
        pipeline.parser.resetSession = jest.fn(() => { throw failure; });
        const parse = jest.spyOn(pipeline.parser, 'parse');

        await expect(pipeline.process('https://example.test/metadata')).rejects.toBe(failure);
        expect(parse).not.toHaveBeenCalled();
        expect(bodyCancel).toHaveBeenCalledTimes(1);
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(cancel).toHaveBeenCalledWith(failure);
        expect(body.locked).toBe(false);
    } finally {
        global.fetch = originalFetch;
    }

});
