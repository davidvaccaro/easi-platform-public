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

test("Test: DicomBurnedInRedactionFilter supports ocr-regions mode via detector", async () => {

    var detector = {
        detectRegions: jest.fn(() => [{ x: 0, y: 0, width: 1, height: 1 }])
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            paddingX: 0,
            paddingY: 0
        }
    });

    const rgba = new Uint8Array([
        10, 11, 12, 255,
        20, 21, 22, 255
    ]);

    const transformed = await filter.transformFrameRGBA(null, { columns: 2, rows: 1 }, rgba, 0, 1);

    expect(detector.detectRegions).toHaveBeenCalledTimes(1);
    expect(Array.from(transformed)).toEqual([
        0, 0, 0, 255,
        20, 21, 22, 255
    ]);
});

test("Test: DicomBurnedInRedactionFilter rejects block-like bottom-center OCR candidates when imaging bounds are unavailable", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            noBoundsBottomOnlyGuardEnabled: true,
            noBoundsBottomOnlyMinGlyphScore: 0.45,
            noBoundsBottomOnlyMinComponentCount: 2,
            noBoundsBottomOnlyMaxComponentCoverage: 0.45,
            noBoundsBottomOnlyMaxHeightRatio: 0.035
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 40,
            y: 75,
            width: 20,
            height: 15,
            _glyphScore: 0.7,
            _componentCount: 1,
            _componentCoverage: 0.8
        }]),
        detectImagingBounds: jest.fn(() => null)
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            topZoneRatio: 0.24,
            bottomZoneRatio: 0.24,
            leftZoneRatio: 0.24,
            rightZoneRatio: 0.28
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    expect(Array.from(transformed)).toEqual(Array.from(rgba));

});

test("Test: DicomBurnedInRedactionFilter rejects core OCR candidates not surrounded by dark background", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            surroundBackgroundGateEnabled: true,
            surroundBackgroundCoreOnly: true,
            surroundBackgroundRingPadding: 3,
            surroundBackgroundDarkLumaMax: 72,
            surroundBackgroundMinDarkRatio: 0.55,
            surroundBackgroundMinSampleCount: 16,
            surroundBackgroundBypassGlyphScore: 0.8
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 45,
            y: 45,
            width: 8,
            height: 8,
            _glyphScore: 0.4,
            _componentCount: 3,
            _componentCoverage: 0.2
        }]),
        detectImagingBounds: jest.fn(() => null)
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    // Build a bright frame so the candidate's surround ring is non-background.
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 180;
        rgba[offset + 1] = 160;
        rgba[offset + 2] = 140;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    expect(Array.from(transformed)).toEqual(Array.from(rgba));

});

test("Test: DicomBurnedInRedactionFilter can redact outside detected imaging bounds in ocr-regions mode", async () => {

    var detector = {
        detectRegions: jest.fn(() => []),
        detectImagingBounds: jest.fn(() => ({ x: 2, y: 1, width: 2, height: 2 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: true
        }
    });

    const columns = 6;
    const rows = 4;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 100;
        rgba[offset + 1] = 100;
        rgba[offset + 2] = 100;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    expect(detector.detectRegions).toHaveBeenCalledTimes(1);
    expect(detector.detectImagingBounds).toHaveBeenCalledTimes(1);

    // Inside bounds stays unchanged.
    var insideOffset = (((1 * columns) + 2) * 4);
    expect(Array.from(transformed.slice(insideOffset, insideOffset + 4))).toEqual([100, 100, 100, 255]);

    // Outside bounds is redacted.
    var outsideOffset = (((0 * columns) + 0) * 4);
    expect(Array.from(transformed.slice(outsideOffset, outsideOffset + 4))).toEqual([0, 0, 0, 255]);

});

test("Test: DicomBurnedInRedactionFilter skips outside-bounds redaction when detected bounds are implausibly small", async () => {

    var detector = {
        detectRegions: jest.fn(() => []),
        detectImagingBounds: jest.fn(() => ({ x: 2, y: 1, width: 1, height: 1 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: true,
            minImagingBoundsAreaRatioForOutsideRedaction: 0.1
        }
    });

    const columns = 6;
    const rows = 4;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 100;
        rgba[offset + 1] = 100;
        rgba[offset + 2] = 100;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    expect(detector.detectRegions).toHaveBeenCalledTimes(1);
    expect(detector.detectImagingBounds).toHaveBeenCalledTimes(1);

    // No redaction should occur because outside-bounds redaction is skipped.
    expect(Array.from(transformed)).toEqual(Array.from(rgba));

});

test("Test: DicomBurnedInRedactionFilter promotes top OCR detections into a bounded top band", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: true,
            topZoneRatio: 0.5,
            topBandAnchorRatio: 0.5,
            topBandPaddingY: 0,
            topBandPaddingX: 0,
            topBandMaxRatio: 0.5,
            topBandMinRegionCount: 2,
            topBandMinCoverageRatio: 0,
            topBandExpandToFullWidth: false
        }, options ?? {})),
        detectRegions: jest.fn(() => [
            { x: 1, y: 0, width: 1, height: 1 },
            { x: 2, y: 0, width: 1, height: 1 }
        ])
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector
    });

    const columns = 4;
    const rows = 4;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    expect(detector.normalizeOptions).toHaveBeenCalledTimes(1);
    expect(detector.detectRegions).toHaveBeenCalledTimes(1);

    // Detected top OCR area is redacted via promoted top-band.
    var topDetectedOffset = (((0 * columns) + 2) * 4);
    expect(Array.from(transformed.slice(topDetectedOffset, topDetectedOffset + 4))).toEqual([0, 0, 0, 255]);

    // Top-right corner remains untouched because promotion is bounded.
    var topRightOffset = (((0 * columns) + 3) * 4);
    expect(Array.from(transformed.slice(topRightOffset, topRightOffset + 4))).toEqual([120, 120, 120, 255]);

    // Next row remains untouched.
    var nextRowOffset = (((1 * columns) + 3) * 4);
    expect(Array.from(transformed.slice(nextRowOffset, nextRowOffset + 4))).toEqual([120, 120, 120, 255]);

});

test("Test: DicomBurnedInRedactionFilter does not promote top band when detections are too sparse", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: true,
            topZoneRatio: 0.5,
            topBandAnchorRatio: 0.5,
            topBandPaddingY: 0,
            topBandMaxRatio: 0.5,
            topBandMinRegionCount: 2,
            topBandMinCoverageRatio: 0
        }, options ?? {})),
        detectRegions: jest.fn(() => [{ x: 1, y: 0, width: 1, height: 1 }])
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector
    });

    const columns = 4;
    const rows = 4;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    // The single detected pixel should be redacted.
    var detectedOffset = (((0 * columns) + 1) * 4);
    expect(Array.from(transformed.slice(detectedOffset, detectedOffset + 4))).toEqual([0, 0, 0, 255]);

    // Top-right corner should stay unchanged (no full-width top-band promotion).
    var topRightOffset = (((0 * columns) + 3) * 4);
    expect(Array.from(transformed.slice(topRightOffset, topRightOffset + 4))).toEqual([120, 120, 120, 255]);

});

test("Test: DicomBurnedInRedactionFilter does not promote top band when top detections are wide but sparse", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: true,
            topZoneRatio: 0.5,
            topBandAnchorRatio: 0.5,
            topBandPaddingY: 0,
            topBandPaddingX: 0,
            topBandMaxRatio: 0.5,
            topBandMinRegionCount: 2,
            topBandMinCoverageRatio: 0,
            topBandMinSpanOccupancyRatio: 0.75
        }, options ?? {})),
        // Two tiny detections near opposite edges (high span, low occupancy).
        detectRegions: jest.fn(() => [
            { x: 0, y: 0, width: 1, height: 1 },
            { x: 7, y: 0, width: 1, height: 1 }
        ])
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector
    });

    const columns = 8;
    const rows = 4;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    // Individual detections remain redacted.
    var leftOffset = (((0 * columns) + 0) * 4);
    var rightOffset = (((0 * columns) + 7) * 4);
    expect(Array.from(transformed.slice(leftOffset, leftOffset + 4))).toEqual([0, 0, 0, 255]);
    expect(Array.from(transformed.slice(rightOffset, rightOffset + 4))).toEqual([0, 0, 0, 255]);

    // Middle top stays untouched (no broad promoted top band).
    var midOffset = (((0 * columns) + 3) * 4);
    expect(Array.from(transformed.slice(midOffset, midOffset + 4))).toEqual([120, 120, 120, 255]);

});

test("Test: DicomBurnedInRedactionFilter does not promote top band when it significantly overlaps imaging bounds", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: true,
            topZoneRatio: 0.5,
            topBandAnchorRatio: 0.5,
            topBandPaddingY: 0,
            topBandMaxRatio: 0.5,
            topBandMinRegionCount: 2,
            topBandMinCoverageRatio: 0,
            topBandRespectImagingBounds: true,
            topBandMaxImagingOverlapRatio: 0.02
        }, options ?? {})),
        detectRegions: jest.fn(() => [
            { x: 1, y: 0, width: 1, height: 1 },
            { x: 2, y: 0, width: 1, height: 1 }
        ]),
        // Imaging bounds reaches into top rows, so full-width top-band would overlap too much.
        detectImagingBounds: jest.fn(() => ({ x: 0, y: 0, width: 4, height: 2 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector
    });

    const columns = 4;
    const rows = 4;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    // Top-right corner should remain unchanged (no full-width promotion).
    var topRightOffset = (((0 * columns) + 3) * 4);
    expect(Array.from(transformed.slice(topRightOffset, topRightOffset + 4))).toEqual([120, 120, 120, 255]);

});

test("Test: DicomBurnedInRedactionFilter keeps peripheral tiny OCR candidates via outside-zone relaxation", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            peripheralOutsideRelaxationEnabled: true
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            _componentCount: 1,
            _componentCoverage: 0.008,
            _glyphScore: 0.22
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 14, y: 14, width: 12, height: 12 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector
    });

    const columns = 40;
    const rows = 40;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    // Peripheral glyph-like candidate should remain and get redacted.
    var topLeftOffset = (((0 * columns) + 0) * 4);
    expect(Array.from(transformed.slice(topLeftOffset, topLeftOffset + 4))).toEqual([0, 0, 0, 255]);

});

test("Test: DicomBurnedInRedactionFilter rejects same tiny outside candidate when peripheral relaxation is disabled", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            peripheralOutsideRelaxationEnabled: false
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 0,
            y: 0,
            width: 1,
            height: 1,
            _componentCount: 1,
            _componentCoverage: 0.008,
            _glyphScore: 0.22
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 14, y: 14, width: 12, height: 12 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector
    });

    const columns = 40;
    const rows = 40;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    // Strict outside rules should reject this tiny candidate.
    var topLeftOffset = (((0 * columns) + 0) * 4);
    expect(Array.from(transformed.slice(topLeftOffset, topLeftOffset + 4))).toEqual([120, 120, 120, 255]);

});

test("Test: DicomBurnedInRedactionFilter keeps right-edge peripheral text-like OCR candidates when dark-surround evidence is strong", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            peripheralOutsideRelaxationEnabled: true,
            peripheralRightOutsideRelaxationEnabled: true,
            peripheralRightColorConsistencyBypassEnabled: true
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 34,
            y: 6,
            width: 6,
            height: 16,
            _componentCount: 3,
            _componentCoverage: 0.25,
            _glyphScore: 0.28
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 8, y: 8, width: 20, height: 20 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector
    });

    filter.resolveRegionForegroundColorProfile = jest.fn(() => ({
        count: 20,
        lumaStdDev: 10,
        dominantColorRatio: 0.05,
        topColorCoverage: 0.08,
        paletteRatio: 0.95
    }));
    filter.resolveRegionSurroundBackgroundProfile = jest.fn(() => ({
        count: 120,
        darkRatio: 0.9
    }));

    const columns = 40;
    const rows = 40;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    // Candidate should be retained and redacted.
    var rightEdgeOffset = (((10 * columns) + 35) * 4);
    expect(Array.from(transformed.slice(rightEdgeOffset, rightEdgeOffset + 4))).toEqual([0, 0, 0, 255]);
    expect(filter.resolveRegionForegroundColorProfile).toHaveBeenCalled();
    expect(filter.resolveRegionSurroundBackgroundProfile).toHaveBeenCalled();

});

test("Test: DicomBurnedInRedactionFilter rejects right-edge solid-bar OCR candidates despite right-edge relaxation", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            peripheralOutsideRelaxationEnabled: true,
            peripheralRightOutsideRelaxationEnabled: true
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 34,
            y: 6,
            width: 6,
            height: 16,
            _componentCount: 1,
            _componentCoverage: 0.95,
            _glyphScore: 0.5
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 8, y: 8, width: 20, height: 20 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector
    });

    filter.resolveRegionForegroundColorProfile = jest.fn(() => ({
        count: 20,
        lumaStdDev: 10,
        dominantColorRatio: 0.6,
        topColorCoverage: 0.8,
        paletteRatio: 0.3
    }));

    const columns = 40;
    const rows = 40;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    // Candidate should be rejected as solid bar (too few components / excessive coverage).
    var rightEdgeOffset = (((10 * columns) + 35) * 4);
    expect(Array.from(transformed.slice(rightEdgeOffset, rightEdgeOffset + 4))).toEqual([120, 120, 120, 255]);

});

test("Test: DicomBurnedInRedactionFilter drops pathological large OCR regions", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            maxOcrRegionAreaRatio: 0.15,
            maxCombinedRegionAreaRatio: 0.6
        }, options ?? {})),
        detectRegions: jest.fn(() => [{ x: 0, y: 0, width: 40, height: 40 }])
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector
    });

    const columns = 40;
    const rows = 40;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);
    expect(Array.from(transformed)).toEqual(Array.from(rgba));

});

test("Test: DicomBurnedInRedactionFilter retains OCR detections when outside-bounds regions exceed combined-area safety cap", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            maxOcrRegionAreaRatio: 0.15,
            maxCombinedRegionAreaRatio: 0.6,
            minImagingBoundsAreaRatioForOutsideRedaction: 0.1
        }, options ?? {})),
        detectRegions: jest.fn(() => [{ x: 5, y: 5, width: 10, height: 10 }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: true
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    // OCR region remains redacted.
    var ocrOffset = (((8 * columns) + 8) * 4);
    expect(Array.from(transformed.slice(ocrOffset, ocrOffset + 4))).toEqual([0, 0, 0, 255]);

    // Outside-bounds area is not blindly redacted when it exceeds combined-area safety cap.
    var outsideOffset = (((0 * columns) + 0) * 4);
    expect(Array.from(transformed.slice(outsideOffset, outsideOffset + 4))).toEqual([120, 120, 120, 255]);

});

test("Test: DicomBurnedInRedactionFilter rejects large OCR regions that are mostly inside imaging bounds", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: true,
            maxOcrInsideImagingOverlapRatio: 0.7,
            maxOcrInsideImagingAreaRatio: 0.01
        }, options ?? {})),
        // One large OCR candidate almost entirely inside imaging content.
        detectRegions: jest.fn(() => [{ x: 40, y: 40, width: 30, height: 20 }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);
    expect(Array.from(transformed)).toEqual(Array.from(rgba));

});

test("Test: DicomBurnedInRedactionFilter preserves small OCR regions inside imaging bounds", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: true,
            maxOcrInsideImagingOverlapRatio: 0.7,
            maxOcrInsideImagingAreaRatio: 0.01
        }, options ?? {})),
        // Small OCR candidate inside imaging content (expected to survive).
        detectRegions: jest.fn(() => [{ x: 45, y: 45, width: 8, height: 6 }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    var insideOffset = (((47 * columns) + 47) * 4);
    expect(Array.from(transformed.slice(insideOffset, insideOffset + 4))).toEqual([0, 0, 0, 255]);

});

test("Test: DicomBurnedInRedactionFilter rejects low glyph-score OCR regions inside imaging bounds", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: false,
            glyphScoreGateEnabled: true,
            minGlyphScore: 0.2,
            minGlyphScoreInsideImaging: 0.55,
            minInsideOverlapForGlyphGate: 0.3
        }, options ?? {})),
        detectRegions: jest.fn(() => [{ x: 45, y: 45, width: 8, height: 6, _glyphScore: 0.3 }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);
    expect(Array.from(transformed)).toEqual(Array.from(rgba));

});

test("Test: DicomBurnedInRedactionFilter preserves high glyph-score OCR regions inside imaging bounds", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: false,
            glyphScoreGateEnabled: true,
            minGlyphScore: 0.2,
            minGlyphScoreInsideImaging: 0.55,
            minInsideOverlapForGlyphGate: 0.3
        }, options ?? {})),
        detectRegions: jest.fn(() => [{ x: 45, y: 45, width: 8, height: 6, _glyphScore: 0.8 }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    var insideOffset = (((47 * columns) + 47) * 4);
    expect(Array.from(transformed.slice(insideOffset, insideOffset + 4))).toEqual([0, 0, 0, 255]);

});

test("Test: DicomBurnedInRedactionFilter preserves tiny high-glyph OCR regions near imaging content via inside-small-glyph relaxation", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: true,
            glyphScoreGateEnabled: true,
            minGlyphScore: 0.2,
            minGlyphScoreInsideImaging: 0.6,
            minInsideOverlapForGlyphGate: 0.35,
            insideSmallGlyphRelaxationEnabled: true,
            insideSmallGlyphMaxAreaRatio: 0.002,
            insideSmallGlyphMaxWidthRatio: 0.1,
            insideSmallGlyphMaxHeightRatio: 0.08,
            insideSmallGlyphMinGlyphScore: 0.22,
            insideSmallGlyphMinGlyphScoreCore: 0.3
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 45,
            y: 45,
            width: 4,
            height: 3,
            _glyphScore: 0.32,
            _componentCount: 1,
            _componentCoverage: 0.01
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    var insideOffset = (((46 * columns) + 46) * 4);
    expect(Array.from(transformed.slice(insideOffset, insideOffset + 4))).toEqual([0, 0, 0, 255]);

});

test("Test: DicomBurnedInRedactionFilter rejects tiny inside OCR regions in imaging core when glyph confidence is weak", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: true,
            glyphScoreGateEnabled: true,
            minGlyphScore: 0.2,
            minGlyphScoreInsideImaging: 0.6,
            minInsideOverlapForGlyphGate: 0.3,
            insideSmallGlyphRelaxationEnabled: true,
            insideSmallGlyphMinOverlapRatio: 0.2,
            insideSmallGlyphMaxAreaRatio: 0.008,
            insideSmallGlyphMaxWidthRatio: 0.18,
            insideSmallGlyphMaxHeightRatio: 0.12,
            insideSmallGlyphMinGlyphScore: 0.18,
            insideSmallGlyphMinGlyphScoreCore: 0.48
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 45,
            y: 45,
            width: 4,
            height: 3,
            _glyphScore: 0.32,
            _componentCount: 1,
            _componentCoverage: 0.01
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    var insideOffset = (((46 * columns) + 46) * 4);
    expect(Array.from(transformed.slice(insideOffset, insideOffset + 4))).toEqual([120, 120, 120, 255]);

});

test("Test: DicomBurnedInRedactionFilter rejects same tiny inside OCR region when inside-small-glyph relaxation is disabled", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: true,
            glyphScoreGateEnabled: true,
            minGlyphScore: 0.2,
            minGlyphScoreInsideImaging: 0.6,
            minInsideOverlapForGlyphGate: 0.35,
            insideSmallGlyphRelaxationEnabled: false
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 45,
            y: 45,
            width: 4,
            height: 3,
            _glyphScore: 0.32,
            _componentCount: 1,
            _componentCoverage: 0.01
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    var insideOffset = (((46 * columns) + 46) * 4);
    expect(Array.from(transformed.slice(insideOffset, insideOffset + 4))).toEqual([120, 120, 120, 255]);

});

test("Test: DicomBurnedInRedactionFilter preserves boundary-ring OCR regions near imaging edges", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: true,
            glyphScoreGateEnabled: true,
            minGlyphScore: 0.2,
            minGlyphScoreInsideImaging: 0.6,
            minGlyphScoreBoundaryRing: 0.3,
            minInsideOverlapForGlyphGate: 0.35,
            boundaryRingEnabled: true,
            boundaryRingWidth: 8,
            boundaryRingWidthRatio: 0,
            maxOcrInsideImagingOverlapRatio: 0.65,
            maxOcrInsideImagingAreaRatio: 0.006
        }, options ?? {})),
        // Slightly overlaps imaging bounds and is near the left imaging edge.
        detectRegions: jest.fn(() => [{
            x: 18,
            y: 40,
            width: 8,
            height: 6,
            _glyphScore: 0.35,
            _componentCount: 3,
            _componentCoverage: 0.24
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    var boundaryOffset = (((42 * columns) + 19) * 4);
    expect(Array.from(transformed.slice(boundaryOffset, boundaryOffset + 4))).toEqual([0, 0, 0, 255]);

});

test("Test: DicomBurnedInRedactionFilter rejects boundary-ring OCR regions with weak component structure", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: true,
            glyphScoreGateEnabled: true,
            minGlyphScore: 0.2,
            minGlyphScoreInsideImaging: 0.6,
            minGlyphScoreBoundaryRing: 0.28,
            minInsideOverlapForGlyphGate: 0.35,
            boundaryRingEnabled: true,
            boundaryRingWidth: 8,
            boundaryRingWidthRatio: 0,
            minBoundaryRingComponentCount: 2,
            minInsideImagingComponentCoverage: 0.01,
            maxInsideImagingComponentCoverage: 0.8,
            maxOcrInsideImagingOverlapRatio: 0.65,
            maxOcrInsideImagingAreaRatio: 0.006
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 18,
            y: 40,
            width: 8,
            height: 6,
            _glyphScore: 0.45,
            _componentCount: 1,
            _componentCoverage: 0.2
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);

    expect(Array.from(transformed)).toEqual(Array.from(rgba));

});

test("Test: DicomBurnedInRedactionFilter rejects oversized low-overlap boundary-ring OCR regions", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: true,
            glyphScoreGateEnabled: true,
            minGlyphScore: 0.2,
            minGlyphScoreBoundaryRing: 0.28,
            minInsideOverlapForGlyphGate: 0.35,
            boundaryRingEnabled: true,
            boundaryRingWidth: 12,
            boundaryRingWidthRatio: 0,
            maxBoundaryRingRegionWidthRatio: 0.2,
            maxBoundaryRingRegionHeightRatio: 0.2
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 0,
            y: 0,
            width: 80,
            height: 22,
            _glyphScore: 0.9,
            _componentCount: 8,
            _componentCoverage: 0.12
        }]),
        // Imaging content near top-right to trigger boundary-ring classification with low overlap.
        detectImagingBounds: jest.fn(() => ({ x: 60, y: 20, width: 30, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);
    expect(Array.from(transformed)).toEqual(Array.from(rgba));

});

test("Test: DicomBurnedInRedactionFilter rejects inside-imaging OCR regions with high foreground color dispersion", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: false,
            glyphScoreGateEnabled: true,
            minGlyphScore: 0.2,
            minGlyphScoreInsideImaging: 0.6,
            minInsideOverlapForGlyphGate: 0.35,
            foregroundColorConsistencyGateEnabled: true,
            minForegroundPixelCountInsideImaging: 10,
            maxForegroundLumaStdDevInsideImaging: 0.1,
            minDominantColorRatioInsideImaging: 0.9
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 42,
            y: 42,
            width: 20,
            height: 10,
            _glyphScore: 0.85,
            _componentCount: 8,
            _componentCoverage: 0.22
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    for (var row = 42; row < 52; row++) {
        for (var column = 42; column < 62; column++) {
            var regionOffset = (((row * columns) + column) * 4);
            // Deterministic high-dispersion pseudo-random bright colors.
            var base = ((row * 37) + (column * 53)) % 56;
            rgba[regionOffset + 0] = (200 + ((base * 3) % 56));
            rgba[regionOffset + 1] = (200 + ((base * 7) % 56));
            rgba[regionOffset + 2] = (200 + ((base * 11) % 56));
            rgba[regionOffset + 3] = 255;
        }
    }

    var original = new Uint8Array(rgba);
    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);
    expect(Array.from(transformed)).toEqual(Array.from(original));

});

test("Test: DicomBurnedInRedactionFilter rejects inside-imaging OCR regions with weak dominant color concentration", async () => {

    var detector = {
        normalizeOptions: jest.fn((options) => Object.assign({
            promoteTopBandFromDetections: false,
            rejectOcrInsideImagingBounds: false,
            glyphScoreGateEnabled: true,
            minGlyphScore: 0.2,
            minGlyphScoreInsideImaging: 0.6,
            minInsideOverlapForGlyphGate: 0.35,
            foregroundColorConsistencyGateEnabled: true,
            minForegroundPixelCountInsideImaging: 10,
            maxForegroundLumaStdDevInsideImaging: 100,
            minDominantColorRatioInsideImaging: 0.05,
            minTopColorCoverageInsideImaging: 0.8,
            maxForegroundPaletteRatioInsideImaging: 0.2
        }, options ?? {})),
        detectRegions: jest.fn(() => [{
            x: 42,
            y: 42,
            width: 20,
            height: 10,
            _glyphScore: 0.85,
            _componentCount: 8,
            _componentCoverage: 0.22
        }]),
        detectImagingBounds: jest.fn(() => ({ x: 20, y: 20, width: 60, height: 60 }))
    };

    const filter = new DicomBurnedInRedactionFilter(null, {
        mode: BurnedInRedactionModes.OCR_REGIONS,
        ocrRegionDetector: detector,
        ocrRegions: {
            redactOutsideImagingBounds: false
        }
    });

    const columns = 100;
    const rows = 100;
    const rgba = new Uint8Array(columns * rows * 4);
    for (var pixelIndex = 0; pixelIndex < (columns * rows); pixelIndex++) {
        var offset = (pixelIndex * 4);
        rgba[offset + 0] = 120;
        rgba[offset + 1] = 120;
        rgba[offset + 2] = 120;
        rgba[offset + 3] = 255;
    }

    for (var row = 42; row < 52; row++) {
        for (var column = 42; column < 62; column++) {
            var regionOffset = (((row * columns) + column) * 4);
            // Deterministic vivid colors to spread the foreground palette.
            var index = ((row - 42) * 20) + (column - 42);
            rgba[regionOffset + 0] = (180 + ((index * 19) % 76));
            rgba[regionOffset + 1] = (180 + ((index * 23) % 76));
            rgba[regionOffset + 2] = (180 + ((index * 29) % 76));
            rgba[regionOffset + 3] = 255;
        }
    }

    var original = new Uint8Array(rgba);
    const transformed = await filter.transformFrameRGBA(null, { columns, rows }, rgba, 0, 1);
    expect(Array.from(transformed)).toEqual(Array.from(original));

});
