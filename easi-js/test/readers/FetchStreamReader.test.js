import FetchStreamReader from '../../src/readers/FetchStreamReader.js';

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

        const reader = new FetchStreamReader(partReader);
        const onPart = () => {};
        const result = await reader.read('http://example.test/metadata', {
            headers: {
                Accept: 'application/dicom+xml'
            },
            onPart: onPart
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('http://example.test/metadata', expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
                Accept: 'application/dicom+xml'
            })
        }));
        expect(global.fetch.mock.calls[0][1].onPart).toBeUndefined();

        expect(partReader.readStream).toHaveBeenCalledTimes(1);
        expect(partReader.readStream).toHaveBeenCalledWith(body, expect.objectContaining({
            contentLength: '1',
            onPart: onPart,
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
