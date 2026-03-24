//
// Binarize.js - 1.0.0
//
// Burned-In OCR Region Detection Binarization Utility
//

export default class Binarize {

    /**
     * Resolve one finite numeric value.
     * @param {*} value Candidate value.
     * @param {number} fallback Fallback value.
     * @returns {number} Numeric value.
     */
    toNumeric(value, fallback) {

        var numeric = Number(value);
        if (Number.isFinite(numeric) == false)
            return fallback;

        return numeric;

    }

    /**
     * Clamp one numeric value.
     * @param {number} value Value.
     * @param {number} minimum Minimum value.
     * @param {number} maximum Maximum value.
     * @returns {number} Clamped value.
     */
    clamp(value, minimum, maximum) {
        if (value < minimum)
            return minimum;
        if (value > maximum)
            return maximum;
        return value;
    }

    /**
     * Resolve one percentile value in [0, 1].
     * @param {*} value Candidate value.
     * @param {number} fallback Fallback percentile.
     * @returns {number} Percentile.
     */
    resolvePercentile(value, fallback) {
        return this.clamp(this.toNumeric(value, fallback), 0, 1);
    }

    /**
     * Resolve one threshold value in [0, 255].
     * @param {*} value Candidate threshold.
     * @param {number | null} fallback Fallback threshold.
     * @returns {number | null} Threshold.
     */
    resolveThreshold(value, fallback = null) {

        if (value == null)
            return fallback;

        return Math.round(this.clamp(this.toNumeric(value, fallback ?? 0), 0, 255));

    }

    /**
     * Build luminance bytes from RGBA input.
     * @param {Uint8Array} rgba RGBA bytes.
     * @returns {Uint8Array} Luminance bytes.
     */
    buildLuma(rgba) {

        var pixelCount = Math.floor(rgba.length / 4);
        var luma = new Uint8Array(pixelCount);

        for (var index = 0; index < pixelCount; index++) {
            var offset = (index * 4);
            var red = rgba[offset + 0] ?? 0;
            var green = rgba[offset + 1] ?? 0;
            var blue = rgba[offset + 2] ?? 0;

            // Integer BT.601 luminance approximation.
            luma[index] = ((77 * red) + (150 * green) + (29 * blue)) >> 8;
        }

        return luma;

    }

    /**
     * Build one 256-bin luminance histogram.
     * @param {Uint8Array} luma Luminance bytes.
     * @returns {Uint32Array} Histogram bins.
     */
    buildHistogram(luma) {

        var histogram = new Uint32Array(256);
        for (var index = 0; index < luma.length; index++) {
            histogram[luma[index]] += 1;
        }

        return histogram;

    }

    /**
     * Resolve one percentile threshold from histogram.
     * @param {Uint32Array} histogram Histogram bins.
     * @param {number} total Total sample count.
     * @param {number} percentile Percentile in [0, 1].
     * @returns {number} Threshold in [0, 255].
     */
    resolvePercentileThreshold(histogram, total, percentile) {

        if (total <= 0)
            return 0;

        var target = Math.floor(this.clamp(percentile, 0, 1) * (total - 1));
        var running = 0;

        for (var value = 0; value <= 255; value++) {
            running += histogram[value];
            if (running > target)
                return value;
        }

        return 255;

    }

    /**
     * Determine whether one pixel index belongs to configured peripheral zones.
     * @param {number} pixelIndex Pixel index.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {object} options Options.
     * @returns {boolean} TRUE when peripheral.
     */
    isPeripheralPixel(pixelIndex, columns, rows, options = {}) {

        var normalizedColumns = Math.max(1, Math.floor(this.toNumeric(columns, 1)));
        var normalizedRows = Math.max(1, Math.floor(this.toNumeric(rows, 1)));
        if (pixelIndex < 0)
            return false;

        var x = (pixelIndex % normalizedColumns);
        var y = Math.floor(pixelIndex / normalizedColumns);
        if (y >= normalizedRows)
            return false;

        var topZoneRatio = this.resolvePercentile(options.topZoneRatio, 0.24);
        var bottomZoneRatio = this.resolvePercentile(options.bottomZoneRatio, 0.24);
        var leftZoneRatio = this.resolvePercentile(options.leftZoneRatio, 0.24);
        var rightZoneRatio = this.resolvePercentile(options.rightZoneRatio, 0.28);

        var topZoneLimit = Math.max(0, Math.floor(normalizedRows * topZoneRatio));
        var bottomZoneStart = Math.max(0, (normalizedRows - Math.floor(normalizedRows * bottomZoneRatio)));
        var leftZoneLimit = Math.max(0, Math.floor(normalizedColumns * leftZoneRatio));
        var rightZoneStart = Math.max(0, (normalizedColumns - Math.floor(normalizedColumns * rightZoneRatio)));

        if (y <= topZoneLimit)
            return true;
        if (y >= bottomZoneStart)
            return true;
        if (x <= leftZoneLimit)
            return true;
        if (x >= rightZoneStart)
            return true;

        return false;

    }

    /**
     * Resolve adaptive bright-text channel-delta threshold.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {Uint8Array} luma Luma bytes.
     * @param {object} thresholds Thresholds.
     * @param {number} minAlpha Minimum alpha.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {object} options Options.
     * @returns {number} Threshold.
     */
    resolveAdaptiveBrightChannelDeltaThreshold(rgba, luma, thresholds, minAlpha, columns, rows, options = {}) {

        var minSamples = Math.max(8, Math.floor(this.toNumeric(options.autoBrightChannelDeltaMinSamples, 32)));
        var quantile = this.resolvePercentile(options.autoBrightChannelDeltaQuantile, 0.35);
        var padding = Math.max(0, Math.floor(this.toNumeric(options.autoBrightChannelDeltaPadding, 8)));
        var minimum = this.clamp(Math.floor(this.toNumeric(options.autoBrightChannelDeltaMin, 12)), 0, 255);
        var maximum = this.clamp(Math.floor(this.toNumeric(options.autoBrightChannelDeltaMax, 96)), minimum, 255);
        var peripheralOnly = (options.autoBrightChannelDeltaPeripheralOnly !== false);

        var histogram = new Uint32Array(256);
        var sampleCount = 0;
        for (var index = 0; index < luma.length; index++) {
            var offset = (index * 4);
            var alpha = rgba[offset + 3] ?? 255;
            if (alpha < minAlpha)
                continue;
            if (luma[index] < thresholds.high)
                continue;
            if ((peripheralOnly === true)
                && (this.isPeripheralPixel(index, columns, rows, options) !== true)) {
                continue;
            }

            var red = rgba[offset + 0] ?? 0;
            var green = rgba[offset + 1] ?? 0;
            var blue = rgba[offset + 2] ?? 0;
            var delta = (Math.max(red, green, blue) - Math.min(red, green, blue));
            histogram[this.clamp(delta, 0, 255)] += 1;
            sampleCount += 1;
        }

        if (sampleCount < minSamples)
            return maximum;

        var percentileDelta = this.resolvePercentileThreshold(histogram, sampleCount, quantile);
        var adaptiveThreshold = this.clamp((percentileDelta + padding), minimum, maximum);
        return adaptiveThreshold;

    }

    /**
     * Resolve binarization thresholds.
     * @param {Uint8Array} luma Luminance bytes.
     * @param {object} options Binarization options.
     * @returns {object} Threshold payload.
     */
    resolveThresholds(luma, options = {}) {

        var histogram = this.buildHistogram(luma);
        var total = luma.length;

        var highThreshold = this.resolveThreshold(options.highThreshold, null);
        var lowThreshold = this.resolveThreshold(options.lowThreshold, null);

        if (highThreshold == null) {
            highThreshold = this.resolvePercentileThreshold(
                histogram,
                total,
                this.resolvePercentile(options.highQuantile, 0.9)
            );
        }

        if (lowThreshold == null) {
            lowThreshold = this.resolvePercentileThreshold(
                histogram,
                total,
                this.resolvePercentile(options.lowQuantile, 0.1)
            );
        }

        var minHighThreshold = this.resolveThreshold(options.minHighThreshold, null);
        if (minHighThreshold != null)
            highThreshold = Math.max(highThreshold, minHighThreshold);

        var maxLowThreshold = this.resolveThreshold(options.maxLowThreshold, null);
        if (maxLowThreshold != null)
            lowThreshold = Math.min(lowThreshold, maxLowThreshold);

        if (highThreshold <= lowThreshold)
            highThreshold = Math.min(255, (lowThreshold + 16));

        return {
            high: this.clamp(highThreshold, 0, 255),
            low: this.clamp(lowThreshold, 0, 255)
        };

    }

    /**
     * Build one binary candidate mask.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {Uint8Array} luma Luminance bytes.
     * @param {object} thresholds Threshold payload.
     * @param {object} options Binarization options.
     * @returns {Uint8Array} Binary mask (0/1).
     */
    createMask(rgba, luma, thresholds, columns, rows, options = {}) {

        var detectBrightText = (options.detectBrightText !== false);
        var detectDarkText = (options.detectDarkText !== false);
        var minAlpha = this.clamp(Math.floor(this.toNumeric(options.minAlpha, 8)), 0, 255);
        var configuredMaxBrightChannelDelta = this.resolveThreshold(options.maxBrightChannelDelta, null);
        var autoBrightChannelDeltaEnabled = (options.autoBrightChannelDeltaEnabled !== false);
        var maxBrightChannelDelta = null;

        if ((detectBrightText == true)
            && (autoBrightChannelDeltaEnabled == true)) {
            maxBrightChannelDelta = this.resolveAdaptiveBrightChannelDeltaThreshold(
                rgba,
                luma,
                thresholds,
                minAlpha,
                columns,
                rows,
                options
            );
            if (configuredMaxBrightChannelDelta != null)
                maxBrightChannelDelta = Math.min(maxBrightChannelDelta, configuredMaxBrightChannelDelta);
        }

        if (maxBrightChannelDelta == null) {
            maxBrightChannelDelta = this.clamp(
                Math.floor(this.toNumeric((configuredMaxBrightChannelDelta ?? 48), 48)),
                0,
                255
            );
        }

        var mask = new Uint8Array(luma.length);
        if ((detectBrightText == false) && (detectDarkText == false))
            return mask;

        for (var index = 0; index < luma.length; index++) {
            var offset = (index * 4);
            var alpha = rgba[offset + 3] ?? 255;
            if (alpha < minAlpha)
                continue;

            var value = luma[index];
            if ((detectBrightText == true) && (value >= thresholds.high)) {
                var red = rgba[offset + 0] ?? 0;
                var green = rgba[offset + 1] ?? 0;
                var blue = rgba[offset + 2] ?? 0;
                var maximum = Math.max(red, green, blue);
                var minimum = Math.min(red, green, blue);

                // Bright text overlays are usually close to achromatic white.
                if ((maximum - minimum) <= maxBrightChannelDelta) {
                    mask[index] = 1;
                    continue;
                }
            }

            if ((detectDarkText == true) && (value <= thresholds.low))
                mask[index] = 1;
        }

        return mask;

    }

    /**
     * Convert RGBA input to luminance + binary mask.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {object} options Binarization options.
     * @returns {object} Binarized payload.
     */
    apply(rgba, columns, rows, options = {}) {

        if ((rgba instanceof Uint8Array) == false) {
            return {
                columns: Math.max(1, Math.floor(this.toNumeric(columns, 1))),
                rows: Math.max(1, Math.floor(this.toNumeric(rows, 1))),
                luma: new Uint8Array(0),
                mask: new Uint8Array(0),
                thresholds: { high: 0, low: 0 }
            };
        }

        var normalizedColumns = Math.max(1, Math.floor(this.toNumeric(columns, 1)));
        var normalizedRows = Math.max(1, Math.floor(this.toNumeric(rows, 1)));
        var luma = this.buildLuma(rgba);
        var thresholds = this.resolveThresholds(luma, options);
        var mask = this.createMask(rgba, luma, thresholds, normalizedColumns, normalizedRows, options);

        return {
            columns: normalizedColumns,
            rows: normalizedRows,
            luma: luma,
            mask: mask,
            thresholds: thresholds
        };

    }

};
