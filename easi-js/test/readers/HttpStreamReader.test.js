import HttpStreamReader from '../../src/readers/HttpStreamReader.js';

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
