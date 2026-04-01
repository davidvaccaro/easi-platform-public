//
// TextRegionGrouper.js
//
// Proprietary Notices:
// The Products, Documentation and Materials are proprietary to Xinonix Interactive Development Inc. and its licensors 
// and protected by applicable U.S. and international patent, copyright, trademark and trade secret laws. Xinonix 
// Interactive Development Inc and its licensors shall retain ownership in the Products, Documentation and Materials; 
// all derivatives thereof (in whole or part); and any intellectual property or other rights embodied therein. 
// 
// All proprietary notices incorporated in or affixed to any Products, Documentation or Materials shall be duplicated 
// by you on all copies of the Products, Documentation, or Material, as applicable, and shall not be altered, removed 
// or obliterated. Lease Equipment is, and shall at all times be and remain Our sole and exclusive property; you have 
// no right, title or interest therein or thereto except as expressly set forth in this Agreement. You shall keep the 
// Lease Equipment free and clear of all levies, liens and encumbrances and shall immediately notify us in writing of 
// any circumstances with respect to the location of the Equipment which will adversely affect it or our security 
// interests therein. You shall not install, attach, mount or otherwise house the Lease Equipment in a manner that 
// would render it a fixture under applicable law within the jurisdiction in which the Lease Equipment is located.
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
     * Determine whether two axis-aligned regions intersect.
     * @param {object} first First region.
     * @param {object} second Second region.
     * @returns {boolean} TRUE when regions intersect.
     */
    intersects(first, second) {

        if ((first == null) || (second == null))
            return false;

        var firstLeft = this.toInteger(first?.x, 0);
        var firstTop = this.toInteger(first?.y, 0);
        var firstRight = (firstLeft + Math.max(0, this.toInteger(first?.width, 0)));
        var firstBottom = (firstTop + Math.max(0, this.toInteger(first?.height, 0)));

        var secondLeft = this.toInteger(second?.x, 0);
        var secondTop = this.toInteger(second?.y, 0);
        var secondRight = (secondLeft + Math.max(0, this.toInteger(second?.width, 0)));
        var secondBottom = (secondTop + Math.max(0, this.toInteger(second?.height, 0)));

        if (firstRight <= secondLeft)
            return false;
        if (secondRight <= firstLeft)
            return false;
        if (firstBottom <= secondTop)
            return false;
        if (secondBottom <= firstTop)
            return false;

        return true;

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

        var expanded = {
            x: left,
            y: top,
            width: (right - left),
            height: (bottom - top)
        };

        if (region?._componentCount != null)
            expanded._componentCount = this.toInteger(region._componentCount, 0);
        if (region?._componentAreaTotal != null) {
            expanded._componentAreaTotal = this.toInteger(region._componentAreaTotal, 0);
        }
        if (region?._componentMeanArea != null) {
            expanded._componentMeanArea = this.toNumeric(region._componentMeanArea, 0);
        }
        if (expanded._componentAreaTotal != null) {
            var expandedArea = Math.max(1, (expanded.width * expanded.height));
            expanded._componentCoverage = (expanded._componentAreaTotal / expandedArea);
        }

        return expanded;

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
                height: Math.max(0, this.toInteger(component.height, 0)),
                _componentArea: Math.max(0, this.toInteger(component?.area, 0))
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
        var preferSmallRegions = (options.preferSmallRegions !== false);
        var smallRegionCoverageThreshold = this.clamp(
            this.toNumeric(options.smallRegionCoverageThreshold, 0.24),
            0,
            1
        );
        var smallRegionMinComponentCount = Math.max(1, this.toInteger(options.smallRegionMinComponentCount, 2));
        var smallRegionPaddingX = Math.max(0, this.toInteger(options.smallRegionPaddingX, 2));
        var smallRegionPaddingY = Math.max(0, this.toInteger(options.smallRegionPaddingY, 2));
        var minRegionArea = Math.max(1, this.toInteger(options.minRegionArea, 64));

        var regions = [];
        for (var regionIndex = 0; regionIndex < merged.length; regionIndex++) {
            var mergedRegion = merged[regionIndex];
            var componentCount = 0;
            var componentAreaTotal = 0;
            var regionComponents = [];
            for (var componentIndex = 0; componentIndex < filtered.length; componentIndex++) {
                var filteredComponent = filtered[componentIndex];
                if (this.intersects(filteredComponent, mergedRegion) != true)
                    continue;

                componentCount += 1;
                componentAreaTotal += Math.max(
                    0,
                    this.toInteger(filteredComponent?._componentArea, (filteredComponent.width * filteredComponent.height))
                );
                regionComponents.push(filteredComponent);
            }

            var mergedRegionArea = Math.max(
                1,
                Math.max(0, this.toInteger(mergedRegion.width, 0)) * Math.max(0, this.toInteger(mergedRegion.height, 0))
            );
            mergedRegion = Object.assign({}, mergedRegion, {
                _componentCount: componentCount,
                _componentAreaTotal: componentAreaTotal,
                _componentCoverage: (componentAreaTotal / mergedRegionArea),
                _componentMeanArea: (componentCount > 0) ? (componentAreaTotal / componentCount) : 0
            });

            // Favor small, precise boxes for sparse merged regions by splitting back
            // to component-scale boxes with light padding.
            if ((preferSmallRegions === true)
                && (componentCount >= smallRegionMinComponentCount)
                && (mergedRegion._componentCoverage < smallRegionCoverageThreshold)) {

                for (var splitIndex = 0; splitIndex < regionComponents.length; splitIndex++) {
                    var regionComponent = regionComponents[splitIndex];
                    var splitRegion = this.expandAndClamp(
                        regionComponent,
                        normalizedColumns,
                        normalizedRows,
                        smallRegionPaddingX,
                        smallRegionPaddingY
                    );
                    if (splitRegion == null)
                        continue;
                    if ((splitRegion.width * splitRegion.height) < minRegionArea)
                        continue;

                    var splitArea = Math.max(1, (splitRegion.width * splitRegion.height));
                    splitRegion._componentCount = 1;
                    splitRegion._componentAreaTotal = Math.max(0, this.toInteger(regionComponent?._componentArea, splitArea));
                    splitRegion._componentCoverage = (splitRegion._componentAreaTotal / splitArea);
                    splitRegion._componentMeanArea = splitRegion._componentAreaTotal;
                    regions.push(splitRegion);
                }

                continue;
            }

            var expanded = this.expandAndClamp(mergedRegion, normalizedColumns, normalizedRows, paddingX, paddingY);
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
