import Binarize from "../../../../src/handlers/filters/ocr/Binarize.js";

test("Test: Binarize resolves adaptive bright channel delta from peripheral bright samples", () => {

    const binarize = new Binarize();
    const columns = 20;
    const rows = 20;
    const rgba = new Uint8Array(columns * rows * 4);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            const offset = ((y * columns) + x) * 4;
            let red = 0;
            let green = 0;
            let blue = 0;

            // Bright, chromatic center content (high delta).
            if ((x >= 5) && (x <= 14) && (y >= 5) && (y <= 14)) {
                red = 220;
                green = 170;
                blue = 90;
            }

            // Bright, near-achromatic peripheral overlays (low delta).
            if ((x === 0) || (x === (columns - 1)) || (y === 0) || (y === (rows - 1))) {
                red = 230;
                green = 230;
                blue = 230;
            }

            rgba[offset + 0] = red;
            rgba[offset + 1] = green;
            rgba[offset + 2] = blue;
            rgba[offset + 3] = 255;
        }
    }

    const luma = binarize.buildLuma(rgba);
    const adaptive = binarize.resolveAdaptiveBrightChannelDeltaThreshold(
        rgba,
        luma,
        { high: 180, low: 0 },
        8,
        columns,
        rows,
        {
            autoBrightChannelDeltaEnabled: true,
            autoBrightChannelDeltaPeripheralOnly: true,
            autoBrightChannelDeltaQuantile: 0.35,
            autoBrightChannelDeltaPadding: 8,
            autoBrightChannelDeltaMin: 12,
            autoBrightChannelDeltaMax: 96,
            autoBrightChannelDeltaMinSamples: 32,
            topZoneRatio: 0.24,
            bottomZoneRatio: 0.24,
            leftZoneRatio: 0.24,
            rightZoneRatio: 0.28
        }
    );

    expect(adaptive).toBeLessThanOrEqual(20);
    expect(adaptive).toBeGreaterThanOrEqual(12);

});

test("Test: Binarize adaptive bright channel delta falls back to configured maximum when sample count is too low", () => {

    const binarize = new Binarize();
    const columns = 12;
    const rows = 12;
    const rgba = new Uint8Array(columns * rows * 4);

    for (let index = 0; index < rgba.length; index += 4) {
        rgba[index + 0] = 0;
        rgba[index + 1] = 0;
        rgba[index + 2] = 0;
        rgba[index + 3] = 255;
    }

    // Only a handful of bright peripheral pixels.
    const brightPixels = [0, 1, 2, 3, 4, 5];
    for (const pixelIndex of brightPixels) {
        const offset = pixelIndex * 4;
        rgba[offset + 0] = 240;
        rgba[offset + 1] = 240;
        rgba[offset + 2] = 240;
    }

    const luma = binarize.buildLuma(rgba);
    const adaptive = binarize.resolveAdaptiveBrightChannelDeltaThreshold(
        rgba,
        luma,
        { high: 180, low: 0 },
        8,
        columns,
        rows,
        {
            autoBrightChannelDeltaEnabled: true,
            autoBrightChannelDeltaPeripheralOnly: true,
            autoBrightChannelDeltaQuantile: 0.35,
            autoBrightChannelDeltaPadding: 8,
            autoBrightChannelDeltaMin: 12,
            autoBrightChannelDeltaMax: 96,
            autoBrightChannelDeltaMinSamples: 32
        }
    );

    expect(adaptive).toBe(96);

});

