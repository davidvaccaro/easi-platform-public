import DicomwebStreamReader from "../../src/readers/DicomwebStreamReader.js";
import EASI from "../../src/EASI.js";
import Tag from "../../src/dicom/Tag.js";

function concatBytes(chunks) {
    const result = new Uint8Array(chunks.reduce((length, chunk) => length + chunk.length, 0));
    let offset = 0;
    chunks.forEach((chunk) => {
        result.set(chunk, offset);
        offset += chunk.length;
    });
    return result;
}

function uidElement(group, element, uid) {
    const value = new TextEncoder().encode(uid);
    const length = value.length + (value.length % 2);
    const bytes = new Uint8Array(8 + length);
    const header = new DataView(bytes.buffer);
    header.setUint16(0, group, true);
    header.setUint16(2, element, true);
    bytes.set([85, 73], 4); // UI
    header.setUint16(6, length, true);
    bytes.set(value, 8);
    return bytes;
}

function syntheticDicom(uid) {
    const metaBody = uidElement(0x0002, 0x0010, "1.2.840.10008.1.2.1");
    const metaLength = new Uint8Array([2, 0, 0, 0, 85, 76, 4, 0, 0, 0, 0, 0]);
    new DataView(metaLength.buffer).setUint32(8, metaBody.length, true);
    return concatBytes([
        new Uint8Array(128),
        new TextEncoder().encode("DICM"),
        metaLength,
        metaBody,
        uidElement(0x0008, 0x0016, "1.2.840.10008.5.1.4.1.1.2"),
        uidElement(0x0008, 0x0018, uid)
    ]);
}

function chunkedResponse(bytes, contentType, chunkSize = 7) {
    return new Response(new ReadableStream({
        start(controller) {
            for (let offset = 0; offset < bytes.length; offset += chunkSize)
                controller.enqueue(bytes.subarray(offset, offset + chunkSize));
            controller.close();
        }
    }), { headers: { "Content-Type": contentType } });
}

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
        expect(global.fetch.mock.calls[0][1].mode).toBeUndefined();

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

test("Test: DICOMweb merges HeadersInit values case-insensitively and preserves explicit Accept", () => {

    const reader = new DicomwebStreamReader();
    const metadata = reader.buildRequestOptions({
        headers: { ACCEPT: "application/dicom", "X-Test": "source" },
        request: { headers: [["accept", "application/dicom+xml"], ["x-test", "source-request"]] }
    }, {
        headers: new Headers({ "AcCePt": "application/dicom+json", "X-TEST": "options" }),
        request: { headers: [["x-Test", "options-request"]] }
    }, "wado-metadata");

    expect(metadata.requestOptions.headers).toEqual({
        accept: "application/dicom+json",
        "x-Test": "options-request"
    });
    expect(Object.keys(metadata.requestOptions.headers).some((name) => /^\d+$/.test(name))).toBe(false);

});

test("Test: explicit DICOMweb accept option overrides a caller header without duplicate names", () => {

    const reader = new DicomwebStreamReader();
    const metadata = reader.buildRequestOptions({
        headers: { accept: "application/dicom+xml" },
        accept: "application/dicom"
    }, {
        accept: "multipart/related; type=application/dicom"
    }, "wado-instance");

    expect(metadata.requestOptions.headers).toEqual({ Accept: "multipart/related; type=application/dicom" });

});

test("Test: DICOMweb operation mode stays separate from nested fetch mode", () => {

    const reader = new DicomwebStreamReader();
    const metadata = reader.buildRequestOptions({
        mode: "wado-metadata",
        request: { mode: "same-origin" }
    }, {
        mode: "qido-search",
        request: { mode: "cors" }
    }, "qido-search");

    expect(metadata.requestOptions.mode).toBe("cors");

});

test("Test: explicit DICOMweb URLs append merged query options before a fragment", () => {

    const reader = new DicomwebStreamReader();
    const url = reader.buildUrlFromSource({
        url: "https://dicom.test/studies?limit=10#results",
        query: { Modality: "CT", includefield: ["StudyDate", "StudyTime"] }
    }, {
        query: { Modality: "MR", offset: 0, ignored: null }
    }, "qido-search");

    expect(url).toBe("https://dicom.test/studies?limit=10&Modality=MR&includefield=StudyDate&includefield=StudyTime&offset=0#results");

});

test("Test: QIDO pipeline parses chunked DICOM JSON and forwards the fetch mode", async () => {

    const originalFetch = global.fetch;

    try {
        const metadata = new TextEncoder().encode(JSON.stringify([
            { "00080018": { vr: "UI", Value: ["1.2.3.1"] } },
            { "00080018": { vr: "UI", Value: ["1.2.3.2"] } }
        ]));
        global.fetch = jest.fn().mockResolvedValue(chunkedResponse(metadata, "Application/DICOM+JSON"));

        const pipeline = EASI.pipelineBuilder().fromDicomweb().ofDicomMetadata().toInstances().build();
        const result = await pipeline.process({
            source: "https://dicom.test/studies",
            sourceOptions: {
                mode: "qido-search",
                query: { StudyDate: "20260101" },
                request: { mode: "cors" }
            }
        });

        expect(result.count).toBe(2);
        expect(result[0].dataSet.value(Tag.SOPInstanceUID)).toBe("1.2.3.1");
        expect(result[1].dataSet.value(Tag.SOPInstanceUID)).toBe("1.2.3.2");
        expect(global.fetch).toHaveBeenCalledWith("https://dicom.test/studies?StudyDate=20260101", expect.objectContaining({ mode: "cors" }));
    } finally {
        global.fetch = originalFetch;
    }

});

test("Test: WADO pipeline parses two binary DICOM parts with a mixed-case boundary across chunks", async () => {

    const originalFetch = global.fetch;

    try {
        const boundary = "AaB03x=EASI";
        const encode = (value) => new TextEncoder().encode(value);
        const bytes = concatBytes([
            encode("--" + boundary + "\r\nContent-Type: application/dicom\r\n\r\n"),
            syntheticDicom("1.2.3.1"),
            encode("\r\n--" + boundary + "\r\nContent-Type: application/dicom\r\n\r\n"),
            syntheticDicom("1.2.3.2"),
            encode("\r\n--" + boundary + "--\r\n")
        ]);
        global.fetch = jest.fn().mockResolvedValue(chunkedResponse(bytes,
            'Multipart/Related; TYPE="Application/DICOM"; BOUNDARY="' + boundary + '"'));

        const emitted = [];
        const pipeline = EASI.pipelineBuilder().fromDicomweb().ofDicomData().toInstances().build();
        const result = await pipeline.process({
            source: "https://dicom.test/instances",
            sourceOptions: { onEmit: (instance) => emitted.push(instance) }
        });

        expect(emitted).toHaveLength(2);
        expect(emitted[0].dataSet.value(Tag.SOPInstanceUID)).toBe("1.2.3.1");
        expect(emitted[1][1].dataSet.value(Tag.SOPInstanceUID)).toBe("1.2.3.2");
        expect(result.count).toBe(2);
        expect(result[0].dataSet.value(Tag.SOPInstanceUID)).toBe("1.2.3.1");
        expect(result[1].dataSet.value(Tag.SOPInstanceUID)).toBe("1.2.3.2");
    } finally {
        global.fetch = originalFetch;
    }

});

test.each([400, 404, 500])("Test: DICOMweb pipeline rejects HTTP %s before parsing a valid metadata body", async (status) => {

    const originalFetch = global.fetch;

    try {
        const cancel = jest.fn();
        const body = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('[{"00080018":{"vr":"UI","Value":["1.2.3"]}}]'));
            },
            cancel
        });
        global.fetch = jest.fn().mockResolvedValue(new Response(body, { status, headers: { "Content-Type": "application/dicom+json" } }));
        const emitted = jest.fn();
        const pipeline = EASI.pipelineBuilder().fromDicomweb().ofDicomMetadata().toInstances().build();

        await expect(pipeline.process({ source: "https://dicom.test/studies", sourceOptions: { onEmit: emitted } })).rejects.toThrow(
            "DICOMweb request failed for https://dicom.test/studies: " + status
        );
        expect(emitted).not.toHaveBeenCalled();
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(body.locked).toBe(false);
    } finally {
        global.fetch = originalFetch;
    }

});

test("Test: DICOMweb missing-body errors include the URL", async () => {

    const originalFetch = global.fetch;

    try {
        global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
        await expect(new DicomwebStreamReader().read("https://dicom.test/empty")).rejects.toThrow(
            "Invalid DICOMweb response for https://dicom.test/empty. Missing response body stream."
        );
    } finally {
        global.fetch = originalFetch;
    }

});

test("Test: DICOMweb abort after headers cancels the body without starting the parser", async () => {

    const originalFetch = global.fetch;

    try {
        const controller = new AbortController();
        const abortError = new Error("Request cancelled");
        const cancel = jest.fn();
        const body = new ReadableStream({ cancel });
        const partReader = { readStream: jest.fn() };
        global.fetch = jest.fn().mockImplementation(async () => {
            controller.abort(abortError);
            return { ok: true, status: 200, body };
        });

        await expect(new DicomwebStreamReader(partReader).read("https://dicom.test/data", {
            signal: controller.signal
        })).rejects.toBe(abortError);
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(partReader.readStream).not.toHaveBeenCalled();
    } finally {
        global.fetch = originalFetch;
    }

});

test("Test: DICOMweb pipeline cancels an unused body when parser session initialization fails", async () => {

    const originalFetch = global.fetch;

    try {
        const cancel = jest.fn();
        const body = new ReadableStream({ cancel });
        const bodyCancel = jest.spyOn(body, "cancel");
        global.fetch = jest.fn().mockResolvedValue(new Response(body, {
            headers: { "Content-Type": "application/dicom+json" }
        }));
        const failure = new Error("Session initialization failed");
        const pipeline = EASI.pipelineBuilder().fromDicomweb().ofDicomMetadata().toInstances().build();
        pipeline.parser.resetSession = jest.fn(() => { throw failure; });
        const parse = jest.spyOn(pipeline.parser, "parse");

        await expect(pipeline.process("https://dicom.test/metadata")).rejects.toBe(failure);
        expect(parse).not.toHaveBeenCalled();
        expect(bodyCancel).toHaveBeenCalledTimes(1);
        expect(cancel).toHaveBeenCalledTimes(1);
        expect(cancel).toHaveBeenCalledWith(failure);
        expect(body.locked).toBe(false);
    } finally {
        global.fetch = originalFetch;
    }

});

test("Test: DICOMweb pipeline rejects a complete metadata part in a truncated multipart envelope", async () => {

    const originalFetch = global.fetch;

    try {
        const boundary = "AaB03x=EASI";
        const bytes = new TextEncoder().encode(
            "--" + boundary + "\r\nContent-Type: application/dicom+json\r\n\r\n"
            + '[{"00080018":{"vr":"UI","Value":["1.2.3"]}}]'
        );
        const response = chunkedResponse(bytes,
            'multipart/related; type="application/dicom+json"; boundary="' + boundary + '"');
        const emitted = jest.fn();
        global.fetch = jest.fn().mockResolvedValue(response);
        const pipeline = EASI.pipelineBuilder().fromDicomweb().ofDicomMetadata().toInstances().build();

        await expect(pipeline.process({
            source: "https://dicom.test/metadata",
            sourceOptions: { mode: "wado-metadata", onEmit: emitted }
        })).rejects.toThrow(/Missing closing boundary/i);
        expect(emitted).not.toHaveBeenCalled();
        expect(response.body.locked).toBe(false);
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
