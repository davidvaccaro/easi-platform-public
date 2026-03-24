import OcrRegionDetector from "../../../../src/handlers/filters/ocr/OcrRegionDetector.js";

function drawRect(rgba, columns, x, y, width, height, red, green, blue, alpha = 255) {
    for (var row = y; row < (y + height); row++) {
        for (var column = x; column < (x + width); column++) {
            var offset = (((row * columns) + column) * 4);
            rgba[offset + 0] = red;
            rgba[offset + 1] = green;
            rgba[offset + 2] = blue;
            rgba[offset + 3] = alpha;
        }
    }
}

function containsPoint(regions, x, y) {
    return regions.some(region => (
        (x >= region.x)
        && (x < (region.x + region.width))
        && (y >= region.y)
        && (y < (region.y + region.height))
    ));
}

function createDetectionOptions(overrides = {}) {
    return Object.assign({
        detectBrightText: true,
        detectDarkText: false,
        highThreshold: 200,
        lowThreshold: 50,
        minAlpha: 1,
        minComponentArea: 1,
        minComponentWidth: 1,
        minComponentHeight: 1,
        maxComponentAreaRatio: 1,
        maxComponentWidthRatio: 1,
        maxComponentHeightRatio: 1,
        maxComponentAspectRatio: 100,
        mergeGapX: 0,
        mergeGapY: 0,
        paddingX: 0,
        paddingY: 0,
        minRegionArea: 1,
        maxRegions: 64
    }, overrides);
}

test("Test: OcrRegionDetector detects bright text-like regions", () => {

    const detector = new OcrRegionDetector();
    const columns = 16;
    const rows = 8;
    const rgba = new Uint8Array(columns * rows * 4);

    drawRect(rgba, columns, 1, 1, 3, 2, 255, 255, 255, 255);
    drawRect(rgba, columns, 10, 1, 4, 2, 255, 255, 255, 255);

    const regions = detector.detectRegions(rgba, columns, rows, createDetectionOptions());

    expect(regions.length).toBeGreaterThanOrEqual(2);
    expect(containsPoint(regions, 2, 1)).toBe(true);
    expect(containsPoint(regions, 11, 1)).toBe(true);

});

test("Test: OcrRegionDetector detects dark text-like regions", () => {

    const detector = new OcrRegionDetector();
    const columns = 16;
    const rows = 8;
    const rgba = new Uint8Array(columns * rows * 4);

    // Start with bright background.
    drawRect(rgba, columns, 0, 0, columns, rows, 255, 255, 255, 255);
    drawRect(rgba, columns, 2, 2, 4, 2, 0, 0, 0, 255);

    const regions = detector.detectRegions(rgba, columns, rows, createDetectionOptions({
        detectBrightText: false,
        detectDarkText: true,
        highThreshold: 220,
        lowThreshold: 40
    }));

    expect(regions.length).toBeGreaterThanOrEqual(1);
    expect(containsPoint(regions, 3, 2)).toBe(true);

});

test("Test: OcrRegionDetector suppresses saturated center content while preserving white edge text", () => {

    const detector = new OcrRegionDetector();
    const columns = 32;
    const rows = 20;
    const rgba = new Uint8Array(columns * rows * 4);

    // Dark background.
    drawRect(rgba, columns, 0, 0, columns, rows, 0, 0, 0, 255);

    // Simulated bright saturated image content in the center.
    drawRect(rgba, columns, 10, 6, 12, 8, 255, 220, 0, 255);

    // Simulated white text near the top-left edge.
    drawRect(rgba, columns, 2, 2, 4, 2, 255, 255, 255, 255);

    const regions = detector.detectRegions(rgba, columns, rows, createDetectionOptions({
        detectBrightText: true,
        detectDarkText: false,
        highThreshold: 200,
        usePeripheralZones: true,
        topZoneRatio: 0.25,
        bottomZoneRatio: 0.2,
        leftZoneRatio: 0.2,
        rightZoneRatio: 0.2
    }));

    expect(containsPoint(regions, 3, 2)).toBe(true);
    expect(containsPoint(regions, 16, 10)).toBe(false);

});

test("Test: OcrRegionDetector default options detect white edge text and avoid center saturated wedge", () => {

    const detector = new OcrRegionDetector();
    const columns = 64;
    const rows = 48;
    const rgba = new Uint8Array(columns * rows * 4);

    // Dark background.
    drawRect(rgba, columns, 0, 0, columns, rows, 0, 0, 0, 255);

    // Simulated ultrasound center wedge (saturated/brighter area).
    drawRect(rgba, columns, 20, 12, 24, 24, 250, 210, 0, 255);

    // White overlay text blocks near top-left and top-right.
    drawRect(rgba, columns, 2, 2, 8, 3, 255, 255, 255, 255);
    drawRect(rgba, columns, 50, 4, 10, 3, 255, 255, 255, 255);

    const regions = detector.detectRegions(rgba, columns, rows);

    expect(regions.length).toBeGreaterThanOrEqual(1);
    expect(containsPoint(regions, 4, 3)).toBe(true);
    expect(containsPoint(regions, 55, 5)).toBe(true);
    expect(containsPoint(regions, 28, 20)).toBe(false);

});

test("Test: OcrRegionDetector detects bright chromatic edge overlays and tiny remnants when chroma compactness is relaxed", () => {

    const detector = new OcrRegionDetector();
    const columns = 96;
    const rows = 64;
    const rgba = new Uint8Array(columns * rows * 4);

    // Dark background.
    drawRect(rgba, columns, 0, 0, columns, rows, 0, 0, 0, 255);

    // Simulated center imaging wedge.
    drawRect(rgba, columns, 30, 14, 36, 30, 250, 210, 0, 255);

    // Simulated bright chromatic text near top-left and top-right.
    drawRect(rgba, columns, 3, 3, 12, 3, 255, 240, 140, 255);
    drawRect(rgba, columns, 74, 4, 16, 3, 140, 240, 255, 255);

    // Tiny bright remnants near right edge.
    drawRect(rgba, columns, 91, 18, 2, 2, 255, 255, 255, 255);
    drawRect(rgba, columns, 90, 44, 2, 2, 255, 250, 180, 255);

    const regions = detector.detectRegions(rgba, columns, rows, createDetectionOptions({
        autoBrightChannelDeltaEnabled: false,
        maxBrightChannelDelta: 255,
        minComponentArea: 1,
        minRegionArea: 1
    }));

    expect(regions.length).toBeGreaterThanOrEqual(2);
    expect(containsPoint(regions, 6, 4)).toBe(true);
    expect(containsPoint(regions, 80, 5)).toBe(true);
    expect(containsPoint(regions, 91, 18)).toBe(true);
    expect(containsPoint(regions, 90, 44)).toBe(true);
    expect(containsPoint(regions, 48, 28)).toBe(false);

});

test("Test: OcrRegionDetector returns no regions when disabled", () => {

    const detector = new OcrRegionDetector();
    const columns = 8;
    const rows = 4;
    const rgba = new Uint8Array(columns * rows * 4);

    drawRect(rgba, columns, 1, 1, 2, 2, 255, 255, 255, 255);

    const regions = detector.detectRegions(rgba, columns, rows, createDetectionOptions({
        enabled: false
    }));

    expect(regions).toEqual([]);

});

test("Test: OcrRegionDetector glyph scoring gate rejects one large non-glyph blob", () => {

    const detector = new OcrRegionDetector();
    const columns = 48;
    const rows = 24;
    const rgba = new Uint8Array(columns * rows * 4);

    // Dark background + one large bright blob near top-left.
    drawRect(rgba, columns, 0, 0, columns, rows, 0, 0, 0, 255);
    drawRect(rgba, columns, 2, 2, 16, 8, 255, 255, 255, 255);

    const regions = detector.detectRegions(rgba, columns, rows, createDetectionOptions({
        glyphScoreGateEnabled: true,
        minGlyphScore: 0.4,
        paddingX: 0,
        paddingY: 0
    }));

    expect(regions).toEqual([]);

});

test("Test: OcrRegionDetector glyph scoring gate keeps text-like fragments", () => {

    const detector = new OcrRegionDetector();
    const columns = 48;
    const rows = 24;
    const rgba = new Uint8Array(columns * rows * 4);

    // Dark background + several small text-like bright fragments.
    drawRect(rgba, columns, 0, 0, columns, rows, 0, 0, 0, 255);
    drawRect(rgba, columns, 2, 2, 3, 2, 255, 255, 255, 255);
    drawRect(rgba, columns, 7, 2, 3, 2, 255, 255, 255, 255);
    drawRect(rgba, columns, 12, 2, 3, 2, 255, 255, 255, 255);

    const regions = detector.detectRegions(rgba, columns, rows, createDetectionOptions({
        glyphScoreGateEnabled: true,
        minGlyphScore: 0.2,
        mergeGapX: 4,
        mergeGapY: 1,
        paddingX: 0,
        paddingY: 0
    }));

    expect(regions.length).toBeGreaterThanOrEqual(1);
    expect(containsPoint(regions, 3, 2)).toBe(true);
    expect(typeof regions[0]._glyphScore).toBe("number");
    expect(regions[0]._glyphScore).toBeGreaterThanOrEqual(0.2);

});

test("Test: OcrRegionDetector detects imaging bounds from centered content when outside-bounds mode is enabled", () => {

    const detector = new OcrRegionDetector();
    const columns = 80;
    const rows = 60;
    const rgba = new Uint8Array(columns * rows * 4);

    // Dark background.
    drawRect(rgba, columns, 0, 0, columns, rows, 0, 0, 0, 255);

    // Center imaging region.
    drawRect(rgba, columns, 20, 15, 40, 30, 180, 180, 180, 255);

    const bounds = detector.detectImagingBounds(rgba, columns, rows, {
        redactOutsideImagingBounds: true,
        imagingPaddingX: 0,
        imagingPaddingY: 0,
        imagingMinAreaRatio: 0.01
    });

    expect(bounds).not.toBeNull();
    expect(bounds.x).toBeLessThanOrEqual(20);
    expect(bounds.y).toBeLessThanOrEqual(15);
    expect((bounds.x + bounds.width)).toBeGreaterThanOrEqual(60);
    expect((bounds.y + bounds.height)).toBeGreaterThanOrEqual(45);

});

test("Test: OcrRegionDetector can detect imaging bounds even when outside-bounds redaction is disabled", () => {

    const detector = new OcrRegionDetector();
    const columns = 80;
    const rows = 60;
    const rgba = new Uint8Array(columns * rows * 4);

    // Dark background.
    drawRect(rgba, columns, 0, 0, columns, rows, 0, 0, 0, 255);

    // Center imaging region.
    drawRect(rgba, columns, 20, 15, 40, 30, 180, 180, 180, 255);

    const bounds = detector.detectImagingBounds(rgba, columns, rows, {
        redactOutsideImagingBounds: false,
        imagingMinAreaRatio: 0.01,
        imagingPaddingX: 0,
        imagingPaddingY: 0
    });

    expect(bounds).not.toBeNull();
    expect(bounds.width).toBeGreaterThanOrEqual(35);
    expect(bounds.height).toBeGreaterThanOrEqual(25);
    expect(bounds.x).toBeLessThanOrEqual(22);
    expect(bounds.y).toBeLessThanOrEqual(17);

});

test("Test: OcrRegionDetector unions separated centered imaging components when resolving imaging bounds", () => {

    const detector = new OcrRegionDetector();
    const columns = 120;
    const rows = 90;
    const rgba = new Uint8Array(columns * rows * 4);

    // Dark background.
    drawRect(rgba, columns, 0, 0, columns, rows, 0, 0, 0, 255);

    // Two separated centered imaging regions (for example, US wedge + waveform content).
    drawRect(rgba, columns, 48, 10, 24, 18, 190, 190, 190, 255);
    drawRect(rgba, columns, 30, 52, 60, 22, 180, 180, 180, 255);

    // Peripheral bright overlay-like region that should not drive bounds union.
    drawRect(rgba, columns, 3, 3, 16, 6, 220, 220, 220, 255);

    const bounds = detector.detectImagingBounds(rgba, columns, rows, {
        redactOutsideImagingBounds: true,
        imagingPaddingX: 0,
        imagingPaddingY: 0,
        imagingMinAreaRatio: 0.005,
        imagingUnionComponents: true,
        imagingUnionCenterZoneRatioX: 0.85,
        imagingUnionCenterZoneRatioY: 0.85
    });

    expect(bounds).not.toBeNull();
    expect(bounds.x).toBeLessThanOrEqual(30);
    expect(bounds.y).toBeLessThanOrEqual(10);
    expect((bounds.x + bounds.width)).toBeGreaterThanOrEqual(90);
    expect((bounds.y + bounds.height)).toBeGreaterThanOrEqual(74);

});
