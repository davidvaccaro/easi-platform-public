//
// DicomBurnedInRedactionFilter.js - 1.0.0
//
// Stream DICOM Burned-In Redaction Filter Class
//

import Exception, { GeneralErrorCodes } from "../../environment/Exception.js";
import TransferSyntax from "../../dicom/TransferSyntax.js";
import DicomTranscodingFilter from "./DicomTranscodingFilter.js";

export const BurnedInRedactionModes = {
    REGIONS: "regions"
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
        if (mode != BurnedInRedactionModes.REGIONS)
            return rgba;

        var columns = Math.max(1, this.toInteger(state?.columns, 1));
        var rows = Math.max(1, this.toInteger(state?.rows, 1));
        var frameRegions = await this.resolveFrameRegions(state, frameIndex, frameCount);

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
        if (mode != BurnedInRedactionModes.REGIONS) {
            throw new Exception(
                `Invalid burned-in redaction mode '${mode}'. Supported modes: regions.`,
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
        normalizedTranscodingOptions.redaction = {
            mode: mode,
            action: action,
            regions: regions,
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
            coordinateMode: BurnedInRedactionCoordinateModes.PIXEL,
            coordinateScaleX: 1,
            coordinateScaleY: 1
        };
        this.preserveTransferSyntax = (this._options.preserveTransferSyntax === true);
        this.redactionFillRGBA = this.resolveFillRGBA(this.redaction.action, this.redaction.fill ?? null);
    }

};
