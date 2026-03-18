//
// TextRegionGrouper.js - 1.0.0
//
// Burned-In OCR Region Detection Text Region Grouping Utility
//

import RegionMerge from "./RegionMerge.js";

export default class TextRegionGrouper {

    /**
     * Construct one text region grouper.
     */
    constructor() {
        this.regionMerge = new RegionMerge();
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
     * Determine whether one component intersects configured peripheral search zones.
     * @param {object} component Component.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {object} options Options.
     * @returns {boolean} TRUE when component is in-scope.
     */
    intersectsSearchZones(component, columns, rows, options) {

        if (options.usePeripheralZones !== true)
            return true;

        var leftZoneColumns = Math.max(0, Math.floor(columns * this.clamp(this.toNumeric(options.leftZoneRatio, 0.2), 0, 1)));
        var rightZoneColumns = Math.max(0, Math.floor(columns * this.clamp(this.toNumeric(options.rightZoneRatio, 0.2), 0, 1)));
        var topZoneRows = Math.max(0, Math.floor(rows * this.clamp(this.toNumeric(options.topZoneRatio, 0.22), 0, 1)));
        var bottomZoneRows = Math.max(0, Math.floor(rows * this.clamp(this.toNumeric(options.bottomZoneRatio, 0.2), 0, 1)));

        var leftZoneEnd = leftZoneColumns;
        var rightZoneStart = Math.max(0, columns - rightZoneColumns);
        var topZoneEnd = topZoneRows;
        var bottomZoneStart = Math.max(0, rows - bottomZoneRows);

        var left = this.toInteger(component?.x, 0);
        var top = this.toInteger(component?.y, 0);
        var right = left + Math.max(0, this.toInteger(component?.width, 0));
        var bottom = top + Math.max(0, this.toInteger(component?.height, 0));

        if (left < leftZoneEnd)
            return true;
        if (right > rightZoneStart)
            return true;
        if (top < topZoneEnd)
            return true;
        if (bottom > bottomZoneStart)
            return true;

        return false;

    }

    /**
     * Expand one region by configured padding and clamp to frame dimensions.
     * @param {object} region Region.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {number} paddingX Horizontal padding.
     * @param {number} paddingY Vertical padding.
     * @returns {object | null} Expanded region.
     */
    expandAndClamp(region, columns, rows, paddingX, paddingY) {

        var left = this.clamp(this.toInteger(region.x, 0) - paddingX, 0, columns);
        var top = this.clamp(this.toInteger(region.y, 0) - paddingY, 0, rows);
        var right = this.clamp(
            this.toInteger(region.x, 0) + Math.max(0, this.toInteger(region.width, 0)) + paddingX,
            0,
            columns
        );
        var bottom = this.clamp(
            this.toInteger(region.y, 0) + Math.max(0, this.toInteger(region.height, 0)) + paddingY,
            0,
            rows
        );

        if ((right <= left) || (bottom <= top))
            return null;

        return {
            x: left,
            y: top,
            width: (right - left),
            height: (bottom - top)
        };

    }

    /**
     * Determine whether one component passes text-like geometric constraints.
     * @param {object} component Component.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {number} frameArea Frame area.
     * @param {object} options Threshold options.
     * @returns {boolean} TRUE when valid.
     */
    isTextLike(component, columns, rows, frameArea, options) {

        var width = Math.max(0, this.toInteger(component?.width, 0));
        var height = Math.max(0, this.toInteger(component?.height, 0));
        var area = Math.max(0, this.toInteger(component?.area, (width * height)));

        if ((width <= 0) || (height <= 0) || (area <= 0))
            return false;

        if (area < options.minComponentArea)
            return false;
        if (width < options.minComponentWidth)
            return false;
        if (height < options.minComponentHeight)
            return false;

        if (area > Math.floor(frameArea * options.maxComponentAreaRatio))
            return false;
        if (width > Math.floor(columns * options.maxComponentWidthRatio))
            return false;
        if (height > Math.floor(rows * options.maxComponentHeightRatio))
            return false;

        var aspect = (width / Math.max(1, height));
        var inverseAspect = (height / Math.max(1, width));
        if ((aspect > options.maxComponentAspectRatio)
            || (inverseAspect > options.maxComponentAspectRatio)) {
            return false;
        }

        return true;

    }

    /**
     * Group text-like connected components into redactable regions.
     * @param {Array<object>} components Connected components.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {object} options Grouping options.
     * @returns {Array<object>} Region list.
     */
    group(components, columns, rows, options = {}) {

        if (Array.isArray(components) == false)
            return [];

        var normalizedColumns = Math.max(1, this.toInteger(columns, 1));
        var normalizedRows = Math.max(1, this.toInteger(rows, 1));
        var frameArea = (normalizedColumns * normalizedRows);

        var thresholds = {
            minComponentArea: Math.max(1, this.toInteger(options.minComponentArea, 8)),
            minComponentWidth: Math.max(1, this.toInteger(options.minComponentWidth, 2)),
            minComponentHeight: Math.max(1, this.toInteger(options.minComponentHeight, 2)),
            maxComponentAreaRatio: this.clamp(this.toNumeric(options.maxComponentAreaRatio, 0.02), 0.000001, 1),
            maxComponentWidthRatio: this.clamp(this.toNumeric(options.maxComponentWidthRatio, 0.5), 0.000001, 1),
            maxComponentHeightRatio: this.clamp(this.toNumeric(options.maxComponentHeightRatio, 0.25), 0.000001, 1),
            maxComponentAspectRatio: Math.max(1, this.toNumeric(options.maxComponentAspectRatio, 20))
        };

        var filtered = [];
        for (var index = 0; index < components.length; index++) {
            var component = components[index];
            if (this.intersectsSearchZones(component, normalizedColumns, normalizedRows, options) != true)
                continue;

            if (this.isTextLike(component, normalizedColumns, normalizedRows, frameArea, thresholds) != true)
                continue;

            filtered.push({
                x: this.toInteger(component.x, 0),
                y: this.toInteger(component.y, 0),
                width: Math.max(0, this.toInteger(component.width, 0)),
                height: Math.max(0, this.toInteger(component.height, 0))
            });
        }

        if (filtered.length == 0)
            return [];

        var merged = this.regionMerge.mergeAll(filtered, {
            gapX: Math.max(0, this.toInteger(options.mergeGapX, 12)),
            gapY: Math.max(0, this.toInteger(options.mergeGapY, 8))
        });

        var paddingX = Math.max(0, this.toInteger(options.paddingX, 4));
        var paddingY = Math.max(0, this.toInteger(options.paddingY, 4));
        var minRegionArea = Math.max(1, this.toInteger(options.minRegionArea, 64));

        var regions = [];
        for (var regionIndex = 0; regionIndex < merged.length; regionIndex++) {
            var expanded = this.expandAndClamp(merged[regionIndex], normalizedColumns, normalizedRows, paddingX, paddingY);
            if (expanded == null)
                continue;

            if ((expanded.width * expanded.height) < minRegionArea)
                continue;

            regions.push(expanded);
        }

        regions.sort((first, second) => {
            if (first.y != second.y)
                return (first.y - second.y);
            return (first.x - second.x);
        });

        var maxRegions = Math.max(1, this.toInteger(options.maxRegions, 32));
        if (regions.length > maxRegions)
            regions = regions.slice(0, maxRegions);

        return regions;

    }

};
