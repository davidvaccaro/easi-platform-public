import HttpStreamWriter from '../../src/writers/HttpStreamWriter.js';

test('Test: HttpStreamWriter writes bytes to URL with default POST and inferred headers', async () => {

    const originalFetch = global.fetch;

    try {

        const writer = new HttpStreamWriter();
        writer._partWriter = {
            write: jest.fn().mockResolvedValue({
                body: new Uint8Array([1, 2, 3]),
                bytesWritten: 3,
                contentType: 'application/dicom'
            })
        };

        global.fetch = jest.fn().mockResolvedValue({
            status: 200,
            ok: true
        });

        const result = await writer.write(
            'https://example.test/store',
            new Uint8Array([9, 9, 9]),
            { stream: false }
        );

        expect(writer._partWriter.write).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.test/store',
            expect.objectContaining({
                method: 'POST',
                body: expect.any(Uint8Array),
                headers: expect.objectContaining({
                    'Content-Type': 'application/dicom',
                    'Content-Length': '3'
                })
            })
        );
        expect(result.ok).toBe(true);
        expect(result.status).toBe(200);
        expect(result.bytesWritten).toBe(3);

    }
    finally {
        global.fetch = originalFetch;
    }

});

test('Test: HttpStreamWriter honors explicit request method and content-type header', async () => {

    const originalFetch = global.fetch;

    try {

        const writer = new HttpStreamWriter();
        writer._partWriter = {
            write: jest.fn().mockResolvedValue({
                body: new Uint8Array([4, 5]),
                bytesWritten: 2,
                contentType: 'application/dicom'
            })
        };

        global.fetch = jest.fn().mockResolvedValue({
            status: 202,
            ok: true
        });

        await writer.write(
            {
                url: 'https://example.test/custom',
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/custom'
                }
            },
            new Uint8Array([4, 5]),
            { stream: false }
        );

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.test/custom',
            expect.objectContaining({
                method: 'PUT',
                headers: expect.objectContaining({
                    'Content-Type': 'application/custom',
                    'Content-Length': '2'
                })
            })
        );

    }
    finally {
        global.fetch = originalFetch;
    }

});

test('Test: HttpStreamWriter defaults to streaming upload when supported', async () => {

    const originalFetch = global.fetch;

    try {

        const writer = new HttpStreamWriter();
        const streamedChunks = [];

        writer._partWriter = {
            isPartDescriptor: () => true,
            write: jest.fn().mockImplementation(async (source, options) => {
                await options.onChunk(new Uint8Array([7, 8]));
                await options.onChunk(new Uint8Array([9]));
                return {
                    body: null,
                    bytesWritten: 3,
                    contentType: 'application/dicom'
                };
            })
        };

        global.fetch = jest.fn().mockResolvedValue({
            status: 200,
            ok: true
        });

        const result = await writer.write(
            'https://example.test/stream',
            new Uint8Array([1, 2, 3]),
            {
                onChunk: (chunk) => streamedChunks.push(chunk)
            }
        );

        expect(writer._partWriter.write).toHaveBeenCalledTimes(1);
        expect(writer._partWriter.write).toHaveBeenCalledWith(
            expect.any(Uint8Array),
            expect.objectContaining({
                collectOutput: false,
                onChunk: expect.any(Function)
            })
        );

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.test/stream',
            expect.objectContaining({
                method: 'POST',
                body: expect.anything(),
                headers: expect.objectContaining({
                    'Content-Type': 'application/dicom'
                }),
                duplex: 'half'
            })
        );

        expect(streamedChunks.length).toBe(2);
        expect(result.ok).toBe(true);
        expect(result.status).toBe(200);
        expect(result.bytesWritten).toBe(3);
        expect(result.body).toBe(null);

    }
    finally {
        global.fetch = originalFetch;
    }

});

test('Test: HttpStreamWriter STOW mode enforces multipart defaults and wraps single instance source', async () => {

    const originalFetch = global.fetch;

    try {

        const writer = new HttpStreamWriter();
        writer._partWriter = {
            createBoundary: jest.fn().mockReturnValue('stow-boundary'),
            buildMultiPartContentType: jest.fn().mockReturnValue('multipart/related; type="application/dicom"; boundary=stow-boundary'),
            write: jest.fn().mockResolvedValue({
                body: new Uint8Array([1, 2, 3, 4]),
                bytesWritten: 4,
                contentType: 'multipart/related; type="application/dicom"; boundary=stow-boundary'
            })
        };

        global.fetch = jest.fn().mockResolvedValue({
            status: 200,
            ok: true
        });

        await writer.write(
            { url: 'https://example.test/dicom-web/studies' },
            new Uint8Array([9, 8, 7]),
            { stream: false, stow: true }
        );

        expect(writer._partWriter.write).toHaveBeenCalledTimes(1);
        expect(writer._partWriter.write).toHaveBeenCalledWith(
            expect.any(Array),
            expect.objectContaining({
                isMultiPart: true,
                type: 'application/dicom',
                partContentType: 'application/dicom',
                boundary: 'stow-boundary',
                collectOutput: true
            })
        );

        const writeSource = writer._partWriter.write.mock.calls[0][0];
        expect(Array.isArray(writeSource)).toBe(true);
        expect(writeSource.length).toBe(1);
        expect(writeSource[0]).toBeInstanceOf(Uint8Array);

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            'https://example.test/dicom-web/studies',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'multipart/related; type="application/dicom"; boundary=stow-boundary',
                    Accept: 'application/dicom+json, application/json'
                })
            })
        );

    }
    finally {
        global.fetch = originalFetch;
    }

});

test('Test: HttpStreamWriter STOW strict mode rejects non-POST request method', async () => {

    const originalFetch = global.fetch;

    try {

        const writer = new HttpStreamWriter();

        await expect(writer.write(
            {
                url: 'https://example.test/dicom-web/studies',
                method: 'PUT'
            },
            new Uint8Array([1]),
            { stream: false, stow: true }
        )).rejects.toThrow('Invalid STOW request method');

        expect(global.fetch).toBe(originalFetch);

    }
    finally {
        global.fetch = originalFetch;
    }

});

test('Test: HttpStreamWriter STOW strict mode enforces success HTTP statuses', async () => {

    const originalFetch = global.fetch;

    try {

        const writer = new HttpStreamWriter();
        writer._partWriter = {
            createBoundary: jest.fn().mockReturnValue('stow-boundary'),
            buildMultiPartContentType: jest.fn().mockReturnValue('multipart/related; type="application/dicom"; boundary=stow-boundary'),
            write: jest.fn().mockResolvedValue({
                body: new Uint8Array([1]),
                bytesWritten: 1,
                contentType: 'multipart/related; type="application/dicom"; boundary=stow-boundary'
            })
        };

        global.fetch = jest.fn().mockResolvedValue({
            status: 409,
            ok: false
        });

        await expect(writer.write(
            'https://example.test/dicom-web/studies',
            new Uint8Array([1]),
            { stream: false, stow: true }
        )).rejects.toThrow('STOW request failed with HTTP status 409');

    }
    finally {
        global.fetch = originalFetch;
    }

});
