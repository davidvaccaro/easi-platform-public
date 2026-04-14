//
// ImageBurnedInRedactionFilter.js
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
import Configuration from "../../environment/Configuration.js";
import ImagingDataUtils from "../../utils/ImagingDataUtils.js";
import {
    BurnedInRedactionActions,
    BurnedInRedactionCoordinateModes,
    BurnedInRedactionModes
} from "./DicomBurnedInRedactionFilter.js";

export default class ImageBurnedInRedactionFilter {

    /**
     * Forward an event call to the next handler when supported.
     * @param {string} name The event name.
     * @param {object} context The current context.
     * @param {*} param The event parameter.
     * @returns {*} The forwarded result.
     */
    async forward(name, context, param = null) {

        if ((this.nextHandler == null) || (this.nextHandler[name] == null))
            return null;

        const result = this.nextHandler[name](context, param);
        if ((result != null) && (typeof result.then == "function"))
            return await result;

        return result;

    }

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
     * Apply one redaction region fill into RGBA bytes.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {{x: number, y: number, width: number, height: number}} region Region.
     * @param {number[]} fillRGBA Fill RGBA.
     */
    applyRegionFill(rgba, width, height, region, fillRGBA) {

        var left = this.clamp(Math.floor(region.x), 0, width);
        var top = this.clamp(Math.floor(region.y), 0, height);
        var right = this.clamp(Math.ceil(region.x + region.width), 0, width);
        var bottom = this.clamp(Math.ceil(region.y + region.height), 0, height);

        if ((right <= left) || (bottom <= top))
            return;

        for (var y = top; y < bottom; y++) {
            for (var x = left; x < right; x++) {
                var offset = ((y * width) + x) * 4;
                rgba[offset] = fillRGBA[0];
                rgba[offset + 1] = fillRGBA[1];
                rgba[offset + 2] = fillRGBA[2];
                rgba[offset + 3] = fillRGBA[3];
            }
        }

    }

    /**
     * Normalize region coordinates to image pixel space.
     * @param {number} width Image width.
     * @param {number} height Image height.
     * @param {Array<object>} regions Region list.
     * @returns {Array<{x: number, y: number, width: number, height: number}>} Normalized regions.
     */
    normalizeFrameRegions(width, height, regions) {

        if (Array.isArray(regions) == false)
            return [];

        var coordinateMode = String(this.redaction.coordinateMode ?? BurnedInRedactionCoordinateModes.PIXEL).trim().toLowerCase();
        var normalized = [];

        for (var i = 0; i < regions.length; i++) {
            var region = regions[i] ?? {};
            normalized.push({
                x: this.resolveRegionX(region),
                y: this.resolveRegionY(region),
                width: this.resolveRegionWidth(region),
                height: this.resolveRegionHeight(region)
            });
        }

        if (coordinateMode == BurnedInRedactionCoordinateModes.NORMALIZED) {
            for (var normalizedIndex = 0; normalizedIndex < normalized.length; normalizedIndex++) {
                var normalizedRegion = normalized[normalizedIndex];
                normalizedRegion.x *= width;
                normalizedRegion.width *= width;
                normalizedRegion.y *= height;
                normalizedRegion.height *= height;
            }
        }

        var scaleX = this.resolveScale(this.redaction.coordinateScaleX, 1);
        var scaleY = this.resolveScale(this.redaction.coordinateScaleY, 1);

        if (coordinateMode == BurnedInRedactionCoordinateModes.AUTO_FIT) {
            var maxRight = 0;
            var maxBottom = 0;

            for (var autoFitIndex = 0; autoFitIndex < normalized.length; autoFitIndex++) {
                var autoFitRegion = normalized[autoFitIndex];
                maxRight = Math.max(maxRight, autoFitRegion.x + autoFitRegion.width);
                maxBottom = Math.max(maxBottom, autoFitRegion.y + autoFitRegion.height);
            }

            if (maxRight > 0)
                scaleX = (width / maxRight) * scaleX;

            if (maxBottom > 0)
                scaleY = (height / maxBottom) * scaleY;
        }

        if ((scaleX != 1) || (scaleY != 1)) {
            for (var scaledIndex = 0; scaledIndex < normalized.length; scaledIndex++) {
                var scaledRegion = normalized[scaledIndex];
                scaledRegion.x *= scaleX;
                scaledRegion.width *= scaleX;
                scaledRegion.y *= scaleY;
                scaledRegion.height *= scaleY;
            }
        }

        return normalized;

    }

    /**
     * Resolve effective per-frame regions.
     * @param {number} width Image width.
     * @param {number} height Image height.
     * @param {object} payload Input payload.
     * @param {object} context Parse context.
     * @returns {Promise<Array<{x: number, y: number, width: number, height: number}>>} Normalized regions.
     */
    async resolveFrameRegions(width, height, payload, context) {

        var regions = this.redaction.regions ?? [];

        if (typeof regions == "function") {
            regions = regions({
                context,
                width,
                height,
                sourcePath: payload?.sourcePath ?? null,
                imageFormat: payload?.imageFormat ?? null
            });

            if ((regions != null) && (typeof regions.then == "function")) {
                regions = await regions;
            }
        }

        return this.normalizeFrameRegions(width, height, regions);

    }

    /**
     * Resolve normalized source image format.
     * @param {object} payload Input payload.
     * @returns {string | null} Image format.
     */
    resolveImageFormat(payload) {

        var imageFormat = String(
            payload?.imageFormat
            ?? payload?.format
            ?? ImagingDataUtils.detectImageFormat(payload?.bytes ?? null, payload?.contentType ?? null)
            ?? ""
        ).trim().toLowerCase();

        if ((imageFormat == "jpg") || (imageFormat == "jpeg"))
            return "jpeg";

        return (imageFormat.length > 0) ? imageFormat : null;

    }

    /**
     * Decode source image bytes to RGBA.
     * @param {object} payload Input payload.
     * @returns {{format: string, width: number, height: number, rgba: Uint8Array}} Decoded image.
     */
    async decodeImage(payload) {

        var bytes = payload?.bytes ?? null;
        if ((bytes == null) || (bytes.length == 0)) {
            throw new Exception(
                "Failed redacting burned-in image content. No source image bytes were supplied.",
                GeneralErrorCodes.InvalidData
            );
        }

        var imageFormat = this.resolveImageFormat(payload);
        if (imageFormat == null) {
            throw new Exception(
                "Failed redacting burned-in image content. Unsupported or unknown image format.",
                GeneralErrorCodes.InvalidData
            );
        }

        if ((imageFormat != "jpeg")
            && (imageFormat != "png")
            && (imageFormat != "tiff")) {
            throw new Exception(
                `Burned-in image redaction currently supports JPEG, PNG, and TIFF input. Received '${imageFormat}'.`,
                GeneralErrorCodes.NotImplemented
            );
        }

        var imageDecoder = this.codecRegistry.getDecoderForImageFormat(imageFormat);
        if ((imageDecoder == null) || (typeof imageDecoder.decodeImage != "function")) {
            throw new Exception(
                `No image decoder is registered for burned-in image source format '${imageFormat}'.`,
                GeneralErrorCodes.NotImplemented
            );
        }

        var decoded = imageDecoder.decodeImage(bytes, 0, bytes.length);
        if ((decoded != null) && (typeof decoded.then == "function")) {
            decoded = await decoded;
        }

        return {
            format: imageFormat,
            width: decoded.width,
            height: decoded.height,
            rgba: decoded.bytes
        };

    }

    /**
     * Resolve output image format.
     * @param {string} sourceFormat Source format.
     * @returns {string} Output format.
     */
    resolveOutputFormat(sourceFormat) {

        var outputFormat = String(this.redaction.targetImageFormat ?? sourceFormat ?? "").trim().toLowerCase();
        if ((outputFormat == "jpg") || (outputFormat == "jpeg"))
            return "jpeg";

        if (outputFormat.length == 0)
            return "jpeg";

        return outputFormat;

    }

    /**
     * Encode RGBA image bytes using configured output format.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Image width.
     * @param {number} height Image height.
     * @param {string} sourceFormat Source format.
     * @returns {Promise<{bytes: Uint8Array, imageFormat: string, mediaType: string | null}>} Encoded output.
     */
    async encodeImage(rgba, width, height, sourceFormat) {

        var outputFormat = this.resolveOutputFormat(sourceFormat);
        var encoder = this.codecRegistry.getEncoder(outputFormat);
        if ((encoder == null) || (typeof encoder.encode != "function")) {
            throw new Exception(
                `No encoder is registered for burned-in image redaction output format '${outputFormat}'.`,
                GeneralErrorCodes.NotImplemented
            );
        }

        var encoded = encoder.encode(rgba, width, height, this.redaction.encoderOptions);
        if ((encoded != null) && (typeof encoded.then == "function")) {
            encoded = await encoded;
        }

        if ((encoded?.bytes instanceof Uint8Array) == false) {
            throw new Exception(
                `Invalid encoded output from format '${outputFormat}'. Expected { bytes: Uint8Array, ... }.`,
                GeneralErrorCodes.InvalidData
            );
        }

        var encodedFormat = String(encoded?.format ?? outputFormat).trim().toLowerCase();
        if (encodedFormat == "jpg")
            encodedFormat = "jpeg";

        return {
            bytes: encoded.bytes,
            imageFormat: encodedFormat,
            mediaType: encoded?.mimeType ?? ImagingDataUtils.resolveImageMediaType(encodedFormat)
        };

    }

    onReset(context, param = null) {
        return this.forward("onReset", context, param);
    }

    onStart(context, param = null) {
        return this.forward("onStart", context, param);
    }

    onData(context, param = null) {
        return this.forward("onData", context, param);
    }

    /**
     * Redact one non-DICOM image payload, then forward to next handler.
     * @param {object} context Parse context.
     * @param {object} payload Input payload.
     * @returns {Promise<*>} Forwarded terminal result.
     */
    async onEnd(context, payload) {

        var decoded = await this.decodeImage(payload);
        var frameRegions = await this.resolveFrameRegions(
            decoded.width,
            decoded.height,
            payload,
            context
        );

        if (frameRegions.length == 0) {
            return await this.forward("onEnd", context, payload);
        }

        for (var regionIndex = 0; regionIndex < frameRegions.length; regionIndex++) {
            this.applyRegionFill(
                decoded.rgba,
                decoded.width,
                decoded.height,
                frameRegions[regionIndex],
                this.redactionFillRGBA
            );
        }

        var encoded = await this.encodeImage(decoded.rgba, decoded.width, decoded.height, decoded.format);

        var sourcePath = payload?.sourcePath ?? ImagingDataUtils.resolveSourcePath(payload?.contentType ?? null);
        var sourceFileName = payload?.contentType?.fileName ?? null;
        var contentType = ImagingDataUtils.buildContentType(encoded.mediaType, sourcePath, sourceFileName);

        return await this.forward("onEnd", context, Object.assign({}, payload, {
            bytes: encoded.bytes,
            imageFormat: encoded.imageFormat,
            mediaType: encoded.mediaType,
            contentType: contentType
        }));

    }

    onError(context, param = null) {
        return this.forward("onError", context, param);
    }

    onProgress(context, param = null) {
        return this.forward("onProgress", context, param);
    }

    /**
     * Normalize image redaction options.
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
                "Burned-in image redaction currently supports mode 'regions' only.",
                GeneralErrorCodes.NotImplemented
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

        var encoderOptions = Object.assign({}, normalizedOptions.encoderOptions ?? {});
        if (normalizedOptions.quality != null) {
            encoderOptions.quality = normalizedOptions.quality;
        }

        return {
            mode: mode,
            action: action,
            regions: regions,
            fill: normalizedOptions.fill ?? null,
            coordinateMode: coordinateMode,
            coordinateScaleX: normalizedOptions.coordinateScaleX ?? normalizedOptions.scaleX ?? 1,
            coordinateScaleY: normalizedOptions.coordinateScaleY ?? normalizedOptions.scaleY ?? 1,
            targetImageFormat: normalizedOptions.targetImageFormat ?? normalizedOptions.targetFormat ?? normalizedOptions.encode ?? null,
            codecRegistry: normalizedOptions.codecRegistry ?? null,
            encoderOptions: encoderOptions
        };

    }

    /**
     * Construct one image burned-in redaction filter.
     * @param {object | null} nextHandler Next handler in the chain.
     * @param {boolean | object | Function | Array<object>} options Redaction options.
     */
    constructor(nextHandler = null, options = null) {

        this.nextHandler = nextHandler;
        this.redaction = this.normalizeOptions(options);
        this.redactionFillRGBA = this.resolveFillRGBA(this.redaction.action, this.redaction.fill ?? null);
        this.codecRegistry = this.redaction.codecRegistry ?? Configuration.global.codecRegistry;

    }

}
