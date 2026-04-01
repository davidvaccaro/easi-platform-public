//
// DicomBurnedInRedactionFilter.js
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

import Exception, { GeneralErrorCodes } from "../../environment/Exception.js";
import TransferSyntax from "../../dicom/TransferSyntax.js";
import DicomTranscodingFilter from "./DicomTranscodingFilter.js";
import OcrRegionDetector from "./ocr/OcrRegionDetector.js";

export const BurnedInRedactionModes = {
    REGIONS: "regions",
    OCR_REGIONS: "ocr-regions"
};

export const BurnedInRedactionCoordinateModes = {
    PIXEL: "pixel",
    NORMALIZED: "normalized",
    AUTO_FIT: "auto-fit"
};

export const BurnedInRedactionActions = {
    BLACK: "black",
    WHITE: "white",
    CONSTANT: "constant"
};

export default class DicomBurnedInRedactionFilter extends DicomTranscodingFilter {

    /**
     * Normalize one scalar number candidate.
     * @param {*} value Candidate value.
     * @param {number} fallback Fallback value.
     * @returns {number} Normalized number.
     */
    toNumeric(value, fallback = 0) {
        var numeric = Number(value);
        if (Number.isFinite(numeric) == false)
            return fallback;
        return numeric;
    }

    /**
     * Clamp one number in range.
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
     * Resolve the redaction fill RGBA value.
     * @param {string} action Redaction action.
     * @param {number[] | null} fill Explicit fill values.
     * @returns {number[]} RGBA array.
     */
    resolveFillRGBA(action, fill = null) {

        if (action == BurnedInRedactionActions.WHITE)
            return [255, 255, 255, 255];

        if (action == BurnedInRedactionActions.CONSTANT) {

            if (Array.isArray(fill) == true) {
                var red = this.clamp(Math.round(this.toNumeric(fill[0], 0)), 0, 255);
                var green = this.clamp(Math.round(this.toNumeric(fill[1], red)), 0, 255);
                var blue = this.clamp(Math.round(this.toNumeric(fill[2], green)), 0, 255);
                var alpha = this.clamp(Math.round(this.toNumeric(fill[3], 255)), 0, 255);
                return [red, green, blue, alpha];
            }

            var value = this.clamp(Math.round(this.toNumeric(fill, 0)), 0, 255);
            return [value, value, value, 255];

        }

        return [0, 0, 0, 255];

    }

    /**
     * Resolve one region's X coordinate.
     * @param {object} region One region object.
     * @returns {number} X coordinate.
     */
    resolveRegionX(region) {
        return this.toNumeric(
            region?.x ?? region?.left ?? region?.column ?? region?.startX ?? 0,
            0
        );
    }

    /**
     * Resolve one region's Y coordinate.
     * @param {object} region One region object.
     * @returns {number} Y coordinate.
     */
    resolveRegionY(region) {
        return this.toNumeric(
            region?.y ?? region?.top ?? region?.row ?? region?.startY ?? 0,
            0
        );
    }

    /**
     * Resolve one region width.
     * @param {object} region One region object.
     * @returns {number} Width.
     */
    resolveRegionWidth(region) {
        return this.toNumeric(
            region?.width ?? region?.w ?? region?.columns ?? region?.columnCount ?? 0,
            0
        );
    }

    /**
     * Resolve one region height.
     * @param {object} region One region object.
     * @returns {number} Height.
     */
    resolveRegionHeight(region) {
        return this.toNumeric(
            region?.height ?? region?.h ?? region?.rows ?? region?.rowCount ?? 0,
            0
        );
    }

    /**
     * Resolve one normalized frame region.
     * @param {object} region The input region.
     * @returns {object} Normalized region with numeric x/y/width/height.
     */
    normalizeRegion(region) {
        return {
            x: this.toNumeric(this.resolveRegionX(region), 0),
            y: this.toNumeric(this.resolveRegionY(region), 0),
            width: this.toNumeric(this.resolveRegionWidth(region), 0),
            height: this.toNumeric(this.resolveRegionHeight(region), 0)
        };
    }

    /**
     * Resolve one positive numeric scale value.
     * @param {*} value Candidate scale value.
     * @param {number} fallback Fallback value.
     * @returns {number} Positive scale value.
     */
    resolveScale(value, fallback = 1) {
        var numeric = this.toNumeric(value, fallback);
        if (Number.isFinite(numeric) == false)
            return fallback;
        if (numeric <= 0)
            return fallback;
        return numeric;
    }

    /**
     * Normalize one resolved region list to frame coordinate-space.
     * @param {object} state Runtime state.
     * @param {Array<object>} regions Resolved regions.
     * @returns {Array<object>} Normalized frame regions.
     */
    normalizeFrameRegions(state, regions) {

        if (Array.isArray(regions) == false)
            return [];

        var columns = Math.max(1, this.toInteger(state?.columns, 1));
        var rows = Math.max(1, this.toInteger(state?.rows, 1));

        var coordinateMode = String(this.redaction?.coordinateMode ?? BurnedInRedactionCoordinateModes.PIXEL).trim().toLowerCase();
        if ((coordinateMode != BurnedInRedactionCoordinateModes.PIXEL)
            && (coordinateMode != BurnedInRedactionCoordinateModes.NORMALIZED)
            && (coordinateMode != BurnedInRedactionCoordinateModes.AUTO_FIT)) {
            coordinateMode = BurnedInRedactionCoordinateModes.PIXEL;
        }

        var normalized = [];
        for (var i = 0; i < regions.length; i++) {
            var region = this.normalizeRegion(regions[i]);

            if (coordinateMode == BurnedInRedactionCoordinateModes.NORMALIZED) {
                region.x *= columns;
                region.width *= columns;
                region.y *= rows;
                region.height *= rows;
            }

            normalized.push(region);
        }

        var scaleX = this.resolveScale(this.redaction?.coordinateScaleX, 1);
        var scaleY = this.resolveScale(this.redaction?.coordinateScaleY, 1);

        if (coordinateMode == BurnedInRedactionCoordinateModes.AUTO_FIT) {

            var maxRight = 0;
            var maxBottom = 0;

            for (var regionIndex = 0; regionIndex < normalized.length; regionIndex++) {
                var current = normalized[regionIndex];
                maxRight = Math.max(maxRight, (current.x + current.width));
                maxBottom = Math.max(maxBottom, (current.y + current.height));
            }

            if ((maxRight > columns) && (maxRight > 0))
                scaleX *= (columns / maxRight);
            if ((maxBottom > rows) && (maxBottom > 0))
                scaleY *= (rows / maxBottom);

        }

        if ((scaleX == 1) && (scaleY == 1))
            return normalized;

        for (var scaledIndex = 0; scaledIndex < normalized.length; scaledIndex++) {
            normalized[scaledIndex].x *= scaleX;
            normalized[scaledIndex].width *= scaleX;
            normalized[scaledIndex].y *= scaleY;
            normalized[scaledIndex].height *= scaleY;
        }

        return normalized;

    }

    /**
     * Resolve frame-specific regions from configured redaction options.
     * @param {object} state Runtime state.
     * @param {number} frameIndex Frame index.
     * @param {number | null} frameCount Frame count.
     * @returns {Promise<Array<object>>} Region list.
     */
    async resolveFrameRegions(state, frameIndex, frameCount = null) {

        var regions = this.redaction?.regions ?? [];

        if (typeof regions == "function") {
            regions = regions({
                frameIndex: frameIndex,
                frameCount: frameCount,
                rows: this.toInteger(state?.rows, null),
                columns: this.toInteger(state?.columns, null),
                samplesPerPixel: this.toInteger(state?.samplesPerPixel, null),
                bitsAllocated: this.toInteger(state?.bitsAllocated, null),
                bitsStored: this.toInteger(state?.bitsStored, null),
                photometricInterpretation: String(state?.photometricInterpretation ?? "").trim().toUpperCase()
            });
        }

        if ((regions != null) && (typeof regions.then == "function")) {
            regions = await regions;
        }

        if (Array.isArray(regions) == false)
            return [];

        return this.normalizeFrameRegions(state, regions);

    }

    /**
     * Resolve OCR-detected regions for one frame.
     * @param {object} state Runtime state.
     * @param {Uint8Array} rgba RGBA frame bytes.
     * @returns {Array<object>} Region list.
     */
    resolveOcrFrameRegions(state, rgba) {

        if ((this.ocrRegionDetector == null)
            || (typeof this.ocrRegionDetector.detectRegions != "function")) {
            return [];
        }

        var columns = Math.max(1, this.toInteger(state?.columns, 1));
        var rows = Math.max(1, this.toInteger(state?.rows, 1));
        var ocrOptions = this.resolveNormalizedOcrRegionOptions();
        var regions = this.ocrRegionDetector.detectRegions(
            rgba,
            columns,
            rows,
            ocrOptions
        );

        if (Array.isArray(regions) == false)
            return [];

        regions = regions.map((region) => Object.assign({}, region, { _kind: "ocr" }));

        var imagingBounds = null;
        if (typeof this.ocrRegionDetector.detectImagingBounds == "function") {
            imagingBounds = this.ocrRegionDetector.detectImagingBounds(
                rgba,
                columns,
                rows,
                ocrOptions
            );

            var outsideRegions = this.resolveOutsideBoundsRegions(columns, rows, imagingBounds, ocrOptions);
            if (outsideRegions.length > 0) {
                regions = regions.concat(outsideRegions);
            }
        }

        var promotedTopBandRegions = this.resolvePromotedTopBandRegions(columns, rows, regions, ocrOptions, imagingBounds);
        if (promotedTopBandRegions.length > 0)
            regions = regions.concat(promotedTopBandRegions);

        regions = this.sanitizeOcrRegions(columns, rows, regions, ocrOptions, imagingBounds, rgba);
        return this.normalizeFrameRegions(state, regions);

    }

    /**
     * Resolve normalized OCR-region options.
     * @returns {object} Normalized options.
     */
    resolveNormalizedOcrRegionOptions() {

        var ocrOptions = this.redaction?.ocrRegions ?? null;

        if ((this.ocrRegionDetector != null)
            && (typeof this.ocrRegionDetector.normalizeOptions == "function")) {
            return this.ocrRegionDetector.normalizeOptions(ocrOptions);
        }

        if ((ocrOptions != null) && (typeof ocrOptions == "object"))
            return Object.assign({}, ocrOptions);

        return {};

    }

    /**
     * Promote detected top-zone OCR fragments to one or more top-band regions.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {Array<object>} regions OCR regions.
     * @param {object | null} ocrOptions OCR options.
     * @param {object | null} imagingBounds Imaging bounds.
     * @returns {Array<object>} Promoted top band regions.
     */
    resolvePromotedTopBandRegions(columns, rows, regions, ocrOptions = null, imagingBounds = null) {

        if (Array.isArray(regions) == false)
            return [];
        if (regions.length == 0)
            return [];

        if (ocrOptions?.promoteTopBandFromDetections !== true)
            return [];

        var frameColumns = Math.max(1, this.toInteger(columns, 1));
        var frameRows = Math.max(1, this.toInteger(rows, 1));
        var topZoneRatio = this.clamp(this.toNumeric(ocrOptions?.topZoneRatio, 0.24), 0, 1);
        var topBandMaxRatio = this.clamp(this.toNumeric(ocrOptions?.topBandMaxRatio, 0.12), 0, 1);
        var topBandAnchorRatio = this.clamp(this.toNumeric(ocrOptions?.topBandAnchorRatio, 0.12), 0, 1);
        var topBandPaddingY = Math.max(0, this.toInteger(ocrOptions?.topBandPaddingY, 8));
        var topBandPaddingX = Math.max(0, this.toInteger(ocrOptions?.topBandPaddingX, 8));
        var topBandMinRegionCount = Math.max(1, this.toInteger(ocrOptions?.topBandMinRegionCount, 2));
        var topBandMinRegionCountPerCluster = Math.max(1, this.toInteger(ocrOptions?.topBandMinRegionCountPerCluster, 1));
        var topBandClusterGapX = Math.max(0, this.toInteger(ocrOptions?.topBandClusterGapX, 24));
        var topBandClusterGapRatio = this.clamp(this.toNumeric(ocrOptions?.topBandClusterGapRatio, 0.05), 0, 1);
        var topBandMinCoverageRatio = this.clamp(this.toNumeric(ocrOptions?.topBandMinCoverageRatio, 0.03), 0, 1);
        var topBandMinSpanOccupancyRatio = this.clamp(this.toNumeric(ocrOptions?.topBandMinSpanOccupancyRatio, 0.3), 0, 1);
        var topBandExpandToFullWidth = (ocrOptions?.topBandExpandToFullWidth === true);

        var topZoneLimit = Math.max(1, Math.floor(frameRows * topZoneRatio));
        var topBandAnchorLimit = Math.max(1, Math.floor(frameRows * topBandAnchorRatio));
        var topBandMaxHeight = Math.max(1, Math.floor(frameRows * topBandMaxRatio));

        var candidateCount = 0;
        var minimumLeft = frameColumns;
        var maximumRight = 0;
        var candidateIntervals = [];

        for (var regionIndex = 0; regionIndex < regions.length; regionIndex++) {

            var region = regions[regionIndex];
            var x = this.resolveRegionX(region);
            var y = this.resolveRegionY(region);
            var width = this.resolveRegionWidth(region);
            var height = this.resolveRegionHeight(region);

            if ((width <= 0) || (height <= 0))
                continue;
            if ((x + width) <= 0)
                continue;
            if (x >= frameColumns)
                continue;

            if (y >= topZoneLimit)
                continue;
            if (y >= topBandAnchorLimit)
                continue;

            var regionLeft = this.clamp(Math.floor(x), 0, frameColumns);
            var regionRight = this.clamp(Math.ceil(x + width), 0, frameColumns);
            if (regionRight <= regionLeft)
                continue;

            candidateCount += 1;
            minimumLeft = Math.min(minimumLeft, regionLeft);
            maximumRight = Math.max(maximumRight, regionRight);
            candidateIntervals.push({
                left: regionLeft,
                right: regionRight,
                bottom: Math.ceil(y + height)
            });

        }

        if (candidateCount < topBandMinRegionCount)
            return [];

        candidateIntervals.sort((first, second) => {
            if (first.left < second.left)
                return -1;
            if (first.left > second.left)
                return 1;
            return (first.right - second.right);
        });

        var clusterGapThreshold = Math.max(
            topBandClusterGapX,
            Math.floor(frameColumns * topBandClusterGapRatio)
        );

        var clusters = [];
        var activeCluster = null;

        for (var intervalIndex = 0; intervalIndex < candidateIntervals.length; intervalIndex++) {
            var interval = candidateIntervals[intervalIndex];
            if (activeCluster == null) {
                activeCluster = {
                    left: interval.left,
                    right: interval.right,
                    maxBottom: interval.bottom,
                    count: 1,
                    intervals: [{ left: interval.left, right: interval.right }]
                };
                continue;
            }

            if (interval.left > (activeCluster.right + clusterGapThreshold)) {
                clusters.push(activeCluster);
                activeCluster = {
                    left: interval.left,
                    right: interval.right,
                    maxBottom: interval.bottom,
                    count: 1,
                    intervals: [{ left: interval.left, right: interval.right }]
                };
                continue;
            }

            activeCluster.right = Math.max(activeCluster.right, interval.right);
            activeCluster.maxBottom = Math.max(activeCluster.maxBottom, interval.bottom);
            activeCluster.count += 1;
            activeCluster.intervals.push({ left: interval.left, right: interval.right });
        }

        if (activeCluster != null)
            clusters.push(activeCluster);

        var promotedRegions = [];
        for (var clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
            var cluster = clusters[clusterIndex];
            if (cluster.count < topBandMinRegionCountPerCluster)
                continue;

            var coverageWidth = Math.max(0, (cluster.right - cluster.left));
            var coverageRatio = (coverageWidth / Math.max(1, frameColumns));
            if (coverageRatio < topBandMinCoverageRatio)
                continue;

            var mergedCoverageWidth = 0;
            var activeLeft = -1;
            var activeRight = -1;
            var clusterIntervals = cluster.intervals.slice(0).sort((first, second) => {
                if (first.left < second.left)
                    return -1;
                if (first.left > second.left)
                    return 1;
                return (first.right - second.right);
            });

            for (var clusterIntervalIndex = 0; clusterIntervalIndex < clusterIntervals.length; clusterIntervalIndex++) {
                var clusterInterval = clusterIntervals[clusterIntervalIndex];
                if (activeLeft < 0) {
                    activeLeft = clusterInterval.left;
                    activeRight = clusterInterval.right;
                    continue;
                }

                if (clusterInterval.left > activeRight) {
                    mergedCoverageWidth += Math.max(0, (activeRight - activeLeft));
                    activeLeft = clusterInterval.left;
                    activeRight = clusterInterval.right;
                    continue;
                }

                activeRight = Math.max(activeRight, clusterInterval.right);
            }
            if (activeLeft >= 0)
                mergedCoverageWidth += Math.max(0, (activeRight - activeLeft));

            var spanOccupancyRatio = (mergedCoverageWidth / Math.max(1, coverageWidth));
            if (spanOccupancyRatio < topBandMinSpanOccupancyRatio)
                continue;

            var promotedHeight = this.clamp((cluster.maxBottom + topBandPaddingY), 1, Math.min(frameRows, topBandMaxHeight));
            if (promotedHeight <= 0)
                continue;

            var promotedLeft = this.clamp((cluster.left - topBandPaddingX), 0, frameColumns);
            var promotedRight = this.clamp((cluster.right + topBandPaddingX), 0, frameColumns);
            if (topBandExpandToFullWidth === true) {
                promotedLeft = 0;
                promotedRight = frameColumns;
            }

            if (promotedRight <= promotedLeft)
                continue;

            var promotedWidth = (promotedRight - promotedLeft);
            var promotedRegion = {
                x: promotedLeft,
                y: 0,
                width: promotedWidth,
                height: promotedHeight
            };

            if ((ocrOptions?.topBandRespectImagingBounds !== false)
                && (imagingBounds != null)) {
                var promotedRegionArea = Math.max(1, (promotedWidth * promotedHeight));
                var overlapArea = this.resolveOverlapArea(
                    promotedRegion,
                    imagingBounds
                );
                var overlapRatio = (overlapArea / promotedRegionArea);
                var maxOverlapRatio = this.clamp(this.toNumeric(ocrOptions?.topBandMaxImagingOverlapRatio, 0.05), 0, 1);
                if (overlapRatio > maxOverlapRatio)
                    continue;
            }

            promotedRegion._kind = "top-band";
            promotedRegions.push(promotedRegion);
        }

        return promotedRegions;

    }

    /**
     * Resolve complementary outside-bounds regions for one inner imaging bounds.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {object | null} bounds Inner bounds.
     * @param {object | null} ocrOptions OCR options.
     * @returns {Array<object>} Outside regions.
     */
    resolveOutsideBoundsRegions(columns, rows, bounds, ocrOptions = null) {

        var frameColumns = Math.max(1, this.toInteger(columns, 1));
        var frameRows = Math.max(1, this.toInteger(rows, 1));

        if (ocrOptions?.redactOutsideImagingBounds !== true)
            return [];

        if (bounds == null)
            return [];

        var left = this.clamp(Math.floor(this.resolveRegionX(bounds)), 0, frameColumns);
        var top = this.clamp(Math.floor(this.resolveRegionY(bounds)), 0, frameRows);
        var right = this.clamp(Math.ceil(left + this.resolveRegionWidth(bounds)), 0, frameColumns);
        var bottom = this.clamp(Math.ceil(top + this.resolveRegionHeight(bounds)), 0, frameRows);

        if ((right <= left) || (bottom <= top))
            return [];

        var frameArea = Math.max(1, (frameColumns * frameRows));
        var boundsArea = Math.max(0, ((right - left) * (bottom - top)));
        var boundsAreaRatio = (boundsArea / frameArea);
        var minimumBoundsAreaRatio = this.clamp(
            this.toNumeric(ocrOptions?.minImagingBoundsAreaRatioForOutsideRedaction, 0.1),
            0,
            1
        );

        if (boundsAreaRatio < minimumBoundsAreaRatio)
            return [];

        var regions = [];

        if (top > 0) {
            regions.push({
                x: 0,
                y: 0,
                width: frameColumns,
                height: top,
                _kind: "outside-bounds"
            });
        }

        if (left > 0) {
            regions.push({
                x: 0,
                y: top,
                width: left,
                height: Math.max(0, (bottom - top)),
                _kind: "outside-bounds"
            });
        }

        if (right < frameColumns) {
            regions.push({
                x: right,
                y: top,
                width: Math.max(0, (frameColumns - right)),
                height: Math.max(0, (bottom - top)),
                _kind: "outside-bounds"
            });
        }

        if (bottom < frameRows) {
            regions.push({
                x: 0,
                y: bottom,
                width: frameColumns,
                height: Math.max(0, (frameRows - bottom)),
                _kind: "outside-bounds"
            });
        }

        regions = regions.filter((region) => ((region.width > 0) && (region.height > 0)));

        if (regions.length == 0)
            return regions;

        var outsideArea = 0;
        for (var regionIndex = 0; regionIndex < regions.length; regionIndex++) {
            outsideArea += Math.max(0, (regions[regionIndex].width * regions[regionIndex].height));
        }

        var outsideAreaRatio = (outsideArea / frameArea);
        var maximumOutsideRedactionRatio = this.clamp(
            this.toNumeric(ocrOptions?.maxOutsideRedactionRatio, 0.9),
            0,
            1
        );

        if (outsideAreaRatio > maximumOutsideRedactionRatio)
            return [];

        return regions;

    }

    /**
     * Resolve overlap area between two axis-aligned regions.
     * @param {object | null} first First region.
     * @param {object | null} second Second region.
     * @returns {number} Overlap area in pixels.
     */
    resolveOverlapArea(first, second) {

        if ((first == null) || (second == null))
            return 0;

        var firstLeft = this.resolveRegionX(first);
        var firstTop = this.resolveRegionY(first);
        var firstRight = (firstLeft + this.resolveRegionWidth(first));
        var firstBottom = (firstTop + this.resolveRegionHeight(first));

        var secondLeft = this.resolveRegionX(second);
        var secondTop = this.resolveRegionY(second);
        var secondRight = (secondLeft + this.resolveRegionWidth(second));
        var secondBottom = (secondTop + this.resolveRegionHeight(second));

        var overlapLeft = Math.max(firstLeft, secondLeft);
        var overlapTop = Math.max(firstTop, secondTop);
        var overlapRight = Math.min(firstRight, secondRight);
        var overlapBottom = Math.min(firstBottom, secondBottom);

        if ((overlapRight <= overlapLeft) || (overlapBottom <= overlapTop))
            return 0;

        return ((overlapRight - overlapLeft) * (overlapBottom - overlapTop));

    }

    /**
     * Determine whether two axis-aligned regions intersect.
     * @param {object | null} first First region.
     * @param {object | null} second Second region.
     * @returns {boolean} TRUE when regions intersect.
     */
    intersectsRegion(first, second) {

        if ((first == null) || (second == null))
            return false;

        var firstLeft = this.resolveRegionX(first);
        var firstTop = this.resolveRegionY(first);
        var firstRight = (firstLeft + this.resolveRegionWidth(first));
        var firstBottom = (firstTop + this.resolveRegionHeight(first));

        var secondLeft = this.resolveRegionX(second);
        var secondTop = this.resolveRegionY(second);
        var secondRight = (secondLeft + this.resolveRegionWidth(second));
        var secondBottom = (secondTop + this.resolveRegionHeight(second));

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
     * Determine whether one region fully contains another.
     * @param {object | null} outer Outer region.
     * @param {object | null} inner Inner region.
     * @returns {boolean} TRUE when outer contains inner.
     */
    containsRegion(outer, inner) {

        if ((outer == null) || (inner == null))
            return false;

        var outerLeft = this.resolveRegionX(outer);
        var outerTop = this.resolveRegionY(outer);
        var outerRight = (outerLeft + this.resolveRegionWidth(outer));
        var outerBottom = (outerTop + this.resolveRegionHeight(outer));

        var innerLeft = this.resolveRegionX(inner);
        var innerTop = this.resolveRegionY(inner);
        var innerRight = (innerLeft + this.resolveRegionWidth(inner));
        var innerBottom = (innerTop + this.resolveRegionHeight(inner));

        return (
            (innerLeft >= outerLeft)
            && (innerTop >= outerTop)
            && (innerRight <= outerRight)
            && (innerBottom <= outerBottom)
        );

    }

    /**
     * Expand or inset one region by pixel padding and clamp to frame dimensions.
     * @param {object | null} region Region.
     * @param {number} paddingX Horizontal padding (negative to inset).
     * @param {number} paddingY Vertical padding (negative to inset).
     * @param {number} frameColumns Frame columns.
     * @param {number} frameRows Frame rows.
     * @returns {object | null} Adjusted region or null when empty.
     */
    adjustRegion(region, paddingX, paddingY, frameColumns, frameRows) {

        if (region == null)
            return null;

        var left = this.resolveRegionX(region);
        var top = this.resolveRegionY(region);
        var right = (left + this.resolveRegionWidth(region));
        var bottom = (top + this.resolveRegionHeight(region));

        left = this.clamp(Math.floor(left - paddingX), 0, frameColumns);
        top = this.clamp(Math.floor(top - paddingY), 0, frameRows);
        right = this.clamp(Math.ceil(right + paddingX), 0, frameColumns);
        bottom = this.clamp(Math.ceil(bottom + paddingY), 0, frameRows);

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
     * Resolve boundary-ring width in pixels.
     * @param {number} frameColumns Frame columns.
     * @param {number} frameRows Frame rows.
     * @param {object | null} ocrOptions OCR options.
     * @returns {number} Ring width in pixels.
     */
    resolveBoundaryRingWidth(frameColumns, frameRows, ocrOptions = null) {

        var minimumDimension = Math.max(1, Math.min(frameColumns, frameRows));
        var configuredWidth = Math.max(1, this.toInteger(ocrOptions?.boundaryRingWidth, 12));
        var configuredRatio = this.clamp(this.toNumeric(ocrOptions?.boundaryRingWidthRatio, 0.025), 0, 1);
        var ratioWidth = Math.max(1, Math.floor(minimumDimension * configuredRatio));

        return Math.max(configuredWidth, ratioWidth);

    }

    /**
     * Determine whether one OCR region is in the imaging boundary ring.
     * @param {object | null} region OCR region.
     * @param {object | null} imagingBounds Imaging bounds.
     * @param {number} frameColumns Frame columns.
     * @param {number} frameRows Frame rows.
     * @param {object | null} ocrOptions OCR options.
     * @returns {boolean} TRUE when boundary-ring candidate.
     */
    isBoundaryRingCandidate(region, imagingBounds, frameColumns, frameRows, ocrOptions = null) {

        if (ocrOptions?.boundaryRingEnabled !== true)
            return false;

        if ((region == null) || (imagingBounds == null))
            return false;

        var ringWidth = this.resolveBoundaryRingWidth(frameColumns, frameRows, ocrOptions);
        var expandedBounds = this.adjustRegion(imagingBounds, ringWidth, ringWidth, frameColumns, frameRows);
        if (expandedBounds == null)
            return false;

        if (this.intersectsRegion(region, expandedBounds) !== true)
            return false;

        var innerBounds = this.adjustRegion(imagingBounds, -ringWidth, -ringWidth, frameColumns, frameRows);
        if (innerBounds == null)
            return true;

        if (this.containsRegion(innerBounds, region) === true)
            return false;

        return true;

    }

    /**
     * Resolve one pixel luminance [0,255].
     * @param {number} red Red channel.
     * @param {number} green Green channel.
     * @param {number} blue Blue channel.
     * @returns {number} Luminance.
     */
    resolveLuma(red, green, blue) {
        return Math.floor(((77 * red) + (150 * green) + (29 * blue)) / 256);
    }

    /**
     * Resolve foreground color profile for one region.
     * @param {object | null} region Region.
     * @param {Uint8Array | null} rgba RGBA bytes.
     * @param {number} frameColumns Frame columns.
     * @param {number} frameRows Frame rows.
     * @param {object | null} ocrOptions OCR options.
     * @returns {object | null} Foreground profile.
     */
    resolveRegionForegroundColorProfile(region, rgba, frameColumns, frameRows, ocrOptions = null) {

        if ((region == null) || ((rgba instanceof Uint8Array) != true))
            return null;

        var left = this.clamp(Math.floor(this.resolveRegionX(region)), 0, frameColumns);
        var top = this.clamp(Math.floor(this.resolveRegionY(region)), 0, frameRows);
        var right = this.clamp(Math.ceil(left + this.resolveRegionWidth(region)), 0, frameColumns);
        var bottom = this.clamp(Math.ceil(top + this.resolveRegionHeight(region)), 0, frameRows);
        if ((right <= left) || (bottom <= top))
            return null;

        var minAlpha = Math.max(0, this.toInteger(ocrOptions?.minAlpha, 8));
        var detectBrightText = (ocrOptions?.detectBrightText !== false);
        var detectDarkText = (ocrOptions?.detectDarkText === true);
        var foregroundLumaWindow = Math.max(4, this.toInteger(ocrOptions?.foregroundLumaWindow, 40));
        var minForegroundLuma = this.clamp(this.toNumeric(ocrOptions?.minForegroundLuma, 96), 0, 255);
        var quantizationStep = Math.max(1, this.toInteger(ocrOptions?.foregroundColorQuantizationStep, 16));

        var minLuma = 255;
        var maxLuma = 0;
        var sampleCount = 0;

        for (var row = top; row < bottom; row++) {
            var pixelOffset = ((row * frameColumns) + left);
            for (var column = left; column < right; column++) {
                var rgbaOffset = (pixelOffset * 4);
                var alpha = rgba[rgbaOffset + 3] ?? 255;
                pixelOffset += 1;
                if (alpha < minAlpha)
                    continue;

                var red = rgba[rgbaOffset + 0] ?? 0;
                var green = rgba[rgbaOffset + 1] ?? 0;
                var blue = rgba[rgbaOffset + 2] ?? 0;
                var luma = this.resolveLuma(red, green, blue);
                minLuma = Math.min(minLuma, luma);
                maxLuma = Math.max(maxLuma, luma);
                sampleCount += 1;
            }
        }

        if (sampleCount <= 0)
            return null;

        var brightThreshold = Math.max(minForegroundLuma, (maxLuma - foregroundLumaWindow));
        var darkThreshold = Math.min(255, (minLuma + foregroundLumaWindow));

        var initializeStats = () => ({
            count: 0,
            lumaSum: 0,
            lumaSquaredSum: 0,
            colorCounts: new Map(),
            dominantColorCount: 0,
            topColorCoverage: 0,
            paletteRatio: 1
        });

        var accumulateStats = (stats, red, green, blue, luma) => {
            stats.count += 1;
            stats.lumaSum += luma;
            stats.lumaSquaredSum += (luma * luma);

            var qr = Math.floor(red / quantizationStep);
            var qg = Math.floor(green / quantizationStep);
            var qb = Math.floor(blue / quantizationStep);
            var colorKey = `${qr}|${qg}|${qb}`;
            var colorCount = ((stats.colorCounts.get(colorKey) ?? 0) + 1);
            stats.colorCounts.set(colorKey, colorCount);
            if (colorCount > stats.dominantColorCount)
                stats.dominantColorCount = colorCount;
        };

        var finalizeStats = (stats) => {
            if (stats.count <= 0)
                return null;

            var meanLuma = (stats.lumaSum / stats.count);
            var variance = ((stats.lumaSquaredSum / stats.count) - (meanLuma * meanLuma));
            var lumaStdDev = Math.sqrt(Math.max(0, variance));
            var dominantColorRatio = (stats.dominantColorCount / Math.max(1, stats.count));
            var sortedColorCounts = Array.from(stats.colorCounts.values()).sort((left, right) => (right - left));
            var topColorCoverage = 0;
            for (var rank = 0; rank < Math.min(3, sortedColorCounts.length); rank++) {
                topColorCoverage += sortedColorCounts[rank];
            }
            topColorCoverage = (topColorCoverage / Math.max(1, stats.count));
            var paletteRatio = (stats.colorCounts.size / Math.max(1, stats.count));

            return {
                count: stats.count,
                lumaStdDev: lumaStdDev,
                dominantColorRatio: dominantColorRatio,
                topColorCoverage: topColorCoverage,
                paletteRatio: paletteRatio
            };
        };

        var brightStats = initializeStats();
        var darkStats = initializeStats();

        for (var scanRow = top; scanRow < bottom; scanRow++) {
            var scanPixelOffset = ((scanRow * frameColumns) + left);
            for (var scanColumn = left; scanColumn < right; scanColumn++) {
                var scanOffset = (scanPixelOffset * 4);
                var scanAlpha = rgba[scanOffset + 3] ?? 255;
                scanPixelOffset += 1;
                if (scanAlpha < minAlpha)
                    continue;

                var scanRed = rgba[scanOffset + 0] ?? 0;
                var scanGreen = rgba[scanOffset + 1] ?? 0;
                var scanBlue = rgba[scanOffset + 2] ?? 0;
                var scanLuma = this.resolveLuma(scanRed, scanGreen, scanBlue);

                if (detectBrightText === true) {
                    if (scanLuma >= brightThreshold)
                        accumulateStats(brightStats, scanRed, scanGreen, scanBlue, scanLuma);
                }

                if (detectDarkText === true) {
                    if (scanLuma <= darkThreshold)
                        accumulateStats(darkStats, scanRed, scanGreen, scanBlue, scanLuma);
                }
            }
        }

        var brightProfile = finalizeStats(brightStats);
        var darkProfile = finalizeStats(darkStats);

        if ((detectBrightText === true) && (detectDarkText !== true))
            return brightProfile;
        if ((detectDarkText === true) && (detectBrightText !== true))
            return darkProfile;

        if (brightProfile == null)
            return darkProfile;
        if (darkProfile == null)
            return brightProfile;

        if (brightProfile.count > darkProfile.count)
            return brightProfile;
        if (darkProfile.count > brightProfile.count)
            return darkProfile;

        return (brightProfile.lumaStdDev <= darkProfile.lumaStdDev)
            ? brightProfile
            : darkProfile;

    }

    /**
     * Resolve background-surround profile for one region from a padded ring.
     * @param {object | null} region Region.
     * @param {Uint8Array | null} rgba RGBA bytes.
     * @param {number} frameColumns Frame columns.
     * @param {number} frameRows Frame rows.
     * @param {object | null} ocrOptions OCR options.
     * @returns {object | null} Surround profile.
     */
    resolveRegionSurroundBackgroundProfile(region, rgba, frameColumns, frameRows, ocrOptions = null) {

        if ((region == null) || ((rgba instanceof Uint8Array) != true))
            return null;

        var left = this.clamp(Math.floor(this.resolveRegionX(region)), 0, frameColumns);
        var top = this.clamp(Math.floor(this.resolveRegionY(region)), 0, frameRows);
        var right = this.clamp(Math.ceil(left + this.resolveRegionWidth(region)), 0, frameColumns);
        var bottom = this.clamp(Math.ceil(top + this.resolveRegionHeight(region)), 0, frameRows);
        if ((right <= left) || (bottom <= top))
            return null;

        var ringPadding = Math.max(1, this.toInteger(ocrOptions?.surroundBackgroundRingPadding, 3));
        var outerLeft = this.clamp((left - ringPadding), 0, frameColumns);
        var outerTop = this.clamp((top - ringPadding), 0, frameRows);
        var outerRight = this.clamp((right + ringPadding), 0, frameColumns);
        var outerBottom = this.clamp((bottom + ringPadding), 0, frameRows);
        if ((outerRight <= outerLeft) || (outerBottom <= outerTop))
            return null;

        var minAlpha = Math.max(0, this.toInteger(ocrOptions?.minAlpha, 8));
        var darkLumaMax = this.clamp(this.toNumeric(ocrOptions?.surroundBackgroundDarkLumaMax, 72), 0, 255);

        var count = 0;
        var darkCount = 0;

        for (var row = outerTop; row < outerBottom; row++) {
            var pixelOffset = ((row * frameColumns) + outerLeft);
            for (var column = outerLeft; column < outerRight; column++) {
                var isInnerPixel = (
                    (column >= left)
                    && (column < right)
                    && (row >= top)
                    && (row < bottom)
                );
                var rgbaOffset = (pixelOffset * 4);
                pixelOffset += 1;

                if (isInnerPixel === true)
                    continue;

                var alpha = rgba[rgbaOffset + 3] ?? 255;
                if (alpha < minAlpha)
                    continue;

                var red = rgba[rgbaOffset + 0] ?? 0;
                var green = rgba[rgbaOffset + 1] ?? 0;
                var blue = rgba[rgbaOffset + 2] ?? 0;
                var luma = this.resolveLuma(red, green, blue);
                count += 1;
                if (luma <= darkLumaMax)
                    darkCount += 1;
            }
        }

        if (count <= 0)
            return null;

        return {
            count: count,
            darkRatio: (darkCount / count)
        };

    }

    /**
     * Apply OCR region safety constraints to avoid catastrophic over-redaction.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {Array<object>} regions Candidate regions.
     * @param {object | null} ocrOptions OCR options.
     * @param {object | null} imagingBounds Detected imaging bounds.
     * @returns {Array<object>} Safe regions.
     */
    sanitizeOcrRegions(columns, rows, regions, ocrOptions = null, imagingBounds = null, rgba = null) {

        if (Array.isArray(regions) == false)
            return [];
        if (regions.length == 0)
            return [];

        var frameColumns = Math.max(1, this.toInteger(columns, 1));
        var frameRows = Math.max(1, this.toInteger(rows, 1));
        var frameArea = Math.max(1, (frameColumns * frameRows));
        var isTinyFrame = (frameArea < 1024);
        var maxOcrRegionAreaRatio = this.clamp(this.toNumeric(ocrOptions?.maxOcrRegionAreaRatio, 0.15), 0, 1);
        var maxCombinedRegionAreaRatio = this.clamp(this.toNumeric(ocrOptions?.maxCombinedRegionAreaRatio, 0.6), 0, 1);
        var glyphScoreGateEnabled = (ocrOptions?.glyphScoreGateEnabled !== false);
        var minGlyphScore = this.clamp(this.toNumeric(ocrOptions?.minGlyphScore, 0.2), 0, 1);
        var minGlyphScoreInsideImaging = this.clamp(this.toNumeric(ocrOptions?.minGlyphScoreInsideImaging, 0.58), 0, 1);
        var minGlyphScoreBoundaryRing = this.clamp(this.toNumeric(ocrOptions?.minGlyphScoreBoundaryRing, 0.28), 0, 1);
        var minInsideOverlapForGlyphGate = this.clamp(this.toNumeric(ocrOptions?.minInsideOverlapForGlyphGate, 0.3), 0, 1);
        var minBoundaryRingComponentCount = Math.max(1, this.toInteger(ocrOptions?.minBoundaryRingComponentCount, 2));
        var minInsideImagingComponentCount = Math.max(1, this.toInteger(ocrOptions?.minInsideImagingComponentCount, 3));
        var minInsideImagingComponentCountTopZone = Math.max(1, this.toInteger(ocrOptions?.minInsideImagingComponentCountTopZone, 2));
        var minInsideImagingComponentCoverage = this.clamp(this.toNumeric(ocrOptions?.minInsideImagingComponentCoverage, 0.01), 0, 1);
        var minInsideImagingComponentCoverageTopZone = this.clamp(this.toNumeric(ocrOptions?.minInsideImagingComponentCoverageTopZone, 0.008), 0, 1);
        var maxInsideImagingComponentCoverage = this.clamp(this.toNumeric(ocrOptions?.maxInsideImagingComponentCoverage, 0.8), 0, 1);
        var insideSmallGlyphRelaxationEnabled = (ocrOptions?.insideSmallGlyphRelaxationEnabled !== false);
        var insideSmallGlyphMinOverlapRatio = this.clamp(this.toNumeric(ocrOptions?.insideSmallGlyphMinOverlapRatio, 0.2), 0, 1);
        var insideSmallGlyphMaxAreaRatio = this.clamp(this.toNumeric(ocrOptions?.insideSmallGlyphMaxAreaRatio, 0.008), 0, 1);
        var insideSmallGlyphMaxWidthRatio = this.clamp(this.toNumeric(ocrOptions?.insideSmallGlyphMaxWidthRatio, 0.18), 0, 1);
        var insideSmallGlyphMaxHeightRatio = this.clamp(this.toNumeric(ocrOptions?.insideSmallGlyphMaxHeightRatio, 0.12), 0, 1);
        var insideSmallGlyphMinComponentCount = Math.max(1, this.toInteger(ocrOptions?.insideSmallGlyphMinComponentCount, 1));
        var insideSmallGlyphMinComponentCoverage = this.clamp(this.toNumeric(ocrOptions?.insideSmallGlyphMinComponentCoverage, 0.003), 0, 1);
        var insideSmallGlyphMinForegroundPixelCount = Math.max(1, this.toInteger(ocrOptions?.insideSmallGlyphMinForegroundPixelCount, 1));
        var insideSmallGlyphMaxForegroundLumaStdDev = Math.max(0, this.toNumeric(ocrOptions?.insideSmallGlyphMaxForegroundLumaStdDev, 64));
        var insideSmallGlyphMinDominantColorRatio = this.clamp(this.toNumeric(ocrOptions?.insideSmallGlyphMinDominantColorRatio, 0.04), 0, 1);
        var insideSmallGlyphMinTopColorCoverage = this.clamp(this.toNumeric(ocrOptions?.insideSmallGlyphMinTopColorCoverage, 0.08), 0, 1);
        var insideSmallGlyphMaxForegroundPaletteRatio = this.clamp(this.toNumeric(ocrOptions?.insideSmallGlyphMaxForegroundPaletteRatio, 1), 0, 1);
        var insideSmallGlyphMinGlyphScore = this.clamp(this.toNumeric(ocrOptions?.insideSmallGlyphMinGlyphScore, 0.18), 0, 1);
        var insideSmallGlyphMinGlyphScoreCore = this.clamp(this.toNumeric(ocrOptions?.insideSmallGlyphMinGlyphScoreCore, 0.48), 0, 1);
        var foregroundColorConsistencyGateEnabled = (ocrOptions?.foregroundColorConsistencyGateEnabled !== false);
        var minColorDistributionSampleCount = Math.max(1, this.toInteger(ocrOptions?.minColorDistributionSampleCount, 6));
        var minForegroundPixelCountInsideImaging = Math.max(1, this.toInteger(ocrOptions?.minForegroundPixelCountInsideImaging, 10));
        var minForegroundPixelCountBoundaryRing = Math.max(1, this.toInteger(ocrOptions?.minForegroundPixelCountBoundaryRing, 6));
        var maxForegroundLumaStdDevInsideImaging = Math.max(0, this.toNumeric(ocrOptions?.maxForegroundLumaStdDevInsideImaging, 28));
        var maxForegroundLumaStdDevBoundaryRing = Math.max(0, this.toNumeric(ocrOptions?.maxForegroundLumaStdDevBoundaryRing, 38));
        var minDominantColorRatioInsideImaging = this.clamp(this.toNumeric(ocrOptions?.minDominantColorRatioInsideImaging, 0.28), 0, 1);
        var minDominantColorRatioInsideImagingTopZone = this.clamp(this.toNumeric(ocrOptions?.minDominantColorRatioInsideImagingTopZone, 0.2), 0, 1);
        var minDominantColorRatioBoundaryRing = this.clamp(this.toNumeric(ocrOptions?.minDominantColorRatioBoundaryRing, 0.2), 0, 1);
        var minTopColorCoverageInsideImaging = this.clamp(this.toNumeric(ocrOptions?.minTopColorCoverageInsideImaging, 0.46), 0, 1);
        var minTopColorCoverageInsideImagingTopZone = this.clamp(this.toNumeric(ocrOptions?.minTopColorCoverageInsideImagingTopZone, 0.36), 0, 1);
        var minTopColorCoverageBoundaryRing = this.clamp(this.toNumeric(ocrOptions?.minTopColorCoverageBoundaryRing, 0.34), 0, 1);
        var minTopColorCoverageOutside = this.clamp(this.toNumeric(ocrOptions?.minTopColorCoverageOutside, 0.34), 0, 1);
        var maxForegroundPaletteRatioInsideImaging = this.clamp(this.toNumeric(ocrOptions?.maxForegroundPaletteRatioInsideImaging, 0.55), 0, 1);
        var maxForegroundPaletteRatioInsideImagingTopZone = this.clamp(this.toNumeric(ocrOptions?.maxForegroundPaletteRatioInsideImagingTopZone, 0.72), 0, 1);
        var maxForegroundPaletteRatioBoundaryRing = this.clamp(this.toNumeric(ocrOptions?.maxForegroundPaletteRatioBoundaryRing, 0.7), 0, 1);
        var maxForegroundPaletteRatioOutside = this.clamp(this.toNumeric(ocrOptions?.maxForegroundPaletteRatioOutside, 0.7), 0, 1);
        var maxInsideRegionWidthRatio = this.clamp(this.toNumeric(ocrOptions?.maxInsideRegionWidthRatio, 0.22), 0, 1);
        var maxInsideRegionHeightRatio = this.clamp(this.toNumeric(ocrOptions?.maxInsideRegionHeightRatio, 0.16), 0, 1);
        var maxInsideTopZoneWidthRatio = this.clamp(this.toNumeric(ocrOptions?.maxInsideTopZoneWidthRatio, 0.36), 0, 1);
        var maxInsideTopZoneHeightRatio = this.clamp(this.toNumeric(ocrOptions?.maxInsideTopZoneHeightRatio, 0.24), 0, 1);
        var maxBoundaryRingRegionWidthRatio = this.clamp(this.toNumeric(ocrOptions?.maxBoundaryRingRegionWidthRatio, 0.2), 0, 1);
        var maxBoundaryRingRegionHeightRatio = this.clamp(this.toNumeric(ocrOptions?.maxBoundaryRingRegionHeightRatio, 0.2), 0, 1);
        var maxOutsideRegionWidthRatio = this.clamp(this.toNumeric(ocrOptions?.maxOutsideRegionWidthRatio, 0.24), 0, 1);
        var maxOutsideRegionHeightRatio = this.clamp(this.toNumeric(ocrOptions?.maxOutsideRegionHeightRatio, 0.14), 0, 1);
        var minOutsideComponentCount = Math.max(1, this.toInteger(ocrOptions?.minOutsideComponentCount, 2));
        var minOutsideComponentCoverage = this.clamp(this.toNumeric(ocrOptions?.minOutsideComponentCoverage, 0.02), 0, 1);
        var minGlyphScoreOutside = this.clamp(this.toNumeric(ocrOptions?.minGlyphScoreOutside, 0.3), 0, 1);
        var minDominantColorRatioOutside = this.clamp(this.toNumeric(ocrOptions?.minDominantColorRatioOutside, 0.2), 0, 1);
        var peripheralOutsideRelaxationEnabled = (ocrOptions?.peripheralOutsideRelaxationEnabled !== false);
        var peripheralOutsideMinComponentCount = Math.max(1, this.toInteger(ocrOptions?.peripheralOutsideMinComponentCount, 1));
        var peripheralOutsideMinComponentCoverage = this.clamp(this.toNumeric(ocrOptions?.peripheralOutsideMinComponentCoverage, 0.005), 0, 1);
        var peripheralMinGlyphScoreOutside = this.clamp(this.toNumeric(ocrOptions?.peripheralMinGlyphScoreOutside, 0.14), 0, 1);
        var peripheralMinDominantColorRatioOutside = this.clamp(this.toNumeric(ocrOptions?.peripheralMinDominantColorRatioOutside, 0.12), 0, 1);
        var peripheralMinTopColorCoverageOutside = this.clamp(this.toNumeric(ocrOptions?.peripheralMinTopColorCoverageOutside, 0.2), 0, 1);
        var peripheralMaxForegroundPaletteRatioOutside = this.clamp(this.toNumeric(ocrOptions?.peripheralMaxForegroundPaletteRatioOutside, 1), 0, 1);
        var peripheralMinForegroundPixelCountOutside = Math.max(1, this.toInteger(ocrOptions?.peripheralMinForegroundPixelCountOutside, 1));
        var peripheralMaxOutsideRegionWidthRatio = this.clamp(this.toNumeric(ocrOptions?.peripheralMaxOutsideRegionWidthRatio, 0.42), 0, 1);
        var peripheralMaxOutsideRegionHeightRatio = this.clamp(this.toNumeric(ocrOptions?.peripheralMaxOutsideRegionHeightRatio, 0.22), 0, 1);
        var peripheralRightOutsideRelaxationEnabled = (ocrOptions?.peripheralRightOutsideRelaxationEnabled !== false);
        var peripheralRightOutsideMinComponentCount = Math.max(1, this.toInteger(ocrOptions?.peripheralRightOutsideMinComponentCount, 2));
        var peripheralRightOutsideMaxComponentCoverage = this.clamp(this.toNumeric(ocrOptions?.peripheralRightOutsideMaxComponentCoverage, 0.45), 0, 1);
        var peripheralRightMaxOutsideRegionHeightRatio = this.clamp(this.toNumeric(ocrOptions?.peripheralRightMaxOutsideRegionHeightRatio, 0.4), 0, 1);
        var peripheralRightColorConsistencyBypassEnabled = (ocrOptions?.peripheralRightColorConsistencyBypassEnabled !== false);
        var peripheralRightMinSurroundDarkRatioForColorBypass = this.clamp(this.toNumeric(ocrOptions?.peripheralRightMinSurroundDarkRatioForColorBypass, 0.6), 0, 1);
        var peripheralRightMinSurroundSampleCountForColorBypass = Math.max(1, this.toInteger(ocrOptions?.peripheralRightMinSurroundSampleCountForColorBypass, 24));
        var peripheralRightMinGlyphScoreForColorBypass = this.clamp(this.toNumeric(ocrOptions?.peripheralRightMinGlyphScoreForColorBypass, 0.16), 0, 1);
        var topZoneRatio = this.clamp(this.toNumeric(ocrOptions?.topZoneRatio, 0.24), 0, 1);
        var bottomZoneRatio = this.clamp(this.toNumeric(ocrOptions?.bottomZoneRatio, 0.24), 0, 1);
        var leftZoneRatio = this.clamp(this.toNumeric(ocrOptions?.leftZoneRatio, 0.24), 0, 1);
        var rightZoneRatio = this.clamp(this.toNumeric(ocrOptions?.rightZoneRatio, 0.28), 0, 1);
        var topZoneLimit = Math.max(0, Math.floor(frameRows * topZoneRatio));
        var bottomZoneStart = Math.max(0, (frameRows - Math.floor(frameRows * bottomZoneRatio)));
        var leftZoneLimit = Math.max(0, Math.floor(frameColumns * leftZoneRatio));
        var rightZoneStart = Math.max(0, (frameColumns - Math.floor(frameColumns * rightZoneRatio)));
        var topZoneGlyphBoostEnabled = (ocrOptions?.topZoneGlyphBoostEnabled !== false);
        var minGlyphScoreTopZone = this.clamp(this.toNumeric(ocrOptions?.minGlyphScoreTopZone, 0.18), 0, 1);
        var topZoneGlyphBoostRatio = this.clamp(this.toNumeric(ocrOptions?.topZoneGlyphBoostRatio, 0.24), 0, 1);
        var noBoundsBottomOnlyGuardEnabled = (ocrOptions?.noBoundsBottomOnlyGuardEnabled !== false);
        var noBoundsBottomOnlyMinGlyphScore = this.clamp(this.toNumeric(ocrOptions?.noBoundsBottomOnlyMinGlyphScore, 0.45), 0, 1);
        var noBoundsBottomOnlyMinComponentCount = Math.max(1, this.toInteger(ocrOptions?.noBoundsBottomOnlyMinComponentCount, 2));
        var noBoundsBottomOnlyMaxComponentCoverage = this.clamp(this.toNumeric(ocrOptions?.noBoundsBottomOnlyMaxComponentCoverage, 0.45), 0, 1);
        var noBoundsBottomOnlyMaxHeightRatio = this.clamp(this.toNumeric(ocrOptions?.noBoundsBottomOnlyMaxHeightRatio, 0.035), 0, 1);
        var surroundBackgroundGateEnabled = (ocrOptions?.surroundBackgroundGateEnabled !== false);
        var surroundBackgroundCoreOnly = (ocrOptions?.surroundBackgroundCoreOnly !== false);
        var surroundBackgroundMinDarkRatio = this.clamp(this.toNumeric(ocrOptions?.surroundBackgroundMinDarkRatio, 0.55), 0, 1);
        var surroundBackgroundMinSampleCount = Math.max(1, this.toInteger(ocrOptions?.surroundBackgroundMinSampleCount, 32));
        var surroundBackgroundBypassGlyphScore = this.clamp(this.toNumeric(ocrOptions?.surroundBackgroundBypassGlyphScore, 0.8), 0, 1);
        var topZoneGlyphBoostLimit = Math.max(0, Math.floor(frameRows * topZoneGlyphBoostRatio));

        var filtered = [];
        for (var regionIndex = 0; regionIndex < regions.length; regionIndex++) {
            var region = regions[regionIndex];
            if (region == null)
                continue;

            var x = this.resolveRegionX(region);
            var y = this.resolveRegionY(region);
            var width = this.resolveRegionWidth(region);
            var height = this.resolveRegionHeight(region);
            if ((width <= 0) || (height <= 0))
                continue;

            var kind = String(region?._kind ?? "ocr");
            var regionAreaRatio = ((width * height) / frameArea);

            if ((isTinyFrame != true)
                && (kind == "ocr")
                && (regionAreaRatio > maxOcrRegionAreaRatio))
                continue;

            var overlapArea = 0;
            var overlapRatio = 0;
            var glyphScore = 1;
            var isBoundaryRingCandidate = false;
            var componentCount = this.toInteger(region?._componentCount, -1);
            var componentCoverage = this.toNumeric(region?._componentCoverage, -1);
            var top = this.resolveRegionY(region);
            var left = this.resolveRegionX(region);
            var right = (left + width);
            var bottom = (top + height);
            var widthRatio = (width / Math.max(1, frameColumns));
            var heightRatio = (height / Math.max(1, frameRows));
            var isTopZoneCandidate = (top <= topZoneGlyphBoostLimit);
            var isBottomZoneCandidate = (bottom >= bottomZoneStart);
            var isLateralZoneCandidate = ((left <= leftZoneLimit) || (right >= rightZoneStart));
            var isInsideSmallGlyphCandidate = false;
            var isPeripheralZoneCandidate = (
                (top <= topZoneLimit)
                || (bottom >= bottomZoneStart)
                || (left <= leftZoneLimit)
                || (right >= rightZoneStart)
            );
            var isRightEdgePeripheralCandidate = (
                (isPeripheralZoneCandidate === true)
                && (right >= rightZoneStart)
            );
            var isCoreZoneCandidate = (isPeripheralZoneCandidate !== true);
            if ((kind == "ocr") && (imagingBounds != null)) {
                overlapArea = this.resolveOverlapArea(region, imagingBounds);
                overlapRatio = (overlapArea / Math.max(1, (width * height)));
                isBoundaryRingCandidate = this.isBoundaryRingCandidate(
                    region,
                    imagingBounds,
                    frameColumns,
                    frameRows,
                    ocrOptions
                );
                isInsideSmallGlyphCandidate = (
                    (insideSmallGlyphRelaxationEnabled === true)
                    && (isBoundaryRingCandidate !== true)
                    && (overlapRatio >= insideSmallGlyphMinOverlapRatio)
                    && (regionAreaRatio <= insideSmallGlyphMaxAreaRatio)
                    && (widthRatio <= insideSmallGlyphMaxWidthRatio)
                    && (heightRatio <= insideSmallGlyphMaxHeightRatio)
                );
                if (isInsideSmallGlyphCandidate === true) {
                    var regionGlyphScore = this.clamp(this.toNumeric(region?._glyphScore, 0), 0, 1);
                    var isCoreZoneCandidate = (isPeripheralZoneCandidate !== true);
                    if ((isCoreZoneCandidate === true)
                        && (regionGlyphScore < insideSmallGlyphMinGlyphScoreCore)) {
                        isInsideSmallGlyphCandidate = false;
                    }
                }
            }

            if ((kind == "ocr")
                && (imagingBounds != null)
                && (isBoundaryRingCandidate === true)
                && (overlapRatio < minInsideOverlapForGlyphGate)) {

                var boundaryMinComponentCount = minBoundaryRingComponentCount;
                var boundaryMinComponentCoverage = minInsideImagingComponentCoverageTopZone;
                var boundaryMinForegroundPixelCount = minForegroundPixelCountBoundaryRing;
                var boundaryMinDominantColorRatio = minDominantColorRatioBoundaryRing;
                var boundaryMinTopColorCoverage = minTopColorCoverageBoundaryRing;
                var boundaryMaxForegroundPaletteRatio = maxForegroundPaletteRatioBoundaryRing;
                if ((peripheralOutsideRelaxationEnabled === true)
                    && (isPeripheralZoneCandidate === true)) {
                    boundaryMinComponentCount = Math.min(boundaryMinComponentCount, peripheralOutsideMinComponentCount);
                    boundaryMinComponentCoverage = Math.min(boundaryMinComponentCoverage, peripheralOutsideMinComponentCoverage);
                    boundaryMinForegroundPixelCount = Math.min(boundaryMinForegroundPixelCount, peripheralMinForegroundPixelCountOutside);
                    boundaryMinDominantColorRatio = Math.min(boundaryMinDominantColorRatio, peripheralMinDominantColorRatioOutside);
                    boundaryMinTopColorCoverage = Math.min(boundaryMinTopColorCoverage, peripheralMinTopColorCoverageOutside);
                    boundaryMaxForegroundPaletteRatio = Math.max(boundaryMaxForegroundPaletteRatio, peripheralMaxForegroundPaletteRatioOutside);
                }

                if ((widthRatio > maxBoundaryRingRegionWidthRatio)
                    || (heightRatio > maxBoundaryRingRegionHeightRatio)) {
                    continue;
                }

                if ((componentCount >= 0)
                    && (componentCoverage >= 0)) {
                    if (componentCount < boundaryMinComponentCount)
                        continue;
                    if ((componentCoverage < boundaryMinComponentCoverage)
                        || (componentCoverage > maxInsideImagingComponentCoverage)) {
                        continue;
                    }
                }

                if (foregroundColorConsistencyGateEnabled === true) {
                    var boundaryForegroundProfile = this.resolveRegionForegroundColorProfile(
                        region,
                        rgba,
                        frameColumns,
                        frameRows,
                        ocrOptions
                    );

                    if (boundaryForegroundProfile != null) {
                        if (boundaryForegroundProfile.count < boundaryMinForegroundPixelCount)
                            continue;
                        if (boundaryForegroundProfile.lumaStdDev > maxForegroundLumaStdDevBoundaryRing)
                            continue;
                        if (boundaryForegroundProfile.count >= minColorDistributionSampleCount) {
                            if (boundaryForegroundProfile.dominantColorRatio < boundaryMinDominantColorRatio)
                                continue;
                            if (boundaryForegroundProfile.topColorCoverage < boundaryMinTopColorCoverage)
                                continue;
                            if (boundaryForegroundProfile.paletteRatio > boundaryMaxForegroundPaletteRatio)
                                continue;
                        }
                    }
                }

                if (glyphScoreGateEnabled === true) {
                    glyphScore = this.clamp(this.toNumeric(region?._glyphScore, 1), 0, 1);
                    var boundaryRingGlyphThreshold = minGlyphScoreBoundaryRing;
                    if ((peripheralOutsideRelaxationEnabled === true)
                        && (isPeripheralZoneCandidate === true)) {
                        boundaryRingGlyphThreshold = Math.min(boundaryRingGlyphThreshold, peripheralMinGlyphScoreOutside);
                    }
                    if (glyphScore < boundaryRingGlyphThreshold)
                        continue;
                }
            }

            if ((kind == "ocr")
                && (imagingBounds != null)
                && (overlapRatio >= minInsideOverlapForGlyphGate)) {

                if (isBoundaryRingCandidate === true) {
                    if ((widthRatio > maxBoundaryRingRegionWidthRatio)
                        || (heightRatio > maxBoundaryRingRegionHeightRatio)) {
                        continue;
                    }
                }
                else {
                    var insideWidthRatioLimit = (isTopZoneCandidate === true)
                        ? maxInsideTopZoneWidthRatio
                        : maxInsideRegionWidthRatio;
                    var insideHeightRatioLimit = (isTopZoneCandidate === true)
                        ? maxInsideTopZoneHeightRatio
                        : maxInsideRegionHeightRatio;
                    if ((widthRatio > insideWidthRatioLimit)
                        || (heightRatio > insideHeightRatioLimit)) {
                        continue;
                    }
                }

                var minComponentCoverageForRegion = (isTopZoneCandidate === true)
                    ? minInsideImagingComponentCoverageTopZone
                    : minInsideImagingComponentCoverage;
                var minComponentCountForRegion = (isTopZoneCandidate === true)
                    ? minInsideImagingComponentCountTopZone
                    : minInsideImagingComponentCount;
                if (isInsideSmallGlyphCandidate === true) {
                    minComponentCoverageForRegion = Math.min(minComponentCoverageForRegion, insideSmallGlyphMinComponentCoverage);
                    minComponentCountForRegion = Math.min(minComponentCountForRegion, insideSmallGlyphMinComponentCount);
                }

                if ((componentCount >= 0)
                    && (componentCoverage >= 0)) {

                    if ((componentCoverage < minComponentCoverageForRegion)
                        || (componentCoverage > maxInsideImagingComponentCoverage)) {
                        continue;
                    }

                    if (isBoundaryRingCandidate === true) {
                        if (componentCount < minBoundaryRingComponentCount)
                            continue;
                    }
                    else if (componentCount < minComponentCountForRegion) {
                        continue;
                    }
                }

                if (foregroundColorConsistencyGateEnabled === true) {
                    var foregroundProfile = this.resolveRegionForegroundColorProfile(
                        region,
                        rgba,
                        frameColumns,
                        frameRows,
                        ocrOptions
                    );

                    if (foregroundProfile != null) {
                        if (isBoundaryRingCandidate === true) {
                            if (foregroundProfile.count < minForegroundPixelCountBoundaryRing)
                                continue;
                            if (foregroundProfile.lumaStdDev > maxForegroundLumaStdDevBoundaryRing)
                                continue;
                            if (foregroundProfile.dominantColorRatio < minDominantColorRatioBoundaryRing)
                                continue;
                            if (foregroundProfile.topColorCoverage < minTopColorCoverageBoundaryRing)
                                continue;
                            if (foregroundProfile.paletteRatio > maxForegroundPaletteRatioBoundaryRing)
                                continue;
                        }
                        else {
                            var minDominantColorRatioForRegion = (isTopZoneCandidate === true)
                                ? minDominantColorRatioInsideImagingTopZone
                                : minDominantColorRatioInsideImaging;
                            var minTopColorCoverageForRegion = (isTopZoneCandidate === true)
                                ? minTopColorCoverageInsideImagingTopZone
                                : minTopColorCoverageInsideImaging;
                            var maxForegroundPaletteRatioForRegion = (isTopZoneCandidate === true)
                                ? maxForegroundPaletteRatioInsideImagingTopZone
                                : maxForegroundPaletteRatioInsideImaging;
                            var minForegroundPixelCountForRegion = minForegroundPixelCountInsideImaging;
                            var maxForegroundLumaStdDevForRegion = maxForegroundLumaStdDevInsideImaging;
                            if (isInsideSmallGlyphCandidate === true) {
                                minDominantColorRatioForRegion = Math.min(minDominantColorRatioForRegion, insideSmallGlyphMinDominantColorRatio);
                                minTopColorCoverageForRegion = Math.min(minTopColorCoverageForRegion, insideSmallGlyphMinTopColorCoverage);
                                maxForegroundPaletteRatioForRegion = Math.max(maxForegroundPaletteRatioForRegion, insideSmallGlyphMaxForegroundPaletteRatio);
                                minForegroundPixelCountForRegion = Math.min(minForegroundPixelCountForRegion, insideSmallGlyphMinForegroundPixelCount);
                                maxForegroundLumaStdDevForRegion = Math.max(maxForegroundLumaStdDevForRegion, insideSmallGlyphMaxForegroundLumaStdDev);
                            }

                            if (foregroundProfile.count < minForegroundPixelCountForRegion)
                                continue;
                            if (foregroundProfile.lumaStdDev > maxForegroundLumaStdDevForRegion)
                                continue;
                            if (foregroundProfile.count >= minColorDistributionSampleCount) {
                                if (foregroundProfile.dominantColorRatio < minDominantColorRatioForRegion)
                                    continue;
                                if (foregroundProfile.topColorCoverage < minTopColorCoverageForRegion)
                                    continue;
                                if (foregroundProfile.paletteRatio > maxForegroundPaletteRatioForRegion)
                                    continue;
                            }
                        }
                    }
                }

                if ((kind == "ocr")
                    && (glyphScoreGateEnabled == true)) {
                    glyphScore = this.clamp(this.toNumeric(region?._glyphScore, 1), 0, 1);
                    if (glyphScore < minGlyphScore)
                        continue;

                    if ((imagingBounds != null)
                        && (overlapRatio >= minInsideOverlapForGlyphGate)) {
                        if (isBoundaryRingCandidate === true) {
                            if (glyphScore < minGlyphScoreBoundaryRing)
                                continue;
                        }
                        else {
                            var insideGlyphThreshold = minGlyphScoreInsideImaging;
                            if ((topZoneGlyphBoostEnabled === true)
                                && (top <= topZoneGlyphBoostLimit)) {
                                insideGlyphThreshold = Math.min(insideGlyphThreshold, minGlyphScoreTopZone);
                            }
                            if (isInsideSmallGlyphCandidate === true) {
                                insideGlyphThreshold = Math.min(insideGlyphThreshold, insideSmallGlyphMinGlyphScore);
                            }
                            if (glyphScore < insideGlyphThreshold)
                                continue;
                        }
                    }
                }

                if ((kind == "ocr")
                    && (imagingBounds != null)
                    && (ocrOptions?.rejectOcrInsideImagingBounds === true)) {
                    var maxInsideOverlapRatio = this.clamp(this.toNumeric(ocrOptions?.maxOcrInsideImagingOverlapRatio, 0.65), 0, 1);
                    var maxInsideAreaRatio = this.clamp(this.toNumeric(ocrOptions?.maxOcrInsideImagingAreaRatio, 0.006), 0, 1);
                    var boundaryRingMaxRegionAreaRatio = this.clamp(this.toNumeric(ocrOptions?.boundaryRingMaxRegionAreaRatio, 0.02), 0, 1);

                    // Reject larger OCR candidates that are mostly inside imaging content bounds.
                    if (isBoundaryRingCandidate === true) {
                        if ((overlapRatio >= maxInsideOverlapRatio)
                            && (regionAreaRatio >= boundaryRingMaxRegionAreaRatio)) {
                            continue;
                        }
                    }
                    else if ((overlapRatio >= maxInsideOverlapRatio)
                        && (regionAreaRatio >= maxInsideAreaRatio)
                        && (isInsideSmallGlyphCandidate !== true)) {
                        continue;
                    }
                }

                filtered.push(region);
                continue;
            }

            if ((kind == "ocr")
                && (imagingBounds != null)
                && (isBoundaryRingCandidate !== true)
                && (isTinyFrame != true)) {

                var outsideWidthRatioLimit = maxOutsideRegionWidthRatio;
                var outsideHeightRatioLimit = maxOutsideRegionHeightRatio;
                var outsideMinComponentCountForRegion = minOutsideComponentCount;
                var outsideMinComponentCoverageForRegion = minOutsideComponentCoverage;
                var outsideMinDominantColorRatioForRegion = minDominantColorRatioOutside;
                var outsideMinTopColorCoverageForRegion = minTopColorCoverageOutside;
                var outsideMaxForegroundPaletteRatioForRegion = maxForegroundPaletteRatioOutside;
                var outsideMinForegroundPixelCountForRegion = minForegroundPixelCountBoundaryRing;
                var outsideMinGlyphScoreForRegion = minGlyphScoreOutside;
                var outsideMaxComponentCoverageForRegion = null;
                var outsideRightEdgeColorConsistencyBypassForRegion = false;

                if ((peripheralOutsideRelaxationEnabled === true)
                    && (isPeripheralZoneCandidate === true)) {
                    outsideWidthRatioLimit = peripheralMaxOutsideRegionWidthRatio;
                    outsideHeightRatioLimit = peripheralMaxOutsideRegionHeightRatio;
                    outsideMinComponentCountForRegion = peripheralOutsideMinComponentCount;
                    outsideMinComponentCoverageForRegion = peripheralOutsideMinComponentCoverage;
                    outsideMinDominantColorRatioForRegion = peripheralMinDominantColorRatioOutside;
                    outsideMinTopColorCoverageForRegion = peripheralMinTopColorCoverageOutside;
                    outsideMaxForegroundPaletteRatioForRegion = peripheralMaxForegroundPaletteRatioOutside;
                    outsideMinForegroundPixelCountForRegion = peripheralMinForegroundPixelCountOutside;
                    outsideMinGlyphScoreForRegion = peripheralMinGlyphScoreOutside;
                }

                if ((peripheralRightOutsideRelaxationEnabled === true)
                    && (isRightEdgePeripheralCandidate === true)) {
                    outsideHeightRatioLimit = Math.max(outsideHeightRatioLimit, peripheralRightMaxOutsideRegionHeightRatio);
                    outsideMinComponentCountForRegion = Math.max(outsideMinComponentCountForRegion, peripheralRightOutsideMinComponentCount);
                    outsideMaxComponentCoverageForRegion = peripheralRightOutsideMaxComponentCoverage;
                    outsideRightEdgeColorConsistencyBypassForRegion = (peripheralRightColorConsistencyBypassEnabled === true);
                }

                if ((widthRatio > outsideWidthRatioLimit)
                    || (heightRatio > outsideHeightRatioLimit)) {
                    continue;
                }

                if ((componentCount >= 0)
                    && (componentCoverage >= 0)) {
                    if (componentCount < outsideMinComponentCountForRegion)
                        continue;
                    if (componentCoverage < outsideMinComponentCoverageForRegion)
                        continue;
                    if ((outsideMaxComponentCoverageForRegion != null)
                        && (componentCoverage > outsideMaxComponentCoverageForRegion))
                        continue;
                }

                if (foregroundColorConsistencyGateEnabled === true) {
                    var outsideForegroundProfile = this.resolveRegionForegroundColorProfile(
                        region,
                        rgba,
                        frameColumns,
                        frameRows,
                        ocrOptions
                    );

                    if (outsideForegroundProfile != null) {
                        if (outsideForegroundProfile.count < outsideMinForegroundPixelCountForRegion)
                            continue;
                        if (outsideForegroundProfile.lumaStdDev > maxForegroundLumaStdDevBoundaryRing)
                            continue;
                        if (outsideForegroundProfile.count >= minColorDistributionSampleCount) {
                            var outsideFailedDominantColor = (outsideForegroundProfile.dominantColorRatio < outsideMinDominantColorRatioForRegion);
                            var outsideFailedTopCoverage = (outsideForegroundProfile.topColorCoverage < outsideMinTopColorCoverageForRegion);
                            var outsideFailedPalette = (outsideForegroundProfile.paletteRatio > outsideMaxForegroundPaletteRatioForRegion);
                            if ((outsideFailedDominantColor === true)
                                || (outsideFailedTopCoverage === true)
                                || (outsideFailedPalette === true)) {

                                var rightEdgeColorConsistencyBypassed = false;
                                if ((outsideRightEdgeColorConsistencyBypassForRegion === true)
                                    && ((rgba instanceof Uint8Array) === true)) {
                                    var outsideSurroundProfile = this.resolveRegionSurroundBackgroundProfile(
                                        region,
                                        rgba,
                                        frameColumns,
                                        frameRows,
                                        ocrOptions
                                    );
                                    if ((outsideSurroundProfile != null)
                                        && (outsideSurroundProfile.count >= peripheralRightMinSurroundSampleCountForColorBypass)) {
                                        var outsideGlyphScore = this.clamp(this.toNumeric(region?._glyphScore, 0), 0, 1);
                                        if ((outsideSurroundProfile.darkRatio >= peripheralRightMinSurroundDarkRatioForColorBypass)
                                            && (outsideGlyphScore >= peripheralRightMinGlyphScoreForColorBypass)) {
                                            rightEdgeColorConsistencyBypassed = true;
                                        }
                                    }
                                }

                                if (rightEdgeColorConsistencyBypassed !== true)
                                    continue;
                            }
                        }
                    }
                }

                region._outsideMinGlyphScore = outsideMinGlyphScoreForRegion;
            }

            if ((kind == "ocr")
                && (surroundBackgroundGateEnabled === true)
                && ((rgba instanceof Uint8Array) === true)
                && ((surroundBackgroundCoreOnly !== true) || (isCoreZoneCandidate === true))
                && (isBoundaryRingCandidate !== true)) {

                var surroundProfile = this.resolveRegionSurroundBackgroundProfile(
                    region,
                    rgba,
                    frameColumns,
                    frameRows,
                    ocrOptions
                );

                if ((surroundProfile != null)
                    && (surroundProfile.count >= surroundBackgroundMinSampleCount)) {
                    var surroundGlyphScore = this.clamp(this.toNumeric(region?._glyphScore, 1), 0, 1);
                    if ((surroundProfile.darkRatio < surroundBackgroundMinDarkRatio)
                        && (surroundGlyphScore < surroundBackgroundBypassGlyphScore)) {
                        continue;
                    }
                }
            }

            if ((kind == "ocr")
                && (imagingBounds == null)
                && (noBoundsBottomOnlyGuardEnabled === true)
                && (isBottomZoneCandidate === true)
                && (isTopZoneCandidate !== true)
                && (isLateralZoneCandidate !== true)) {

                if (heightRatio > noBoundsBottomOnlyMaxHeightRatio)
                    continue;

                if ((componentCount >= 0)
                    && (componentCount < noBoundsBottomOnlyMinComponentCount)) {
                    continue;
                }

                if ((componentCoverage >= 0)
                    && (componentCoverage > noBoundsBottomOnlyMaxComponentCoverage)) {
                    continue;
                }

                if (glyphScoreGateEnabled === true) {
                    glyphScore = this.clamp(this.toNumeric(region?._glyphScore, 1), 0, 1);
                    if (glyphScore < noBoundsBottomOnlyMinGlyphScore)
                        continue;
                }
            }

            if ((kind == "ocr")
                && (glyphScoreGateEnabled == true)) {
                glyphScore = this.clamp(this.toNumeric(region?._glyphScore, 1), 0, 1);
                if (glyphScore < minGlyphScore)
                    continue;

                if ((kind == "ocr")
                    && (imagingBounds != null)
                    && (overlapRatio < minInsideOverlapForGlyphGate)
                    && (isBoundaryRingCandidate !== true)) {
                    var outsideGlyphThreshold = this.clamp(this.toNumeric(region?._outsideMinGlyphScore, minGlyphScoreOutside), 0, 1);
                    if (glyphScore < outsideGlyphThreshold)
                        continue;
                }
                if ((kind == "ocr")
                    && (imagingBounds != null)
                    && (overlapRatio < minInsideOverlapForGlyphGate)
                    && (isBoundaryRingCandidate === true)) {
                    var outsideBoundaryGlyphThreshold = minGlyphScoreBoundaryRing;
                    if ((peripheralOutsideRelaxationEnabled === true)
                        && (isPeripheralZoneCandidate === true)) {
                        outsideBoundaryGlyphThreshold = Math.min(outsideBoundaryGlyphThreshold, peripheralMinGlyphScoreOutside);
                    }
                    if (glyphScore < outsideBoundaryGlyphThreshold)
                        continue;
                }
            }
            filtered.push(region);
        }

        if (filtered.length == 0)
            return [];

        var computeCombinedAreaRatio = (candidateRegions) => {
            var combinedArea = 0;
            for (var candidateIndex = 0; candidateIndex < candidateRegions.length; candidateIndex++) {
                var candidateRegion = candidateRegions[candidateIndex];
                combinedArea += Math.max(0, (this.resolveRegionWidth(candidateRegion) * this.resolveRegionHeight(candidateRegion)));
            }
            return (combinedArea / frameArea);
        };

        var combinedAreaRatio = computeCombinedAreaRatio(filtered);
        if ((isTinyFrame == true)
            || (combinedAreaRatio <= maxCombinedRegionAreaRatio))
            return filtered;

        // Safety fallback strategy:
        // 1) remove outside-bounds regions first (most likely to dominate area),
        // 2) remove top-band regions if still over limit,
        // 3) trim largest OCR regions until within budget.
        var working = filtered.slice(0);

        var trimKindLargestFirst = (kindName) => {
            while (working.length > 0) {
                var currentRatio = computeCombinedAreaRatio(working);
                if (currentRatio <= maxCombinedRegionAreaRatio)
                    return true;

                var matchIndices = [];
                for (var index = 0; index < working.length; index++) {
                    if (String(working[index]?._kind ?? "ocr") == kindName)
                        matchIndices.push(index);
                }

                if (matchIndices.length == 0)
                    return false;

                var largestIndex = matchIndices[0];
                var largestArea = Math.max(0, (this.resolveRegionWidth(working[largestIndex]) * this.resolveRegionHeight(working[largestIndex])));

                for (var matchIndex = 1; matchIndex < matchIndices.length; matchIndex++) {
                    var candidateIndex = matchIndices[matchIndex];
                    var candidateArea = Math.max(0, (this.resolveRegionWidth(working[candidateIndex]) * this.resolveRegionHeight(working[candidateIndex])));
                    if (candidateArea > largestArea) {
                        largestArea = candidateArea;
                        largestIndex = candidateIndex;
                    }
                }

                working.splice(largestIndex, 1);
            }

            return false;
        };

        trimKindLargestFirst("outside-bounds");
        if (working.length == 0)
            return [];

        combinedAreaRatio = computeCombinedAreaRatio(working);
        if (combinedAreaRatio <= maxCombinedRegionAreaRatio)
            return working;

        trimKindLargestFirst("top-band");
        if (working.length == 0)
            return [];

        combinedAreaRatio = computeCombinedAreaRatio(working);
        if (combinedAreaRatio <= maxCombinedRegionAreaRatio)
            return working;

        trimKindLargestFirst("ocr");
        if (working.length == 0)
            return [];

        combinedAreaRatio = computeCombinedAreaRatio(working);
        if (combinedAreaRatio <= maxCombinedRegionAreaRatio)
            return working;

        return [];

    }

    /**
     * Apply one solid fill to one region in RGBA.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} columns Frame width.
     * @param {number} rows Frame height.
     * @param {object} region Region descriptor.
     * @param {number[]} fillRGBA Fill RGBA.
     */
    applyRegionFill(rgba, columns, rows, region, fillRGBA) {

        if ((rgba instanceof Uint8Array) == false)
            return;

        var startX = Math.floor(this.resolveRegionX(region));
        var startY = Math.floor(this.resolveRegionY(region));
        var width = Math.ceil(this.resolveRegionWidth(region));
        var height = Math.ceil(this.resolveRegionHeight(region));

        if ((width <= 0) || (height <= 0))
            return;

        var endX = (startX + width);
        var endY = (startY + height);

        var left = this.clamp(startX, 0, columns);
        var right = this.clamp(endX, 0, columns);
        var top = this.clamp(startY, 0, rows);
        var bottom = this.clamp(endY, 0, rows);

        if ((right <= left) || (bottom <= top))
            return;

        for (var row = top; row < bottom; row++) {
            var pixelOffset = ((row * columns) + left);
            for (var column = left; column < right; column++) {
                var rgbaOffset = (pixelOffset * 4);
                rgba[rgbaOffset + 0] = fillRGBA[0];
                rgba[rgbaOffset + 1] = fillRGBA[1];
                rgba[rgbaOffset + 2] = fillRGBA[2];
                rgba[rgbaOffset + 3] = fillRGBA[3];
                pixelOffset += 1;
            }
        }

    }

    /**
     * Redact decoded RGBA bytes before encode.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} frameIndex Frame index.
     * @param {number | null} frameCount Frame count.
     * @returns {Promise<Uint8Array>} Redacted RGBA bytes.
     */
    async transformFrameRGBA(context, state, rgba, frameIndex = 0, frameCount = null) {

        var mode = this.redaction?.mode ?? BurnedInRedactionModes.REGIONS;
        if ((mode != BurnedInRedactionModes.REGIONS)
            && (mode != BurnedInRedactionModes.OCR_REGIONS)) {
            return rgba;
        }

        var columns = Math.max(1, this.toInteger(state?.columns, 1));
        var rows = Math.max(1, this.toInteger(state?.rows, 1));
        var frameRegions = [];

        if (mode == BurnedInRedactionModes.REGIONS) {
            frameRegions = await this.resolveFrameRegions(state, frameIndex, frameCount);
        }
        else {
            frameRegions = this.resolveOcrFrameRegions(state, rgba);

            var configuredRegions = await this.resolveFrameRegions(state, frameIndex, frameCount);
            if (configuredRegions.length > 0) {
                frameRegions = frameRegions.concat(configuredRegions);
            }
        }

        if (frameRegions.length == 0)
            return rgba;

        for (var regionIndex = 0; regionIndex < frameRegions.length; regionIndex++) {
            this.applyRegionFill(rgba, columns, rows, frameRegions[regionIndex], this.redactionFillRGBA);
        }

        return rgba;

    }

    /**
     * Preserve transfer syntax by default and force PixelData transform in redaction mode.
     * @param {object} context Parse context.
     * @param {object} state Runtime state.
     * @returns {*} Status.
     */
    async evaluateMode(context, state) {

        if (this.preserveTransferSyntax === true) {
            var sourceTransferSyntax = this.resolveTransferSyntax(state?.sourceTransferSyntax) ?? TransferSyntax.NONE;
            if (sourceTransferSyntax.ID != TransferSyntax.NONE.ID) {
                this.targetTransferSyntax = sourceTransferSyntax;

                // Some compressed syntaxes cannot currently be re-encoded while preserving syntax.
                // In that case, fall back to explicit-vr-little-endian to guarantee valid output.
                if (this.isSupportedSyntaxPair(sourceTransferSyntax, this.targetTransferSyntax) != true) {
                    this.targetTransferSyntax = TransferSyntax.ExplicitVRLittleEndian;

                    if (state?.hasReportedPreserveTransferSyntaxFallback != true) {
                        state.hasReportedPreserveTransferSyntaxFallback = true;

                        var concernStatus = await this.reportConcern(context, state, {
                            severity: "warning",
                            category: "Compatibility",
                            code: "PreserveTransferSyntaxUnavailable",
                            message: `Burned-in redaction cannot preserve source transfer syntax '${sourceTransferSyntax.ID}' with current codec support. Falling back to '${this.targetTransferSyntax.ID}'.`,
                            scope: "Instance",
                            sourceTransferSyntax: sourceTransferSyntax.ID,
                            targetTransferSyntax: this.targetTransferSyntax.ID
                        });

                        if (this.isTerminalStatus(concernStatus) == true)
                            return concernStatus;
                    }
                }
            }
        }

        return await super.evaluateMode(context, state);

    }

    /**
     * Redaction always requires pixel transform, even when transfer syntax IDs match.
     * @param {object | null} sourceTransferSyntax Source transfer syntax.
     * @param {object | null} targetTransferSyntax Target transfer syntax.
     * @returns {boolean} TRUE when payload transform is required.
     */
    requiresPixelPayloadTranscode(sourceTransferSyntax, targetTransferSyntax) {
        return true;
    }

    /**
     * Disable native monochrome fast-path for redaction because redaction operates in RGBA.
     * @param {object} state Runtime state.
     * @returns {boolean} FALSE always.
     */
    canUseNativeMonochromePath(state) {
        return false;
    }

    /**
     * Redaction always operates in RGBA frame space, regardless of syntax pair.
     * @returns {"rgba"} RGBA transform strategy.
     */
    resolvePixelTransformStrategy(sourceTransferSyntax, targetTransferSyntax) {
        return "rgba";
    }

    /**
     * Normalize redaction options into a transcoding-compatible options payload.
     * @param {boolean | object | Function | Array<object>} options Raw options.
     * @returns {object} Normalized options.
     */
    normalizeOptions(options) {

        var normalizedOptions = null;

        if ((options == null) || (options === true)) {
            normalizedOptions = {};
        }
        else if ((typeof options == "function") || (Array.isArray(options) == true)) {
            normalizedOptions = {
                regions: options
            };
        }
        else if (typeof options == "object") {
            normalizedOptions = Object.assign({}, options);
        }
        else {
            throw new Exception(
                "Invalid burned-in redaction options. Expected function, array, object, true, or null.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var mode = String(normalizedOptions.mode ?? BurnedInRedactionModes.REGIONS).trim().toLowerCase();
        if ((mode != BurnedInRedactionModes.REGIONS)
            && (mode != BurnedInRedactionModes.OCR_REGIONS)) {
            throw new Exception(
                `Invalid burned-in redaction mode '${mode}'. Supported modes: regions, ocr-regions.`,
                GeneralErrorCodes.InvalidParameter
            );
        }

        var action = String(normalizedOptions.action ?? BurnedInRedactionActions.BLACK).trim().toLowerCase();
        if ((action != BurnedInRedactionActions.BLACK)
            && (action != BurnedInRedactionActions.WHITE)
            && (action != BurnedInRedactionActions.CONSTANT)) {
            throw new Exception(
                `Invalid burned-in redaction action '${action}'. Supported actions: black, white, constant.`,
                GeneralErrorCodes.InvalidParameter
            );
        }

        var regions = normalizedOptions.regions ?? [];
        if ((typeof regions != "function") && (Array.isArray(regions) == false)) {
            throw new Exception(
                'Invalid burned-in redaction "regions". Expected function or array.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        var ocrRegions = normalizedOptions.ocrRegions ?? null;
        if ((ocrRegions != null) && (typeof ocrRegions != "object")) {
            throw new Exception(
                'Invalid burned-in redaction "ocrRegions". Expected object or null.',
                GeneralErrorCodes.InvalidParameter
            );
        }

        var ocrRegionDetector = normalizedOptions.ocrRegionDetector ?? null;
        if ((ocrRegionDetector != null)
            && (typeof ocrRegionDetector.detectRegions != "function")) {
            throw new Exception(
                'Invalid burned-in redaction "ocrRegionDetector". Expected detector with detectRegions(...).',
                GeneralErrorCodes.InvalidParameter
            );
        }

        var coordinateMode = String(
            normalizedOptions.coordinateMode
            ?? normalizedOptions.coordinates
            ?? BurnedInRedactionCoordinateModes.PIXEL
        ).trim().toLowerCase();
        if ((coordinateMode != BurnedInRedactionCoordinateModes.PIXEL)
            && (coordinateMode != BurnedInRedactionCoordinateModes.NORMALIZED)
            && (coordinateMode != BurnedInRedactionCoordinateModes.AUTO_FIT)) {
            throw new Exception(
                `Invalid burned-in redaction coordinateMode '${coordinateMode}'. Supported values: pixel, normalized, auto-fit.`,
                GeneralErrorCodes.InvalidParameter
            );
        }

        var preserveTransferSyntax = (normalizedOptions.preserveTransferSyntax === true);
        if ((normalizedOptions.targetTransferSyntax == null) && (normalizedOptions.preserveTransferSyntax !== false)) {
            preserveTransferSyntax = true;
        }

        var transcodingOptions = {
            targetTransferSyntax: normalizedOptions.targetTransferSyntax ?? TransferSyntax.ImplicitVRLittleEndian.ID,
            sourceTransferSyntax: normalizedOptions.sourceTransferSyntax ?? null,
            goal: normalizedOptions.goal ?? null,
            streaming: normalizedOptions.streaming ?? null,
            fallback: normalizedOptions.fallback ?? null,
            frames: normalizedOptions.frames ?? null,
            codec: normalizedOptions.codec ?? null,
            metadata: normalizedOptions.metadata ?? null,
            codecRegistry: normalizedOptions.codecRegistry ?? null,
            onFrame: normalizedOptions.onFrame ?? null,
            onConcern: normalizedOptions.onConcern ?? null
        };

        var normalizedTranscodingOptions = super.normalizeOptions(transcodingOptions);
        normalizedTranscodingOptions.preserveTransferSyntax = preserveTransferSyntax;
        normalizedTranscodingOptions.ocrRegionDetector = ocrRegionDetector;
        normalizedTranscodingOptions.redaction = {
            mode: mode,
            action: action,
            regions: regions,
            ocrRegions: ocrRegions,
            fill: normalizedOptions.fill ?? null,
            coordinateMode: coordinateMode,
            coordinateScaleX: normalizedOptions.coordinateScaleX ?? normalizedOptions.scaleX ?? 1,
            coordinateScaleY: normalizedOptions.coordinateScaleY ?? normalizedOptions.scaleY ?? 1
        };

        return normalizedTranscodingOptions;

    }

    /**
     * Construct one burned-in redaction filter.
     * @param {object | null} nextHandler Next handler in the chain.
     * @param {boolean | object | Function | Array<object>} options Redaction options.
     */
    constructor(nextHandler = null, options = null) {
        super(nextHandler, options);

        this.redaction = this._options.redaction ?? {
            mode: BurnedInRedactionModes.REGIONS,
            action: BurnedInRedactionActions.BLACK,
            regions: [],
            ocrRegions: null,
            coordinateMode: BurnedInRedactionCoordinateModes.PIXEL,
            coordinateScaleX: 1,
            coordinateScaleY: 1
        };
        this.preserveTransferSyntax = (this._options.preserveTransferSyntax === true);
        this.redactionFillRGBA = this.resolveFillRGBA(this.redaction.action, this.redaction.fill ?? null);
        this.ocrRegionDetector = this._options.ocrRegionDetector ?? new OcrRegionDetector();
    }

};
