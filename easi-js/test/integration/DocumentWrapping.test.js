import EASI from "../../src/EASI.js";
import UnwrappedDocument from "../../src/dicom/utilities/UnwrappedDocument.js";

function toJsonBytes(value) {
    return (new TextEncoder()).encode(JSON.stringify(value));
}

test("Test: pipeline wraps one JSON document descriptor to DICOM and unwraps it back", async () => {

    var descriptor = {
        mimeType: "application/pdf",
        title: "Sample Report",
        bytes: [37, 80, 68, 70, 45, 49, 46, 55]
    };

    var wrappedBytes = await EASI.pipelineBuilder()
        .fromByteStream()
        .ofJsonData()
        .toWrappedDocuments()
        .build()
        .process(toJsonBytes(descriptor), { contentType: "application/json" });

    expect(wrappedBytes instanceof Uint8Array).toBe(true);
    expect(wrappedBytes.length).toBeGreaterThan(132);

    var unwrapped = await EASI.pipelineBuilder()
        .fromByteStream()
        .ofDicomData()
        .toUnwrappedDocuments()
        .build()
        .process(wrappedBytes, { contentType: "application/dicom" });

    expect(unwrapped).not.toBeNull();
    expect(unwrapped).toBeInstanceOf(UnwrappedDocument);
    expect(unwrapped.mimeType).toBe("application/pdf");
    expect(unwrapped.title).toBe("Sample Report");
    expect(Array.from(unwrapped.bytes)).toEqual(descriptor.bytes);

});

test("Test: pipeline wraps a JSON array of descriptors to DICOM byte payload array", async () => {

    var descriptors = [
        {
            mimeType: "application/pdf",
            title: "First",
            text: "Hello First"
        },
        {
            mimeType: "application/pdf",
            title: "Second",
            text: "Hello Second"
        }
    ];

    var wrapped = await EASI.pipelineBuilder()
        .fromByteStream()
        .ofJsonData()
        .toWrappedDocuments()
        .build()
        .process(toJsonBytes(descriptors), { contentType: "application/json" });

    expect(wrapped.count).toBe(2);
    expect(wrapped.length).toBe(2);
    expect(wrapped[0] instanceof Uint8Array).toBe(true);
    expect(wrapped[1] instanceof Uint8Array).toBe(true);

    var unwrappedFirst = await EASI.pipelineBuilder()
        .fromByteStream()
        .ofDicomData()
        .toUnwrappedDocuments()
        .build()
        .process(wrapped[0], { contentType: "application/dicom" });

    expect(unwrappedFirst).toBeInstanceOf(UnwrappedDocument);
    expect(unwrappedFirst.mimeType).toBe("application/pdf");
    expect(unwrappedFirst.title).toBe("First");

});

test("Test: pipeline wraps direct raw bytes to wrapped-document DICOM", async () => {

    var rawPayload = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);

    var wrappedBytes = await EASI.pipelineBuilder()
        .fromByteStream()
        .ofByteData()
        .toWrappedDocuments({
            title: "Raw Bytes Report"
        })
        .build()
        .process(rawPayload, { contentType: "application/pdf" });

    expect(wrappedBytes instanceof Uint8Array).toBe(true);
    expect(wrappedBytes.length).toBeGreaterThan(132);

    var unwrapped = await EASI.pipelineBuilder()
        .fromByteStream()
        .ofDicomData()
        .toUnwrappedDocuments()
        .build()
        .process(wrappedBytes, { contentType: "application/dicom" });

    expect(unwrapped).not.toBeNull();
    expect(unwrapped).toBeInstanceOf(UnwrappedDocument);
    expect(unwrapped.mimeType).toBe("application/pdf");
    expect(unwrapped.title).toBe("Raw Bytes Report");
    expect(Array.from(unwrapped.bytes)).toEqual(Array.from(rawPayload));

});
