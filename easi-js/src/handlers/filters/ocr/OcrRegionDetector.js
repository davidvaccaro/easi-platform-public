//
// OcrRegionDetector.js - 1.0.0
//
// Burned-In OCR Region Detection Orchestrator
//

import Binarize from "./Binarize.js";
import ConnectedComponents from "./ConnectedComponents.js";
import TextRegionGrouper from "./TextRegionGrouper.js";

export const DefaultOcrRegionOptions = Object.freeze({
    enabled: true,
    detectBrightText: true,
    detectDarkText: false,
    highQuantile: 0.985,
    lowQuantile: 0.1,
    highThreshold: null,
    lowThreshold: null,
    minHighThreshold: 176,
    maxLowThreshold: 80,
    minAlpha: 8,
    maxBrightChannelDelta: 64,
    connectivity: 8,
    maxComponents: 32768,
    usePeripheralZones: true,
    topZoneRatio: 0.22,
    bottomZoneRatio: 0.2,
    leftZoneRatio: 0.2,
    rightZoneRatio: 0.2,
    minComponentArea: 8,
    minComponentWidth: 2,
    minComponentHeight: 2,
    maxComponentAreaRatio: 0.02,
    maxComponentWidthRatio: 0.5,
    maxComponentHeightRatio: 0.25,
    maxComponentAspectRatio: 20,
    mergeGapX: 12,
    mergeGapY: 8,
    paddingX: 4,
    paddingY: 4,
    minRegionArea: 64,
    maxRegions: 32
});

export default class OcrRegionDetector {

    /**
     * Construct one OCR region detector.
     */
    constructor() {
        this.binarize = new Binarize();
        this.connectedComponents = new ConnectedComponents();
        this.textRegionGrouper = new TextRegionGrouper();
    }

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
     * Resolve one finite integer value.
     * @param {*} value Candidate value.
     * @param {number} fallback Fallback value.
     * @returns {number} Integer value.
     */
    toInteger(value, fallback) {
        return Math.floor(this.toNumeric(value, fallback));
    }

    /**
     * Normalize OCR options against defaults.
     * @param {object | null} options Optional overrides.
     * @returns {object} Normalized options.
     */
    normalizeOptions(options = null) {

        if (options == null)
            return Object.assign({}, DefaultOcrRegionOptions);

        if (typeof options != "object")
            return Object.assign({}, DefaultOcrRegionOptions);

        return Object.assign({}, DefaultOcrRegionOptions, options);

    }

    /**
     * Detect text-like regions from one frame.
     * @param {Uint8Array} rgba RGBA frame bytes.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {object | null} options OCR options.
     * @returns {Array<object>} Region list.
     */
    detectRegions(rgba, columns, rows, options = null) {

        if ((rgba instanceof Uint8Array) == false)
            return [];

        var normalizedColumns = Math.max(1, this.toInteger(columns, 1));
        var normalizedRows = Math.max(1, this.toInteger(rows, 1));
        var normalizedOptions = this.normalizeOptions(options);

        if (normalizedOptions.enabled === false)
            return [];

        var pixelCount = (normalizedColumns * normalizedRows);
        if (rgba.length < (pixelCount * 4))
            return [];

        var components = [];

        if (normalizedOptions.detectBrightText === true) {
            var brightBinarized = this.binarize.apply(
                rgba,
                normalizedColumns,
                normalizedRows,
                Object.assign({}, normalizedOptions, {
                    detectBrightText: true,
                    detectDarkText: false
                })
            );

            if (brightBinarized.mask.length == pixelCount) {
                components = components.concat(this.connectedComponents.find(
                    brightBinarized.mask,
                    normalizedColumns,
                    normalizedRows,
                    {
                        connectivity: normalizedOptions.connectivity,
                        maxComponents: normalizedOptions.maxComponents
                    }
                ));
            }
        }

        if (normalizedOptions.detectDarkText === true) {
            var darkBinarized = this.binarize.apply(
                rgba,
                normalizedColumns,
                normalizedRows,
                Object.assign({}, normalizedOptions, {
                    detectBrightText: false,
                    detectDarkText: true
                })
            );

            if (darkBinarized.mask.length == pixelCount) {
                components = components.concat(this.connectedComponents.find(
                    darkBinarized.mask,
                    normalizedColumns,
                    normalizedRows,
                    {
                        connectivity: normalizedOptions.connectivity,
                        maxComponents: normalizedOptions.maxComponents
                    }
                ));
            }
        }

        if (components.length == 0)
            return [];

        return this.textRegionGrouper.group(components, normalizedColumns, normalizedRows, normalizedOptions);

    }

};
