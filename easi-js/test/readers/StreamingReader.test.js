import StreamingReader from '../../src/readers/StreamingReader.js';

test('Test: read forwards fetch headers/options for URL sources', async () => {

    const originalFetch = global.fetch;

    try {

        const body = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array([1]));
                controller.close();
            }
        });

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

        const reader = new StreamingReader();

        reader.processSinglePart = jest.fn((controller, partReader, contentType, contentLength, resolve, reject) => {
            resolve({ ok: true, contentType, contentLength });
            controller.close();
            partReader.releaseLock();
        });

        const result = await reader.read('http://example.test/metadata', {
            headers: {
                Accept: 'application/dicom+xml'
            }
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith('http://example.test/metadata', expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
                Accept: 'application/dicom+xml'
            })
        }));

        expect(reader.processSinglePart).toHaveBeenCalledTimes(1);
        expect(result.ok).toBe(true);
        expect(result.contentType['content-type']).toBe('application/dicom+xml');

    }
    finally {

        global.fetch = originalFetch;

    }

});
