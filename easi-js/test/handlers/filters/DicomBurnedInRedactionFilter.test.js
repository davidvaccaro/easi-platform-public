import DicomBurnedInRedactionFilter, { BurnedInRedactionActions, BurnedInRedactionModes } from "../../../src/handlers/filters/DicomBurnedInRedactionFilter.js";
import TransferSyntax from "../../../src/dicom/TransferSyntax.js";

test("Test: DicomBurnedInRedactionFilter defaults to regions mode and preserves transfer syntax by default", () => {
    const filter = new DicomBurnedInRedactionFilter(null, {
        regions: [{ x: 0, y: 0, width: 1, height: 1 }]
    });

    expect(filter.redaction.mode).toBe(BurnedInRedactionModes.REGIONS);
    expect(filter.preserveTransferSyntax).toBe(true);
    expect(filter.requiresPixelPayloadTranscode(null, null)).toBe(true);
});

test("Test: DicomBurnedInRedactionFilter rejects unsupported mode", () => {
    expect(() => new DicomBurnedInRedactionFilter(null, {
        mode: "ocr",
        regions: []
    })).toThrow();
});

test("Test: DicomBurnedInRedactionFilter supports function shorthand options for regions", async () => {
    const regions = jest.fn(() => [{ x: 1, y: 0, width: 1, height: 1 }]);
    const filter = new DicomBurnedInRedactionFilter(null, regions);

    const rgba = new Uint8Array([
        10, 11, 12, 255,
        20, 21, 22, 255
    ]);

    const state = {
        columns: 2,
        rows: 1,
        sourceTransferSyntax: TransferSyntax.ExplicitVRLittleEndian
    };

    const transformed = await filter.transformFrameRGBA(null, state, rgba, 0, 1);

    expect(regions).toHaveBeenCalledTimes(1);
    expect(Array.from(transformed)).toEqual([
        10, 11, 12, 255,
        0, 0, 0, 255
    ]);
});

test("Test: DicomBurnedInRedactionFilter applies white constant fill action", async () => {
    const filter = new DicomBurnedInRedactionFilter(null, {
        action: BurnedInRedactionActions.WHITE,
        regions: [{ x: 0, y: 0, width: 1, height: 1 }]
    });

    const rgba = new Uint8Array([
        1, 2, 3, 255,
        4, 5, 6, 255
    ]);

    const transformed = await filter.transformFrameRGBA(null, { columns: 2, rows: 1 }, rgba, 0, 1);

    expect(Array.from(transformed)).toEqual([
        255, 255, 255, 255,
        4, 5, 6, 255
    ]);
});

test("Test: DicomBurnedInRedactionFilter applies constant scalar fill action", async () => {
    const filter = new DicomBurnedInRedactionFilter(null, {
        action: BurnedInRedactionActions.CONSTANT,
        fill: 64,
        regions: [{ x: 1, y: 0, width: 1, height: 1 }]
    });

    const rgba = new Uint8Array([
        1, 2, 3, 255,
        4, 5, 6, 255
    ]);

    const transformed = await filter.transformFrameRGBA(null, { columns: 2, rows: 1 }, rgba, 0, 1);

    expect(Array.from(transformed)).toEqual([
        1, 2, 3, 255,
        64, 64, 64, 255
    ]);
});

