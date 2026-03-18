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
