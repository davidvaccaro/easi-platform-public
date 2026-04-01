//
// OcrRegionDetector.js
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

import Binarize from "./Binarize.js";
import ConnectedComponents from "./ConnectedComponents.js";
import TextRegionGrouper from "./TextRegionGrouper.js";

export const DefaultOcrRegionOptions = Object.freeze({
    enabled: true,
    detectBrightText: true,
    detectDarkText: false,
    highQuantile: 0.975,
    lowQuantile: 0.1,
    highThreshold: null,
    lowThreshold: null,
    minHighThreshold: 148,
    maxLowThreshold: 80,
    minAlpha: 8,
    maxBrightChannelDelta: 255,
    autoBrightChannelDeltaEnabled: true,
    autoBrightChannelDeltaPeripheralOnly: true,
    autoBrightChannelDeltaQuantile: 0.35,
    autoBrightChannelDeltaPadding: 8,
    autoBrightChannelDeltaMin: 12,
    autoBrightChannelDeltaMax: 96,
    autoBrightChannelDeltaMinSamples: 32,
    connectivity: 8,
    maxComponents: 32768,
    usePeripheralZones: true,
    topZoneRatio: 0.24,
    bottomZoneRatio: 0.24,
    leftZoneRatio: 0.24,
    rightZoneRatio: 0.28,
    minComponentArea: 4,
    minComponentWidth: 1,
    minComponentHeight: 1,
    maxComponentAreaRatio: 0.02,
    maxComponentWidthRatio: 0.35,
    maxComponentHeightRatio: 0.2,
    maxComponentAspectRatio: 20,
    mergeGapX: 10,
    mergeGapY: 4,
    paddingX: 3,
    paddingY: 2,
    preferSmallRegions: true,
    smallRegionCoverageThreshold: 0.24,
    smallRegionMinComponentCount: 2,
    smallRegionPaddingX: 2,
    smallRegionPaddingY: 2,
    minRegionArea: 8,
    maxRegions: 128,
    glyphScoreGateEnabled: true,
    minGlyphScore: 0.2,
    minGlyphScoreInsideImaging: 0.58,
    minInsideOverlapForGlyphGate: 0.3,
    boundaryRingEnabled: true,
    boundaryRingWidth: 12,
    boundaryRingWidthRatio: 0.025,
    minGlyphScoreBoundaryRing: 0.28,
    boundaryRingMaxRegionAreaRatio: 0.02,
    minBoundaryRingComponentCount: 2,
    minInsideImagingComponentCount: 4,
    minInsideImagingComponentCountTopZone: 2,
    minInsideImagingComponentCoverage: 0.02,
    minInsideImagingComponentCoverageTopZone: 0.008,
    maxInsideImagingComponentCoverage: 0.8,
    insideSmallGlyphRelaxationEnabled: true,
    insideSmallGlyphMinOverlapRatio: 0.2,
    insideSmallGlyphMaxAreaRatio: 0.008,
    insideSmallGlyphMaxWidthRatio: 0.18,
    insideSmallGlyphMaxHeightRatio: 0.12,
    insideSmallGlyphMinComponentCount: 1,
    insideSmallGlyphMinComponentCoverage: 0.003,
    insideSmallGlyphMinForegroundPixelCount: 1,
    insideSmallGlyphMaxForegroundLumaStdDev: 64,
    insideSmallGlyphMinDominantColorRatio: 0.04,
    insideSmallGlyphMinTopColorCoverage: 0.08,
    insideSmallGlyphMaxForegroundPaletteRatio: 1,
    insideSmallGlyphMinGlyphScore: 0.18,
    insideSmallGlyphMinGlyphScoreCore: 0.48,
    foregroundColorConsistencyGateEnabled: true,
    foregroundLumaWindow: 40,
    minForegroundLuma: 96,
    foregroundColorQuantizationStep: 16,
    minColorDistributionSampleCount: 6,
    minForegroundPixelCountInsideImaging: 10,
    minForegroundPixelCountBoundaryRing: 6,
    maxForegroundLumaStdDevInsideImaging: 28,
    maxForegroundLumaStdDevBoundaryRing: 38,
    minDominantColorRatioInsideImaging: 0.3,
    minDominantColorRatioInsideImagingTopZone: 0.2,
    minDominantColorRatioBoundaryRing: 0.2,
    minTopColorCoverageInsideImaging: 0.5,
    minTopColorCoverageInsideImagingTopZone: 0.36,
    minTopColorCoverageBoundaryRing: 0.34,
    maxForegroundPaletteRatioInsideImaging: 0.5,
    maxForegroundPaletteRatioInsideImagingTopZone: 0.72,
    maxForegroundPaletteRatioBoundaryRing: 0.7,
    maxInsideRegionWidthRatio: 0.2,
    maxInsideRegionHeightRatio: 0.15,
    maxInsideTopZoneWidthRatio: 0.36,
    maxInsideTopZoneHeightRatio: 0.24,
    maxBoundaryRingRegionWidthRatio: 0.2,
    maxBoundaryRingRegionHeightRatio: 0.2,
    maxOutsideRegionWidthRatio: 0.24,
    maxOutsideRegionHeightRatio: 0.14,
    minOutsideComponentCount: 2,
    minOutsideComponentCoverage: 0.02,
    minGlyphScoreOutside: 0.3,
    minDominantColorRatioOutside: 0.2,
    minTopColorCoverageOutside: 0.34,
    maxForegroundPaletteRatioOutside: 0.7,
    peripheralOutsideRelaxationEnabled: true,
    peripheralOutsideMinComponentCount: 1,
    peripheralOutsideMinComponentCoverage: 0.005,
    peripheralMinGlyphScoreOutside: 0.14,
    peripheralMinDominantColorRatioOutside: 0.12,
    peripheralMinTopColorCoverageOutside: 0.2,
    peripheralMaxForegroundPaletteRatioOutside: 1,
    peripheralMinForegroundPixelCountOutside: 1,
    peripheralMaxOutsideRegionWidthRatio: 0.42,
    peripheralMaxOutsideRegionHeightRatio: 0.22,
    peripheralRightOutsideRelaxationEnabled: true,
    peripheralRightOutsideMinComponentCount: 2,
    peripheralRightOutsideMaxComponentCoverage: 0.45,
    peripheralRightMaxOutsideRegionHeightRatio: 0.4,
    peripheralRightColorConsistencyBypassEnabled: true,
    peripheralRightMinSurroundDarkRatioForColorBypass: 0.6,
    peripheralRightMinSurroundSampleCountForColorBypass: 24,
    peripheralRightMinGlyphScoreForColorBypass: 0.16,
    topZoneGlyphBoostEnabled: true,
    minGlyphScoreTopZone: 0.18,
    topZoneGlyphBoostRatio: 0.24,
    noBoundsBottomOnlyGuardEnabled: true,
    noBoundsBottomOnlyMinGlyphScore: 0.45,
    noBoundsBottomOnlyMinComponentCount: 2,
    noBoundsBottomOnlyMaxComponentCoverage: 0.45,
    noBoundsBottomOnlyMaxHeightRatio: 0.035,
    surroundBackgroundGateEnabled: true,
    surroundBackgroundCoreOnly: true,
    surroundBackgroundRingPadding: 3,
    surroundBackgroundDarkLumaMax: 72,
    surroundBackgroundMinDarkRatio: 0.55,
    surroundBackgroundMinSampleCount: 32,
    surroundBackgroundBypassGlyphScore: 0.8,
    glyphCoverageTarget: 0.25,
    glyphCoverageTolerance: 0.6,
    glyphComponentCountTarget: 3,
    glyphMaxMeanComponentCoverage: 0.9,
    glyphLargeRegionAreaRatio: 0.01,
    glyphLargeRegionMinComponents: 3,
    promoteTopBandFromDetections: false,
    topBandPaddingY: 8,
    topBandPaddingX: 8,
    topBandMaxRatio: 0.12,
    topBandAnchorRatio: 0.12,
    topBandMinRegionCount: 2,
    topBandMinRegionCountPerCluster: 1,
    topBandClusterGapX: 24,
    topBandClusterGapRatio: 0.05,
    topBandMinCoverageRatio: 0.03,
    topBandMinSpanOccupancyRatio: 0.3,
    topBandExpandToFullWidth: false,
    topBandRespectImagingBounds: true,
    topBandMaxImagingOverlapRatio: 0.05,
    maxOcrRegionAreaRatio: 0.15,
    maxCombinedRegionAreaRatio: 0.6,
    rejectOcrInsideImagingBounds: true,
    maxOcrInsideImagingOverlapRatio: 0.65,
    maxOcrInsideImagingAreaRatio: 0.006,
    redactOutsideImagingBounds: false,
    minImagingBoundsAreaRatioForOutsideRedaction: 0.16,
    maxOutsideRedactionRatio: 0.55,
    imagingMinLumaDelta: 18,
    imagingMinSaturationDelta: 16,
    imagingMinAreaRatio: 0.01,
    imagingCenterZoneRatioX: 0.45,
    imagingCenterZoneRatioY: 0.45,
    imagingUnionComponents: true,
    imagingUnionMaxComponents: 8,
    imagingUnionMinAreaRatio: 0.003,
    imagingUnionCenterZoneRatioX: 0.85,
    imagingUnionCenterZoneRatioY: 0.85,
    imagingPaddingX: 8,
    imagingPaddingY: 8
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
     * Determine whether two axis-aligned regions intersect.
     * @param {object | null} first First region.
     * @param {object | null} second Second region.
     * @returns {boolean} TRUE when regions intersect.
     */
    intersects(first, second) {

        if ((first == null) || (second == null))
            return false;

        var firstRight = (first.x + first.width);
        var firstBottom = (first.y + first.height);
        var secondRight = (second.x + second.width);
        var secondBottom = (second.y + second.height);

        if (firstRight <= second.x)
            return false;
        if (secondRight <= first.x)
            return false;
        if (firstBottom <= second.y)
            return false;
        if (secondBottom <= first.y)
            return false;

        return true;

    }

    /**
     * Estimate one background luminance from border samples.
     * @param {Uint8Array} luma Luminance bytes.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @returns {number} Estimated background luminance [0,255].
     */
    estimateBackgroundLuma(luma, columns, rows) {

        if ((luma instanceof Uint8Array) != true)
            return 0;

        var normalizedColumns = Math.max(1, this.toInteger(columns, 1));
        var normalizedRows = Math.max(1, this.toInteger(rows, 1));
        var stride = Math.max(1, this.toInteger(Math.min(normalizedColumns, normalizedRows) / 64, 1));

        var sum = 0;
        var count = 0;

        for (var x = 0; x < normalizedColumns; x += stride) {
            var topIndex = x;
            var bottomIndex = (((normalizedRows - 1) * normalizedColumns) + x);
            sum += luma[topIndex];
            sum += luma[bottomIndex];
            count += 2;
        }

        for (var y = 1; y < (normalizedRows - 1); y += stride) {
            var leftIndex = (y * normalizedColumns);
            var rightIndex = (leftIndex + (normalizedColumns - 1));
            sum += luma[leftIndex];
            sum += luma[rightIndex];
            count += 2;
        }

        if (count <= 0)
            return 0;

        return Math.round(sum / count);

    }

    /**
     * Detect one coarse imaging-content bounding region.
     * @param {Uint8Array} rgba RGBA frame bytes.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {object | null} options OCR options.
     * @returns {object | null} Bounding region or null when unresolved.
     */
    detectImagingBounds(rgba, columns, rows, options = null) {

        if ((rgba instanceof Uint8Array) != true)
            return null;

        var normalizedColumns = Math.max(1, this.toInteger(columns, 1));
        var normalizedRows = Math.max(1, this.toInteger(rows, 1));
        var normalizedOptions = this.normalizeOptions(options);

        var pixelCount = (normalizedColumns * normalizedRows);
        if (rgba.length < (pixelCount * 4))
            return null;

        var luma = this.binarize.buildLuma(rgba);
        var backgroundLuma = this.estimateBackgroundLuma(luma, normalizedColumns, normalizedRows);
        var minLumaDelta = Math.max(1, this.toInteger(normalizedOptions.imagingMinLumaDelta, 18));
        var minSaturationDelta = Math.max(0, this.toInteger(normalizedOptions.imagingMinSaturationDelta, 16));
        var minAlpha = Math.max(0, this.toInteger(normalizedOptions.minAlpha, 8));

        var contentMask = new Uint8Array(pixelCount);
        for (var index = 0; index < pixelCount; index++) {
            var rgbaOffset = (index * 4);
            var alpha = rgba[rgbaOffset + 3] ?? 255;
            if (alpha < minAlpha)
                continue;

            var red = rgba[rgbaOffset + 0] ?? 0;
            var green = rgba[rgbaOffset + 1] ?? 0;
            var blue = rgba[rgbaOffset + 2] ?? 0;
            var luminanceDelta = Math.abs((luma[index] ?? 0) - backgroundLuma);
            var saturationDelta = (Math.max(red, green, blue) - Math.min(red, green, blue));

            if ((luminanceDelta >= minLumaDelta) || (saturationDelta >= minSaturationDelta)) {
                contentMask[index] = 1;
            }
        }

        var components = this.connectedComponents.find(
            contentMask,
            normalizedColumns,
            normalizedRows,
            {
                connectivity: normalizedOptions.connectivity,
                maxComponents: normalizedOptions.maxComponents
            }
        );

        if (components.length == 0)
            return null;

        var minArea = Math.max(1, Math.floor(pixelCount * this.toNumeric(normalizedOptions.imagingMinAreaRatio, 0.01)));
        var centerWidth = Math.max(1, Math.floor(normalizedColumns * this.toNumeric(normalizedOptions.imagingCenterZoneRatioX, 0.45)));
        var centerHeight = Math.max(1, Math.floor(normalizedRows * this.toNumeric(normalizedOptions.imagingCenterZoneRatioY, 0.45)));
        var centerRegion = {
            x: Math.floor((normalizedColumns - centerWidth) / 2),
            y: Math.floor((normalizedRows - centerHeight) / 2),
            width: centerWidth,
            height: centerHeight
        };

        var candidates = [];
        for (var componentIndex = 0; componentIndex < components.length; componentIndex++) {
            var component = components[componentIndex];
            var area = Math.max(0, this.toInteger(component?.area, 0));
            if (area < minArea)
                continue;

            candidates.push({
                x: this.toInteger(component?.x, 0),
                y: this.toInteger(component?.y, 0),
                width: Math.max(0, this.toInteger(component?.width, 0)),
                height: Math.max(0, this.toInteger(component?.height, 0)),
                area: area
            });
        }

        if (candidates.length == 0)
            return null;

        candidates.sort((first, second) => (second.area - first.area));

        var selected = null;
        for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
            var candidate = candidates[candidateIndex];
            if (this.intersects(candidate, centerRegion) == true) {
                selected = candidate;
                break;
            }
        }

        if (selected == null)
            selected = candidates[0];

        var selectedRegions = [selected];
        if (normalizedOptions.imagingUnionComponents === true) {
            var unionCenterWidth = Math.max(1, Math.floor(normalizedColumns * this.toNumeric(normalizedOptions.imagingUnionCenterZoneRatioX, 0.85)));
            var unionCenterHeight = Math.max(1, Math.floor(normalizedRows * this.toNumeric(normalizedOptions.imagingUnionCenterZoneRatioY, 0.85)));
            var unionCenterRegion = {
                x: Math.floor((normalizedColumns - unionCenterWidth) / 2),
                y: Math.floor((normalizedRows - unionCenterHeight) / 2),
                width: unionCenterWidth,
                height: unionCenterHeight
            };
            var unionMinArea = Math.max(
                minArea,
                Math.floor(pixelCount * this.toNumeric(normalizedOptions.imagingUnionMinAreaRatio, 0.003))
            );
            var unionMaxComponents = Math.max(1, this.toInteger(normalizedOptions.imagingUnionMaxComponents, 8));

            for (var extraCandidateIndex = 0; extraCandidateIndex < candidates.length; extraCandidateIndex++) {
                if (selectedRegions.length >= unionMaxComponents)
                    break;

                var extraCandidate = candidates[extraCandidateIndex];
                if (extraCandidate == selected)
                    continue;
                if (extraCandidate.area < unionMinArea)
                    continue;
                if (this.intersects(extraCandidate, unionCenterRegion) != true)
                    continue;

                selectedRegions.push(extraCandidate);
            }
        }

        var unionLeft = selectedRegions[0].x;
        var unionTop = selectedRegions[0].y;
        var unionRight = (selectedRegions[0].x + selectedRegions[0].width);
        var unionBottom = (selectedRegions[0].y + selectedRegions[0].height);

        for (var selectedRegionIndex = 1; selectedRegionIndex < selectedRegions.length; selectedRegionIndex++) {
            var selectedRegion = selectedRegions[selectedRegionIndex];
            unionLeft = Math.min(unionLeft, selectedRegion.x);
            unionTop = Math.min(unionTop, selectedRegion.y);
            unionRight = Math.max(unionRight, selectedRegion.x + selectedRegion.width);
            unionBottom = Math.max(unionBottom, selectedRegion.y + selectedRegion.height);
        }

        var paddingX = Math.max(0, this.toInteger(normalizedOptions.imagingPaddingX, 8));
        var paddingY = Math.max(0, this.toInteger(normalizedOptions.imagingPaddingY, 8));
        var left = Math.max(0, unionLeft - paddingX);
        var top = Math.max(0, unionTop - paddingY);
        var right = Math.min(normalizedColumns, unionRight + paddingX);
        var bottom = Math.min(normalizedRows, unionBottom + paddingY);

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

        var grouped = this.textRegionGrouper.group(components, normalizedColumns, normalizedRows, normalizedOptions);
        if (grouped.length == 0)
            return [];

        if (normalizedOptions.glyphScoreGateEnabled !== true)
            return grouped;

        var minGlyphScore = this.clamp(this.toNumeric(normalizedOptions.minGlyphScore, 0.2), 0, 1);
        var scored = [];
        for (var groupedIndex = 0; groupedIndex < grouped.length; groupedIndex++) {
            var region = grouped[groupedIndex];
            var glyphScore = this.resolveGlyphScore(region, normalizedColumns, normalizedRows, normalizedOptions);
            if (glyphScore < minGlyphScore)
                continue;

            scored.push(Object.assign({}, region, {
                _glyphScore: glyphScore
            }));
        }

        return scored;

    }

    /**
     * Resolve one normalized glyph-likeness score for one grouped OCR region.
     * @param {object} region Grouped region.
     * @param {number} columns Frame columns.
     * @param {number} rows Frame rows.
     * @param {object} options OCR options.
     * @returns {number} Score [0,1].
     */
    resolveGlyphScore(region, columns, rows, options) {

        var width = Math.max(0, this.toInteger(region?.width, 0));
        var height = Math.max(0, this.toInteger(region?.height, 0));
        var regionArea = Math.max(1, (width * height));
        var frameArea = Math.max(1, (Math.max(1, columns) * Math.max(1, rows)));

        var componentCount = Math.max(0, this.toInteger(region?._componentCount, 0));
        var componentCoverage = this.clamp(this.toNumeric(region?._componentCoverage, 0), 0, 1);
        var componentMeanArea = Math.max(0, this.toNumeric(region?._componentMeanArea, 0));
        var meanComponentCoverage = this.clamp((componentMeanArea / regionArea), 0, 1);
        var regionAreaRatio = this.clamp((regionArea / frameArea), 0, 1);

        var coverageTarget = this.clamp(this.toNumeric(options.glyphCoverageTarget, 0.25), 0.0001, 1);
        var coverageTolerance = this.clamp(this.toNumeric(options.glyphCoverageTolerance, 0.6), 0.0001, 1);
        var coverageScore = 1 - (Math.abs(componentCoverage - coverageTarget) / coverageTolerance);
        coverageScore = this.clamp(coverageScore, 0.2, 1);

        var componentCountTarget = Math.max(1, this.toInteger(options.glyphComponentCountTarget, 3));
        var componentCountScore = this.clamp(((componentCount + 1) / (componentCountTarget + 1)), 0, 1);

        var maxMeanComponentCoverage = this.clamp(this.toNumeric(options.glyphMaxMeanComponentCoverage, 0.9), 0.0001, 1);
        var meanCoverageScore = 1 - (meanComponentCoverage / maxMeanComponentCoverage);
        meanCoverageScore = this.clamp(meanCoverageScore, 0, 1);

        var sizeScore = (regionAreaRatio < 0.02) ? 1 : 0.25;

        var score = (
            (0.40 * coverageScore)
            + (0.35 * componentCountScore)
            + (0.15 * meanCoverageScore)
            + (0.10 * sizeScore)
        );

        var largeRegionAreaRatio = this.clamp(this.toNumeric(options.glyphLargeRegionAreaRatio, 0.01), 0, 1);
        var largeRegionMinComponents = Math.max(1, this.toInteger(options.glyphLargeRegionMinComponents, 3));
        if ((regionArea >= 256)
            && (regionAreaRatio >= largeRegionAreaRatio)
            && (componentCount < largeRegionMinComponents)) {
            score *= 0.4;
        }

        return this.clamp(score, 0, 1);

    }

};
