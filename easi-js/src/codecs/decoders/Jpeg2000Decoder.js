//
// Jpeg2000Decoder.js - 1.0.0
//
// JPEG 2000 Decoder Class
//

import Exception, { GeneralErrorCodes } from "../../environment/Exception.js";
import OpenJpegRuntime from "../runtimes/OpenJpegRuntime.js";

export default class Jpeg2000Decoder {

    static StartOfCodestream = new Uint8Array([0xFF, 0x4F]);
    static EndOfCodestream = new Uint8Array([0xFF, 0xD9]);
    static Jp2Signature = new Uint8Array([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x50, 0x20, 0x20]);

    /**
     * Resolve OpenJPEG runtime module synchronously.
     * @returns {object | null} OpenJPEG module.
     */
    resolveOpenJpegModule() {
        return OpenJpegRuntime.resolveSync({
            openjpegModule: this.openjpegModule ?? null,
            openjpegFactory: this.openjpegFactory ?? null
        });

    }

    /**
     * Find one sequence in source bytes.
     * @param {Uint8Array} source Source bytes.
     * @param {number} sourceStart Start index.
     * @param {Uint8Array} sequence Sequence bytes.
     * @returns {number} Index of sequence or -1.
     */
    indexOf(source, sourceStart, sequence) {

        if ((source instanceof Uint8Array) == false)
            return -1;

        if ((sequence instanceof Uint8Array) == false)
            return -1;

        if (sequence.length == 0)
            return -1;

        var start = Math.max(0, Math.trunc(Number(sourceStart) || 0));
        var stop = (source.length - sequence.length);

        for (var i = start; i <= stop; i++) {
            var found = true;
            for (var s = 0; s < sequence.length; s++) {
                if (source[i + s] != sequence[s]) {
                    found = false;
                    break;
                }
            }
            if (found == true)
                return i;
        }

        return -1;

    }

    /**
     * Resolve the encoded codestream span for one decode.
     * @param {Uint8Array} source Source bytes.
     * @param {number} sourceStart Start index.
     * @param {number | null} sourceStop Optional stop index.
     * @returns {{ start: number, stop: number }} Span.
     */
    resolveCodestreamSpan(source, sourceStart, sourceStop) {

        var start = Math.max(0, Math.trunc(Number(sourceStart) || 0));
        var stop = (sourceStop == null) ? source.length : Math.min(source.length, Math.trunc(Number(sourceStop)));

        if (stop <= start) {
            throw new Exception(
                "Invalid JPEG 2000 source bounds.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var codestreamStart = this.indexOf(source, start, Jpeg2000Decoder.StartOfCodestream);
        var jp2Start = this.indexOf(source, start, Jpeg2000Decoder.Jp2Signature);

        if (codestreamStart >= 0) {
            start = codestreamStart;
        }
        else if (jp2Start >= 0) {
            start = jp2Start;
        }

        if (sourceStop == null) {
            var codestreamStop = this.indexOf(source, start, Jpeg2000Decoder.EndOfCodestream);
            if (codestreamStop >= 0)
                stop = (codestreamStop + 2);
        }

        if (stop <= start) {
            throw new Exception(
                "Invalid JPEG 2000 codestream span.",
                GeneralErrorCodes.GeneralError
            );
        }

        return { start, stop };

    }

    /**
     * Map one source sample to 8-bit display value.
     * @param {number} value Sample value.
     * @param {number} bitsPerSample Bits per sample.
     * @param {boolean} isSigned TRUE if signed.
     * @param {number | null} windowCenter Window center.
     * @param {number | null} windowWidth Window width.
     * @returns {number} 8-bit value.
     */
    sampleToByte(value, bitsPerSample, isSigned, windowCenter = null, windowWidth = null) {

        var numeric = Number(value);
        if (Number.isFinite(numeric) == false)
            numeric = 0;

        if ((windowCenter != null) && (windowWidth != null) && (Number(windowWidth) > 0)) {
            var low = (Number(windowCenter) - (Number(windowWidth) / 2));
            var high = (Number(windowCenter) + (Number(windowWidth) / 2));

            if (numeric <= low)
                return 0;
            if (numeric >= high)
                return 255;

            var leveled = ((numeric - low) / Number(windowWidth)) * 255;
            if (leveled < 0)
                return 0;
            if (leveled > 255)
                return 255;
            return Math.round(leveled);
        }

        var bits = Math.max(1, Math.trunc(Number(bitsPerSample) || 8));
        bits = Math.min(bits, 31);

        var minValue = isSigned ? (-(1 << (bits - 1))) : 0;
        var maxValue = isSigned ? ((1 << (bits - 1)) - 1) : ((1 << bits) - 1);

        if (numeric < minValue)
            numeric = minValue;
        if (numeric > maxValue)
            numeric = maxValue;

        var normalized = ((numeric - minValue) / (maxValue - minValue || 1)) * 255;
        if (normalized < 0)
            return 0;
        if (normalized > 255)
            return 255;

        return Math.round(normalized);

    }

    /**
     * Copy decoded component data into RGBA destination bytes.
     * @param {TypedArray} decoded Decoded component samples.
     * @param {object} frameInfo Frame info.
     * @param {Uint8Array} destination Destination RGBA bytes.
     * @param {number} destinationStart Destination pixel start.
     * @param {number | null} windowCenter Optional window center.
     * @param {number | null} windowWidth Optional window width.
     */
    copyDecodedToDestination(decoded, frameInfo, destination, destinationStart, windowCenter = null, windowWidth = null) {

        var width = Math.max(1, Math.trunc(Number(frameInfo?.width) || 1));
        var height = Math.max(1, Math.trunc(Number(frameInfo?.height) || 1));
        var componentCount = Math.max(1, Math.trunc(Number(frameInfo?.componentCount) || 1));
        var bitsPerSample = Math.max(1, Math.trunc(Number(frameInfo?.bitsPerSample) || 8));
        var isSigned = (frameInfo?.isSigned == true);

        var totalPixels = (width * height);
        var maxPixels = Math.max(0, Math.floor((destination.length / 4) - destinationStart));
        var pixelsToCopy = Math.min(totalPixels, maxPixels);

        var destinationIndex = (destinationStart * 4);

        for (var pixelIndex = 0; pixelIndex < pixelsToCopy; pixelIndex++) {

            var sourceBase = (pixelIndex * componentCount);

            var red = this.sampleToByte(decoded[sourceBase], bitsPerSample, isSigned, windowCenter, windowWidth);
            var green = red;
            var blue = red;
            var alpha = 255;

            if (componentCount >= 3) {
                green = this.sampleToByte(decoded[sourceBase + 1], bitsPerSample, isSigned, windowCenter, windowWidth);
                blue = this.sampleToByte(decoded[sourceBase + 2], bitsPerSample, isSigned, windowCenter, windowWidth);
            }
            else if (componentCount == 2) {
                alpha = this.sampleToByte(decoded[sourceBase + 1], bitsPerSample, isSigned, null, null);
            }

            if (componentCount >= 4) {
                alpha = this.sampleToByte(decoded[sourceBase + 3], bitsPerSample, isSigned, null, null);
            }

            destination[destinationIndex + 0] = red;
            destination[destinationIndex + 1] = green;
            destination[destinationIndex + 2] = blue;
            destination[destinationIndex + 3] = alpha;
            destinationIndex += 4;

        }

    }

    /**
     * Decode JPEG 2000 source bytes into RGBA destination bytes.
     * @param {Uint8Array} source Source bytes.
     * @param {number} sourceStart Source start index.
     * @param {number | null} sourceStop Source stop index.
     * @param {Uint8Array} destination Destination RGBA bytes.
     * @param {number} destinationStart Destination start pixel index.
     * @param {number | null} windowCenter Optional window center.
     * @param {number | null} windowWidth Optional window width.
     * @returns {boolean} TRUE when decode succeeded.
     */
    decode(source, sourceStart, sourceStop, destination, destinationStart, windowCenter = null, windowWidth = null) {

        if ((source instanceof Uint8Array) == false) {
            throw new Exception(
                "Invalid JPEG 2000 source bytes. Expected Uint8Array.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        if ((destination instanceof Uint8Array) == false) {
            throw new Exception(
                "Invalid JPEG 2000 destination bytes. Expected Uint8Array.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var openjpeg = this.resolveOpenJpegModule();
        if ((openjpeg == null) || (typeof openjpeg.J2KDecoder != "function")) {
            throw new Exception(
                "JPEG 2000 decoding is unavailable. Provide a preloaded OpenJPEG module via options, constructor, OpenJpegRuntime, or globalThis.EASIOpenJPEGModule.",
                GeneralErrorCodes.NotImplemented
            );
        }

        var span = this.resolveCodestreamSpan(source, sourceStart, sourceStop);
        var encoded = source.subarray(span.start, span.stop);

        var decoder = new openjpeg.J2KDecoder();
        var encodedBuffer = decoder.getEncodedBuffer(encoded.length);
        encodedBuffer.set(encoded);

        try {
            decoder.decode();
        }
        catch (error) {
            throw new Exception(
                `OpenJPEG failed to decode JPEG 2000 payload. ${error?.message ?? ""}`.trim(),
                GeneralErrorCodes.GeneralError
            );
        }

        var frameInfo = decoder.getFrameInfo();
        var decoded = decoder.getDecodedBuffer();

        if ((decoded == null) || (typeof decoded.length != "number")) {
            throw new Exception(
                "OpenJPEG returned no decoded image buffer.",
                GeneralErrorCodes.GeneralError
            );
        }

        this.copyDecodedToDestination(
            decoded,
            frameInfo,
            destination,
            Math.max(0, Math.trunc(Number(destinationStart) || 0)),
            windowCenter,
            windowWidth
        );

        return true;

    }

    /**
     * Construct a JPEG 2000 decoder instance.
     * @param {object | null} dicomObject Optional DICOM object context.
     */
    constructor(dicomObject = null) {
        this.dicomObject = dicomObject;
        this.openjpegFactory = null;
        this.openjpegModule = null;
    }

};
