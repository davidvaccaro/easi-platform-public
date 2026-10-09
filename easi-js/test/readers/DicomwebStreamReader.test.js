import DicomwebStreamReader from "../../src/readers/DicomwebStreamReader.js";

test("Test: read builds WADO instance URL from structured DICOMweb source", async () => {

    const originalFetch = global.fetch;

    try {

        const body = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array([1]));
                controller.close();
            }
        });

        const partReader = {
            readStream: jest.fn().mockResolvedValue({ ok: true }),
            parser: null,
            onPart: null
        };

        global.fetch = jest.fn().mockResolvedValue({
            headers: {
                get(name) {
                    if (String(name).toLowerCase() === "content-type")
                        return "application/dicom";
                    if (String(name).toLowerCase() === "content-length")
                        return "1";
                    return null;
                }
            },
            body: body
        });

        const reader = new DicomwebStreamReader(partReader);
        const result = await reader.read({
            baseUrl: "https://dicom.test/dicomweb",
            studyInstanceUid: "1.2.3",
            seriesInstanceUid: "4.5.6",
            sopInstanceUid: "7.8.9"
        });

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            "https://dicom.test/dicomweb/studies/1.2.3/series/4.5.6/instances/7.8.9",
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    Accept: "application/dicom"
                })
            })
        );

        expect(partReader.readStream).toHaveBeenCalledTimes(1);
        expect(partReader.readStream).toHaveBeenCalledWith(body, expect.objectContaining({
            contentLength: "1",
            contentType: expect.objectContaining({
                "content-type": "application/dicom",
                isMultiPart: false
            })
        }));
        expect(result).toEqual({ ok: true });

    } finally {
        global.fetch = originalFetch;
    }

});

test("Test: read builds QIDO query URL and default accept header", async () => {

    const originalFetch = global.fetch;

    try {

        const body = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array([1]));
                controller.close();
            }
        });

        const partReader = {
            readStream: jest.fn().mockResolvedValue({ ok: true }),
            parser: null,
            onPart: null
        };

        global.fetch = jest.fn().mockResolvedValue({
            headers: {
                get(name) {
                    if (String(name).toLowerCase() === "content-type")
                        return "application/dicom+json";
                    if (String(name).toLowerCase() === "content-length")
                        return "1";
                    return null;
                }
            },
            body: body
        });

        const reader = new DicomwebStreamReader(partReader);
        await reader.read(
            {
                baseUrl: "https://dicom.test/dicomweb",
                studyInstanceUid: "1.2.3"
            },
            {
                mode: "qido-search",
                level: "series",
                query: {
                    Modality: "MR"
                }
            }
        );

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
            "https://dicom.test/dicomweb/studies/1.2.3/series?Modality=MR",
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    Accept: "application/dicom+json"
                })
            })
        );

    } finally {
        global.fetch = originalFetch;
    }

});
