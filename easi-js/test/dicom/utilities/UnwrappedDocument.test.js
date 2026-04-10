import UnwrappedDocument from "../../../src/dicom/utilities/UnwrappedDocument.js";

test("Test: UnwrappedDocument normalizes byte-like values and declared length", () => {
    var document = new UnwrappedDocument({
        sopClassUid: "1.2.3",
        sopInstanceUid: "1.2.3.4",
        title: "Report",
        mimeType: "application/pdf",
        extension: "pdf",
        fileName: "Report.pdf",
        bytes: [1, 2, 3, 4],
        declaredByteLength: "3",
        text: null
    });

    expect(document.sopClassUid).toBe("1.2.3");
    expect(document.sopInstanceUid).toBe("1.2.3.4");
    expect(document.fileName).toBe("Report.pdf");
    expect(document.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(document.bytes)).toEqual([1, 2, 3, 4]);
    expect(document.byteLength).toBe(4);
    expect(document.declaredByteLength).toBe(3);
});

test("Test: UnwrappedDocument defaults to empty payload when bytes are invalid", () => {
    var document = new UnwrappedDocument({
        bytes: null,
        declaredByteLength: -1
    });

    expect(document.bytes).toBeInstanceOf(Uint8Array);
    expect(document.byteLength).toBe(0);
    expect(document.declaredByteLength).toBeNull();
    expect(document.mimeType).toBe("application/octet-stream");
    expect(document.extension).toBe("bin");
});
