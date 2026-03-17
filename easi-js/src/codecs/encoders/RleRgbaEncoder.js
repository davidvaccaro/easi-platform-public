//
// RleRgbaEncoder.js - 1.0.0
//
// DICOM RLE Lossless RGBA Encoder Class
//

import Exception, { GeneralErrorCodes } from "../../environment/Exception.js";

export default class RleRgbaEncoder {

    static HeaderLength = 64;
    static MaxSegments = 15;

    /**
     * Resolve component count for output.
     * @param {object | null} options Encode options.
     * @returns {number} 1, 3, or 4.
     */
    resolveComponentCount(options = null) {

        var componentCount = Math.trunc(Number(options?.componentCount));
        if ((componentCount != 1) && (componentCount != 3) && (componentCount != 4))
            componentCount = 3;

        return componentCount;

    }

    /**
     * Resolve bits allocated for output samples.
     * @param {object | null} options Encode options.
     * @returns {number} Bits allocated.
     */
    resolveBitsAllocated(options = null) {

        var bitsAllocated = Math.trunc(Number(options?.bitsAllocated));
        if (Number.isFinite(bitsAllocated) == false)
            bitsAllocated = 8;

        if (bitsAllocated <= 0)
            bitsAllocated = 8;

        return bitsAllocated;

    }

    /**
     * Convert one RGBA pixel to grayscale byte.
     * @param {number} red Red channel.
     * @param {number} green Green channel.
     * @param {number} blue Blue channel.
     * @returns {number} Grayscale byte.
     */
    toGrayByte(red, green, blue) {
        return (((77 * red) + (150 * green) + (29 * blue) + 128) >> 8);
    }

    /**
     * Build one component plane from RGBA bytes.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {number} componentIndex Component index (0..3).
     * @returns {Uint8Array} Component plane.
     */
    buildComponentPlane(rgba, width, height, componentIndex) {

        var pixelCount = (width * height);
        var plane = new Uint8Array(pixelCount);

        var sourceOffset = componentIndex;
        for (var i = 0; i < pixelCount; i++) {
            plane[i] = rgba[sourceOffset] ?? 0;
            sourceOffset += 4;
        }

        return plane;

    }

    /**
     * Build one grayscale plane from RGBA bytes.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @returns {Uint8Array} Grayscale plane.
     */
    buildMonochromePlane(rgba, width, height) {

        var pixelCount = (width * height);
        var plane = new Uint8Array(pixelCount);

        var sourceOffset = 0;
        for (var i = 0; i < pixelCount; i++) {
            var red = rgba[sourceOffset + 0] ?? 0;
            var green = rgba[sourceOffset + 1] ?? 0;
            var blue = rgba[sourceOffset + 2] ?? 0;
            plane[i] = this.toGrayByte(red, green, blue);
            sourceOffset += 4;
        }

        return plane;

    }

    /**
     * Encode one scanline with PackBits (RLE).
     * @param {Uint8Array} source Source bytes.
     * @param {number} start Start offset.
     * @param {number} length Scanline length.
     * @param {Array<number>} output Output byte array.
     */
    encodePackBitsScanline(source, start, length, output) {

        var offset = start;
        var stop = (start + length);

        while (offset < stop) {

            var runLength = 1;
            while (((offset + runLength) < stop)
                && (runLength < 128)
                && (source[offset + runLength] == source[offset])) {
                runLength += 1;
            }

            if (runLength >= 3) {
                output.push((257 - runLength) & 0xFF);
                output.push(source[offset]);
                offset += runLength;
                continue;
            }

            var literalStart = offset;
            offset += runLength;

            while (offset < stop) {

                var nextRunLength = 1;
                while (((offset + nextRunLength) < stop)
                    && (nextRunLength < 128)
                    && (source[offset + nextRunLength] == source[offset])) {
                    nextRunLength += 1;
                }

                if (nextRunLength >= 3)
                    break;

                offset += nextRunLength;
                if ((offset - literalStart) >= 128)
                    break;

            }

            var literalLength = (offset - literalStart);
            while (literalLength > 0) {

                var chunkLength = Math.min(128, literalLength);
                output.push((chunkLength - 1) & 0xFF);

                for (var i = 0; i < chunkLength; i++) {
                    output.push(source[literalStart + i]);
                }

                literalStart += chunkLength;
                literalLength -= chunkLength;

            }

        }

    }

    /**
     * Encode one component plane as row-wise PackBits stream.
     * @param {Uint8Array} plane Source plane bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @returns {Uint8Array} Encoded segment bytes.
     */
    encodePlaneAsSegment(plane, width, height) {

        var output = [];

        for (var row = 0; row < height; row++) {
            var rowStart = (row * width);
            this.encodePackBitsScanline(plane, rowStart, width, output);
        }

        return new Uint8Array(output);

    }

    /**
     * Build DICOM RLE frame header for segments.
     * @param {Array<Uint8Array>} segments Encoded segments.
     * @returns {Uint8Array} 64-byte RLE frame header.
     */
    buildHeader(segments) {

        var segmentCount = segments.length;
        if ((segmentCount < 1) || (segmentCount > RleRgbaEncoder.MaxSegments)) {
            throw new Exception(
                "Invalid RLE segment count for DICOM frame.",
                GeneralErrorCodes.InvalidPart
            );
        }

        var header = new Uint8Array(RleRgbaEncoder.HeaderLength);
        var view = new DataView(header.buffer);
        view.setUint32(0, segmentCount, true);

        var offset = RleRgbaEncoder.HeaderLength;
        for (var i = 0; i < segmentCount; i++) {
            view.setUint32((4 + (i * 4)), offset, true);
            offset += segments[i].length;
        }

        return header;

    }

    /**
     * Encode RGBA frame bytes into one DICOM RLE Lossless frame payload.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {object | null} options Encode options.
     * @returns {Promise<{ bytes: Uint8Array, componentCount: number, bitsAllocated: number }>} Encoded payload.
     */
    async encode(rgba, width, height, options = null) {

        if ((rgba instanceof Uint8Array) == false) {
            throw new Exception(
                "Invalid RGBA frame bytes. Expected Uint8Array.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var frameWidth = Math.max(1, Math.trunc(Number(width) || 0));
        var frameHeight = Math.max(1, Math.trunc(Number(height) || 0));
        var pixelCount = (frameWidth * frameHeight);

        if (rgba.length < (pixelCount * 4)) {
            throw new Exception(
                "Invalid RGBA frame byte length for requested dimensions.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        var componentCount = this.resolveComponentCount(options);
        var bitsAllocated = this.resolveBitsAllocated(options);

        if (bitsAllocated != 8) {
            throw new Exception(
                "RLE RGBA encoder currently supports 8-bit output only.",
                GeneralErrorCodes.NotImplemented
            );
        }

        var segments = [];

        if (componentCount == 1) {
            var monoPlane = this.buildMonochromePlane(rgba, frameWidth, frameHeight);
            segments.push(this.encodePlaneAsSegment(monoPlane, frameWidth, frameHeight));
        }
        else {
            for (var component = 0; component < componentCount; component++) {
                var plane = this.buildComponentPlane(rgba, frameWidth, frameHeight, component);
                segments.push(this.encodePlaneAsSegment(plane, frameWidth, frameHeight));
            }
        }

        var header = this.buildHeader(segments);
        var totalLength = header.length;
        for (var i = 0; i < segments.length; i++) {
            totalLength += segments[i].length;
        }

        var bytes = new Uint8Array(totalLength);
        bytes.set(header, 0);

        var offset = header.length;
        for (var segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
            bytes.set(segments[segmentIndex], offset);
            offset += segments[segmentIndex].length;
        }

        return {
            bytes,
            componentCount,
            bitsAllocated
        };

    }

}
