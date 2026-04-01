//
// RleDecoder.js
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
import Tag from "../../dicom/Tag.js";

export default class RleDecoder {

    static HeaderLength = 64;
    static MaxSegments = 15;

    /**
     * Decode one RLE segment (PackBits) into one raw byte plane.
     * @param {Uint8Array} source Segment bytes.
     * @param {number} expectedLength Expected decoded bytes.
     * @returns {Uint8Array} Decoded segment bytes.
     */
    decodeSegment(source, expectedLength) {

        var output = new Uint8Array(Math.max(0, expectedLength));
        var inOffset = 0;
        var outOffset = 0;

        while ((inOffset < source.length) && (outOffset < output.length)) {

            var control = source[inOffset++];
            if (control >= 128)
                control -= 256;

            if ((control >= 0) && (control <= 127)) {
                var copyCount = (control + 1);
                if ((inOffset + copyCount) > source.length)
                    copyCount = (source.length - inOffset);
                if ((outOffset + copyCount) > output.length)
                    copyCount = (output.length - outOffset);
                output.set(source.subarray(inOffset, (inOffset + copyCount)), outOffset);
                inOffset += copyCount;
                outOffset += copyCount;
                continue;
            }

            if ((control >= -127) && (control <= -1)) {
                var repeatCount = (1 - control);
                var value = source[inOffset++] ?? 0;
                while ((repeatCount > 0) && (outOffset < output.length)) {
                    output[outOffset++] = value;
                    repeatCount--;
                }
                continue;
            }

            // control == -128 => NOP

        }

        return output;

    }

    /**
     * Resolve one segment byte-range from offsets.
     * @param {number[]} offsets Segment offsets.
     * @param {number} index Segment index.
     * @param {number} frameLength Frame byte length.
     * @returns {{ start: number, stop: number }} Byte range.
     */
    resolveSegmentRange(offsets, index, frameLength) {

        var start = Math.max(RleDecoder.HeaderLength, offsets[index] ?? 0);
        var stop = frameLength;

        for (var i = (index + 1); i < offsets.length; i++) {
            var nextOffset = offsets[i];
            if ((typeof nextOffset == "number") && (nextOffset > start)) {
                stop = Math.min(frameLength, nextOffset);
                break;
            }
        }

        if (stop < start)
            stop = start;

        return { start, stop };

    }

    /**
     * Parse RLE frame header.
     * @param {Uint8Array} frame Frame bytes.
     * @returns {{ segmentCount: number, offsets: number[] }} Header info.
     */
    parseHeader(frame) {

        if (frame.length < RleDecoder.HeaderLength) {
            throw new Exception(
                "Invalid DICOM RLE frame. Missing 64-byte header.",
                GeneralErrorCodes.InvalidPart
            );
        }

        var view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
        var segmentCount = view.getUint32(0, true);

        if ((segmentCount < 1) || (segmentCount > RleDecoder.MaxSegments)) {
            throw new Exception(
                "Invalid DICOM RLE frame. Segment count is out of range.",
                GeneralErrorCodes.InvalidPart
            );
        }

        var offsets = [];
        for (var i = 0; i < segmentCount; i++) {
            offsets.push(view.getUint32(4 + (i * 4), true));
        }

        return { segmentCount, offsets };

    }

    /**
     * Build one palette channel from palette bytes.
     * @param {Uint8Array | null} bytes Palette bytes.
     * @returns {Uint8Array | null} 8-bit palette channel.
     */
    buildPaletteChannel(bytes) {

        if ((bytes instanceof Uint8Array) == false)
            return null;

        if (bytes.length == 0)
            return null;

        if ((bytes.length % 2) == 0) {
            var entries16 = (bytes.length / 2);
            var out16 = new Uint8Array(entries16);
            var view16 = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
            for (var i = 0; i < entries16; i++) {
                var sample16 = view16.getUint16((i * 2), true);
                out16[i] = Math.min(255, (sample16 >> 8));
            }
            return out16;
        }

        return bytes;

    }

    /**
     * Convert one source sample value to 8-bit.
     * @param {number} sample Source sample value.
     * @returns {number} 8-bit value.
     */
    sampleToByte(sample) {

        var bitsStored = Math.max(1, Math.min(31, Number(this.bitsStored ?? this.bitsAllocated ?? 8)));
        var isSigned = (Number(this.pixelRepresentation ?? 0) == 1);
        var numeric = Number(sample);
        if (Number.isFinite(numeric) == false)
            numeric = 0;

        var minValue = isSigned ? (-(1 << (bitsStored - 1))) : 0;
        var maxValue = isSigned ? ((1 << (bitsStored - 1)) - 1) : ((1 << bitsStored) - 1);

        if (numeric < minValue)
            numeric = minValue;
        if (numeric > maxValue)
            numeric = maxValue;

        var normalized = ((numeric - minValue) / Math.max(1, (maxValue - minValue))) * 255;
        if (normalized < 0)
            return 0;
        if (normalized > 255)
            return 255;
        return Math.round(normalized);

    }

    /**
     * Normalize photometric interpretation to canonical upper-case string.
     * @param {string | symbol | null | undefined} value Source photometric value.
     * @returns {string | null} Normalized value when available.
     */
    normalizePhotometricInterpretation(value) {

        if (value == null)
            return null;

        var normalized = String(value).trim().toUpperCase();
        var symbolMatch = /^SYMBOL\((.*)\)$/.exec(normalized);
        if (symbolMatch != null)
            normalized = String(symbolMatch[1] ?? "").trim().toUpperCase();

        // Handle enum key form.
        if (normalized == "PALETTECOLOR")
            return "PALETTE COLOR";

        // Normalize spacing variants.
        if (normalized == "PALETTE_COLOR")
            return "PALETTE COLOR";

        return normalized;

    }

    /**
     * Decode one RLE frame to RGBA bytes.
     * @param {Uint8Array} source Source bytes.
     * @param {number} sourceStart Source start index.
     * @param {number | null} sourceStop Source stop index.
     * @param {Uint8Array} destination Destination RGBA bytes.
     * @param {number} destinationStart Destination pixel index.
     * @returns {boolean} TRUE on success.
     */
    decode(source, sourceStart, sourceStop, destination, destinationStart) {

        if ((source instanceof Uint8Array) == false) {
            throw new Exception(
                "Invalid RLE source bytes. Expected Uint8Array.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        if ((destination instanceof Uint8Array) == false) {
            throw new Exception(
                "Invalid RLE destination bytes. Expected Uint8Array.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var start = Math.max(0, Math.trunc(Number(sourceStart) || 0));
        var stop = (sourceStop == null) ? source.length : Math.min(source.length, Math.trunc(Number(sourceStop)));
        if (stop <= start) {
            throw new Exception(
                "Invalid RLE source bounds.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var frame = source.subarray(start, stop);
        var header = this.parseHeader(frame);

        var rows = Math.max(1, Number(this.rows ?? 0) || 1);
        var columns = Math.max(1, Number(this.columns ?? 0) || 1);
        var pixelCount = (rows * columns);
        var samplesPerPixel = Math.max(1, Number(this.samplesPerPixel ?? 1) || 1);
        var bitsAllocated = Math.max(1, Number(this.bitsAllocated ?? 8) || 8);
        var bytesPerSample = Math.max(1, Math.ceil(bitsAllocated / 8));

        var decodedSegments = [];
        for (var segmentIndex = 0; segmentIndex < header.segmentCount; segmentIndex++) {
            var range = this.resolveSegmentRange(header.offsets, segmentIndex, frame.length);
            var segmentBytes = frame.subarray(range.start, range.stop);
            decodedSegments.push(this.decodeSegment(segmentBytes, pixelCount));
        }

        var paletteRed = this.buildPaletteChannel(this.redPaletteColorLookupTableData ?? null);
        var paletteGreen = this.buildPaletteChannel(this.greenPaletteColorLookupTableData ?? null);
        var paletteBlue = this.buildPaletteChannel(this.bluePaletteColorLookupTableData ?? null);
        var photometricInterpretation = this.normalizePhotometricInterpretation(this.photometricInterpretation) ?? "";
        var isPaletteColor = (photometricInterpretation == "PALETTE COLOR");
        var destinationOffset = (Math.max(0, Number(destinationStart) || 0) * 4);

        for (var pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {

            var red = 0;
            var green = 0;
            var blue = 0;
            var alpha = 255;

            if (samplesPerPixel == 1) {

                var sample = 0;
                for (var bytePlane = 0; bytePlane < bytesPerSample; bytePlane++) {
                    var monoSegment = decodedSegments[bytePlane];
                    sample = ((sample << 8) | (monoSegment?.[pixelIndex] ?? 0));
                }

                if (isPaletteColor == true) {
                    var paletteIndex = Math.max(0, sample);
                    red = paletteRed?.[paletteIndex] ?? 0;
                    green = paletteGreen?.[paletteIndex] ?? red;
                    blue = paletteBlue?.[paletteIndex] ?? red;
                }
                else {
                    var gray = (bytesPerSample == 1) ? (sample & 0xFF) : this.sampleToByte(sample);
                    red = gray;
                    green = gray;
                    blue = gray;
                }

            }
            else {

                var componentValues = [];
                for (var component = 0; component < samplesPerPixel; component++) {
                    var componentSample = 0;
                    for (var plane = 0; plane < bytesPerSample; plane++) {
                        var segment = decodedSegments[(component * bytesPerSample) + plane];
                        componentSample = ((componentSample << 8) | (segment?.[pixelIndex] ?? 0));
                    }
                    componentValues.push((bytesPerSample == 1) ? (componentSample & 0xFF) : this.sampleToByte(componentSample));
                }

                red = componentValues[0] ?? 0;
                green = componentValues[1] ?? red;
                blue = componentValues[2] ?? red;
                if (componentValues.length >= 4)
                    alpha = componentValues[3] ?? 255;

            }

            destination[destinationOffset + 0] = red;
            destination[destinationOffset + 1] = green;
            destination[destinationOffset + 2] = blue;
            destination[destinationOffset + 3] = alpha;
            destinationOffset += 4;

            if (destinationOffset >= destination.length)
                break;

        }

        return true;

    }

    /**
     * Resolve attribute bytes for optional palette lookup data.
     * @param {object | null} attribute DICOM attribute.
     * @returns {Uint8Array | null} Attribute bytes.
     */
    resolveAttributeBytes(attribute) {

        if (attribute == null)
            return null;

        if (typeof attribute.access == "function")
            return attribute.access();

        var value = attribute.value;
        if (value instanceof Uint8Array)
            return value;

        return null;

    }

    /**
     * Initialize decoder context from a DICOM image object.
     * @param {object | null} dicomObject DICOM image-like object.
     */
    initializeFromDicomObject(dicomObject = null) {

        if (dicomObject == null)
            return;

        var imagePixel = dicomObject?.imagePixelModule ?? null;
        if (imagePixel != null) {
            this.rows = imagePixel.rows ?? this.rows;
            this.columns = imagePixel.columns ?? this.columns;
            this.samplesPerPixel = imagePixel.samplesPerPixel ?? this.samplesPerPixel;
            this.bitsAllocated = imagePixel.bitsAllocated ?? this.bitsAllocated;
            this.bitsStored = imagePixel.bitsStored ?? this.bitsStored;
            this.pixelRepresentation = imagePixel.pixelRepresentation ?? this.pixelRepresentation;
            this.photometricInterpretation = this.normalizePhotometricInterpretation(imagePixel.photometricInterpretation)
                ?? this.photometricInterpretation;
        }

        var attributeSet = dicomObject?.attributeSet ?? null;
        if ((attributeSet != null) && (typeof attributeSet.find == "function")) {
            if (typeof attributeSet.value == "function") {
                this.photometricInterpretation = this.normalizePhotometricInterpretation(
                    attributeSet.value(Tag.PhotometricInterpretation, this.photometricInterpretation)
                ) ?? this.photometricInterpretation;
            }
            this.redPaletteColorLookupTableData = this.resolveAttributeBytes(
                attributeSet.find(Tag.RedPaletteColorLookupTableData)
            ) ?? this.redPaletteColorLookupTableData;
            this.greenPaletteColorLookupTableData = this.resolveAttributeBytes(
                attributeSet.find(Tag.GreenPaletteColorLookupTableData)
            ) ?? this.greenPaletteColorLookupTableData;
            this.bluePaletteColorLookupTableData = this.resolveAttributeBytes(
                attributeSet.find(Tag.BluePaletteColorLookupTableData)
            ) ?? this.bluePaletteColorLookupTableData;
        }

    }

    constructor(dicomObject = null) {

        this.dicomObject = dicomObject;

        this.rows = null;
        this.columns = null;
        this.samplesPerPixel = 1;
        this.bitsAllocated = 8;
        this.bitsStored = 8;
        this.pixelRepresentation = 0;
        this.photometricInterpretation = null;
        this.redPaletteColorLookupTableData = null;
        this.greenPaletteColorLookupTableData = null;
        this.bluePaletteColorLookupTableData = null;

        this.initializeFromDicomObject(dicomObject);

    }

};
