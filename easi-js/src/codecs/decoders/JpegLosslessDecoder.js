import { Decoder as JpegLosslessCoreDecoder } from "./internal/JpegLosslessCore.js";

/**
 * Decode JPEG Lossless pixel data to RGBA destination.
 * Uses upstream jpeg-lossless-decoder-js core, then applies DICOM display rules.
 */
export default class JpegLosslessDecoder {

    constructor(dicomObject) {
        this.dicomObject = dicomObject;
    }

    static resolveFirstScalar(value, fallback = null) {
        if (value == null) {
            return fallback;
        }

        if (Array.isArray(value) === true) {
            if (value.length === 0)
                return fallback;
            value = value[0];
            if (value == null)
                return fallback;
        }

        if (typeof value === "string") {
            if (value.trim().length === 0)
                return fallback;
            value = value.split("\\")[0];
            if (value.trim().length === 0)
                return fallback;
        }

        const numeric = Number(value);
        if (Number.isFinite(numeric) === false)
            return fallback;

        return numeric;
    }

    static toDisplayByte(sample, precisionBits) {
        const precision = Math.max(1, Number(precisionBits) || 8);
        let normalized = Number(sample) || 0;

        if (precision > 8) {
            normalized = (normalized >> (precision - 8));
        }
        else if (precision < 8) {
            const maxSample = Math.max(1, (1 << precision) - 1);
            normalized = Math.round((normalized / maxSample) * 255);
        }

        if (normalized < 0)
            return 0;
        if (normalized > 255)
            return 255;
        return normalized;
    }

    static normalizeStoredSample(sample, bitsStored, pixelRepresentation) {
        const storedBits = Math.max(1, Math.min(31, Number(bitsStored) || 8));
        const isSigned = (Number(pixelRepresentation || 0) === 1);

        const mask = (storedBits >= 31) ? 0x7FFFFFFF : ((1 << storedBits) - 1);
        let value = (Number(sample) || 0) & mask;

        if (isSigned === true) {
            const signBit = (1 << (storedBits - 1));
            if ((value & signBit) !== 0) {
                value -= (1 << storedBits);
            }
        }

        return value;
    }

    decode(source, sourceStart, sourceStop, destination, destinationStart, windowCenter = null, windowWidth = null) {

        const sourceBytes = (source instanceof Uint8Array)
            ? source
            : new Uint8Array(source);

        const decodeStart = Math.max(0, Number(sourceStart) || 0);
        const decodeStop = Math.min(sourceBytes.length, Number(sourceStop) || sourceBytes.length);
        const decodeLength = Math.max(0, (decodeStop - decodeStart));

        if (decodeLength <= 0)
            return false;

        const decoder = new JpegLosslessCoreDecoder();
        const decodedPixels = decoder.decode(
            sourceBytes.buffer,
            sourceBytes.byteOffset + decodeStart,
            decodeLength
        );

        const xDim = Math.max(0, Number(decoder.xDim) || 0);
        const yDim = Math.max(0, Number(decoder.yDim) || 0);
        const numComp = Math.max(1, Number(decoder.numComp) || 1);
        const numBytes = Math.max(1, Number(decoder.numBytes) || 1);
        const precision = Math.max(1, Number(decoder.precision) || (numBytes * 8));
        const numPixels = (xDim * yDim);

        if ((numPixels <= 0) || (decodedPixels == null))
            return false;

        if (numComp === 1) {

            const storedBits = Math.max(
                1,
                Number(this.dicomObject?.imagePixelModule?.bitsStored ?? precision ?? (numBytes * 8) ?? 8) || 8
            );
            const pixelRepresentation = Number(this.dicomObject?.imagePixelModule?.pixelRepresentation ?? 0);

            const photometric = String(this.dicomObject?.imagePixelModule?.photometricInterpretation ?? "").trim().toUpperCase();
            const isMonochromeOne = (photometric.includes("MONOCHROME1") === true);

            const rescaleIntercept = JpegLosslessDecoder.resolveFirstScalar(this.dicomObject?.modalityLookUpTableModule?.rescaleIntercept, null);
            const rescaleSlope = JpegLosslessDecoder.resolveFirstScalar(this.dicomObject?.modalityLookUpTableModule?.rescaleSlope, null);
            const applyRescale = ((rescaleIntercept != null) && (rescaleSlope != null));

            let resolvedWindowCenter = JpegLosslessDecoder.resolveFirstScalar(windowCenter, null);
            let resolvedWindowWidth = JpegLosslessDecoder.resolveFirstScalar(windowWidth, null);
            let applyWindowLevel = ((resolvedWindowCenter != null) && (resolvedWindowWidth != null) && (resolvedWindowWidth > 0));

            let lowValue = 0;
            let highValue = 0;

            const getRawSample = (index) => {
                const sample = decodedPixels[index] ?? 0;
                return JpegLosslessDecoder.normalizeStoredSample(sample, storedBits, pixelRepresentation);
            };

            // Always compute decoded numeric range first so we can validate any provided WC/WW.
            let minValue = Number.POSITIVE_INFINITY;
            let maxValue = Number.NEGATIVE_INFINITY;
            for (let i = 0; i < numPixels; i++) {
                let sample = getRawSample(i);
                if (applyRescale === true) {
                    sample = (sample * rescaleSlope) + rescaleIntercept;
                }

                if (sample < minValue)
                    minValue = sample;
                if (sample > maxValue)
                    maxValue = sample;
            }

            if (applyWindowLevel === true) {
                lowValue = (resolvedWindowCenter - (resolvedWindowWidth / 2));
                highValue = (resolvedWindowCenter + (resolvedWindowWidth / 2));

                // If explicit WC/WW does not intersect decoded values, fall back to data-driven windowing.
                const invalidWindow = (
                    (Number.isFinite(lowValue) === false) ||
                    (Number.isFinite(highValue) === false) ||
                    (highValue <= lowValue)
                );
                const noRangeOverlap = (
                    (Number.isFinite(minValue) === true) &&
                    (Number.isFinite(maxValue) === true) &&
                    ((maxValue <= lowValue) || (minValue >= highValue))
                );
                if ((invalidWindow === true) || (noRangeOverlap === true)) {
                    applyWindowLevel = false;
                }
            }
            if (applyWindowLevel === false) {
                if ((Number.isFinite(minValue) === true) && (Number.isFinite(maxValue) === true) && (maxValue > minValue)) {
                    resolvedWindowCenter = (minValue + ((maxValue - minValue) / 2));
                    resolvedWindowWidth = (maxValue - minValue);
                    lowValue = minValue;
                    highValue = maxValue;
                    applyWindowLevel = true;
                }
            }

            for (let i = 0; i < numPixels; i++) {
                let sample = getRawSample(i);
                if (applyRescale === true) {
                    sample = (sample * rescaleSlope) + rescaleIntercept;
                }

                let pixel;
                if (applyWindowLevel === true) {
                    let clamped = sample;
                    if (clamped < lowValue)
                        clamped = lowValue;
                    if (clamped > highValue)
                        clamped = highValue;

                    pixel = Math.floor(((clamped - lowValue) / resolvedWindowWidth) * 255);
                    if (Number.isFinite(pixel) === false)
                        pixel = 0;
                    if (pixel < 0)
                        pixel = 0;
                    if (pixel > 255)
                        pixel = 255;
                }
                else {
                    pixel = JpegLosslessDecoder.toDisplayByte(sample, precision);
                }

                if (isMonochromeOne === true) {
                    pixel = (255 - pixel);
                }

                const destinationOffset = ((destinationStart + i) * 4);
                destination[destinationOffset + 0] = pixel;
                destination[destinationOffset + 1] = pixel;
                destination[destinationOffset + 2] = pixel;
                destination[destinationOffset + 3] = 255;
            }
        }
        else if (numComp >= 3) {
            const toByte = (sample) => JpegLosslessDecoder.toDisplayByte(sample, precision);

            for (let p = 0; p < numPixels; p++) {
                const base = (p * numComp);
                const red = decodedPixels[base + 0] ?? 0;
                const green = decodedPixels[base + 1] ?? 0;
                const blue = decodedPixels[base + 2] ?? 0;

                const destinationOffset = ((destinationStart + p) * 4);
                destination[destinationOffset + 0] = (numBytes > 1) ? toByte(red) : red;
                destination[destinationOffset + 1] = (numBytes > 1) ? toByte(green) : green;
                destination[destinationOffset + 2] = (numBytes > 1) ? toByte(blue) : blue;
                destination[destinationOffset + 3] = 255;
            }
        }

        return true;
    }
}
