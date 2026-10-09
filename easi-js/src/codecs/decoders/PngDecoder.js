//
// PngDecoder.js
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

export default class PngDecoder {

    /**
     * Read one big-endian 32-bit value.
     * @param {Uint8Array} bytes Source bytes.
     * @param {number} offset Offset.
     * @returns {number} Value.
     */
    readU32BE(bytes, offset) {
        return (
            ((bytes[offset] << 24) >>> 0)
            | (bytes[offset + 1] << 16)
            | (bytes[offset + 2] << 8)
            | bytes[offset + 3]
        ) >>> 0;
    }

    /**
     * Concatenate byte arrays.
     * @param {Array<Uint8Array>} arrays Source arrays.
     * @returns {Uint8Array} Combined output.
     */
    concat(arrays) {

        var total = 0;
        for (var i = 0; i < arrays.length; i++) {
            total += arrays[i].length;
        }

        var output = new Uint8Array(total);
        var offset = 0;
        for (var j = 0; j < arrays.length; j++) {
            output.set(arrays[j], offset);
            offset += arrays[j].length;
        }

        return output;

    }

    /**
     * Apply PNG paeth predictor.
     * @param {number} left Left byte.
     * @param {number} up Upper byte.
     * @param {number} upperLeft Upper-left byte.
     * @returns {number} Predictor value.
     */
    paeth(left, up, upperLeft) {

        var p = left + up - upperLeft;
        var pa = Math.abs(p - left);
        var pb = Math.abs(p - up);
        var pc = Math.abs(p - upperLeft);

        if ((pa <= pb) && (pa <= pc))
            return left;

        if (pb <= pc)
            return up;

        return upperLeft;

    }

    /**
     * Resolve number of source channels from color type.
     * @param {number} colorType PNG color type.
     * @returns {number} Channel count.
     */
    channelsForColorType(colorType) {

        switch (colorType) {
            case 0: return 1; // Grayscale
            case 2: return 3; // RGB
            case 3: return 1; // Indexed
            case 4: return 2; // Grayscale + alpha
            case 6: return 4; // RGBA
            default:
                return 0;
        }

    }

    /**
     * Inflate zlib-compressed bytes.
     * @param {Uint8Array} bytes Deflated bytes.
     * @returns {Promise<Uint8Array>} Inflated bytes.
     */
    async inflate(bytes) {

        // Runtime-selected imports keep native zlib out of browser dependency graphs.
        var isNodeRuntime = (typeof process != "undefined") && (process.versions?.node != null);
        var zlibSpecifier = "node:zlib";

        try {
            if (isNodeRuntime && (typeof require == "function")) {
                var zlib = require(zlibSpecifier);
                var inflated = zlib.inflateSync(Buffer.from(bytes));
                return new Uint8Array(inflated.buffer, inflated.byteOffset, inflated.byteLength);
            }
        }
        catch (_error) {
        }

        try {
            // ESM/node runtimes without require(...) still benefit from native zlib.
            if (isNodeRuntime) {
                var zlibModule = await import(zlibSpecifier);
                var zlibInflated = zlibModule.inflateSync(Buffer.from(bytes));
                return new Uint8Array(zlibInflated.buffer, zlibInflated.byteOffset, zlibInflated.byteLength);
            }
        }
        catch (_error) {
        }

        if (typeof DecompressionStream != "undefined") {
            // Pipe through the decompressor so read-consumption starts immediately and
            // avoids writer backpressure deadlocks on larger PNG payloads.
            var response = new Response(
                (new Blob([bytes])).stream().pipeThrough(new DecompressionStream("deflate"))
            );
            var buffer = await response.arrayBuffer();
            return new Uint8Array(buffer);
        }

        throw new Error("Failed decoding PNG image. ZLIB inflation is not available in this runtime.");

    }

    /**
     * Decode one PNG payload to RGBA bytes.
     * @param {Uint8Array} source Source bytes.
     * @param {number} sourceStart Start offset.
     * @param {number | null} sourceStop End offset.
     * @returns {Promise<{ width: number, height: number, bytes: Uint8Array }>} Decoded image.
     */
    async decodeImage(source, sourceStart = 0, sourceStop = null) {

        if (sourceStop == null) {
            sourceStop = source?.length ?? 0;
        }

        source = source.subarray(sourceStart, sourceStop);
        if (source.length < 8) {
            throw new Error("Failed decoding PNG image. Source bytes are too short.");
        }

        var signature = [137, 80, 78, 71, 13, 10, 26, 10];
        for (var signatureIndex = 0; signatureIndex < signature.length; signatureIndex++) {
            if (source[signatureIndex] != signature[signatureIndex]) {
                throw new Error("Failed decoding PNG image. Invalid PNG signature.");
            }
        }

        var width = 0;
        var height = 0;
        var bitDepth = 0;
        var colorType = 0;
        var compressionMethod = 0;
        var filterMethod = 0;
        var interlaceMethod = 0;
        var palette = null;
        var paletteAlpha = null;
        var idatChunks = [];

        var offset = 8;
        while ((offset + 12) <= source.length) {

            var chunkLength = this.readU32BE(source, offset);
            offset += 4;

            if ((offset + 4 + chunkLength + 4) > source.length) {
                throw new Error("Failed decoding PNG image. Corrupt chunk length.");
            }

            var type = String.fromCharCode(
                source[offset],
                source[offset + 1],
                source[offset + 2],
                source[offset + 3]
            );
            offset += 4;

            var data = source.subarray(offset, offset + chunkLength);
            offset += chunkLength;

            // Skip CRC.
            offset += 4;

            if (type == "IHDR") {
                if (chunkLength != 13) {
                    throw new Error("Failed decoding PNG image. Invalid IHDR length.");
                }

                width = this.readU32BE(data, 0);
                height = this.readU32BE(data, 4);
                bitDepth = data[8];
                colorType = data[9];
                compressionMethod = data[10];
                filterMethod = data[11];
                interlaceMethod = data[12];
            }
            else if (type == "PLTE") {
                palette = data;
            }
            else if (type == "tRNS") {
                paletteAlpha = data;
            }
            else if (type == "IDAT") {
                idatChunks.push(data);
            }
            else if (type == "IEND") {
                break;
            }

        }

        if ((width <= 0) || (height <= 0)) {
            throw new Error("Failed decoding PNG image. Missing IHDR image size.");
        }

        if (compressionMethod != 0) {
            throw new Error("Failed decoding PNG image. Unsupported compression method.");
        }

        if (filterMethod != 0) {
            throw new Error("Failed decoding PNG image. Unsupported filter method.");
        }

        if (interlaceMethod != 0) {
            throw new Error("Failed decoding PNG image. Interlaced PNG is not supported.");
        }

        if (bitDepth != 8) {
            throw new Error("Failed decoding PNG image. Only 8-bit PNG is supported.");
        }

        var channels = this.channelsForColorType(colorType);
        if (channels == 0) {
            throw new Error("Failed decoding PNG image. Unsupported PNG color type.");
        }

        if ((colorType == 3) && (palette == null)) {
            throw new Error("Failed decoding PNG image. Indexed PNG is missing PLTE chunk.");
        }

        var combinedIDAT = this.concat(idatChunks);
        var inflated = await this.inflate(combinedIDAT);

        var bytesPerPixel = channels;
        var rowBytes = (width * channels);
        var expectedLength = height * (rowBytes + 1);
        if (inflated.length < expectedLength) {
            throw new Error("Failed decoding PNG image. Inflated data is incomplete.");
        }

        var unfiltered = new Uint8Array(height * rowBytes);
        var sourceRowOffset = 0;

        for (var row = 0; row < height; row++) {

            var filterType = inflated[sourceRowOffset];
            sourceRowOffset += 1;

            var rowOffset = (row * rowBytes);
            for (var column = 0; column < rowBytes; column++) {
                var rawValue = inflated[sourceRowOffset + column];
                var left = (column >= bytesPerPixel) ? unfiltered[rowOffset + column - bytesPerPixel] : 0;
                var up = (row > 0) ? unfiltered[rowOffset - rowBytes + column] : 0;
                var upperLeft = ((row > 0) && (column >= bytesPerPixel))
                    ? unfiltered[rowOffset - rowBytes + column - bytesPerPixel]
                    : 0;

                var value = 0;
                switch (filterType) {
                    case 0: // None
                        value = rawValue;
                        break;
                    case 1: // Sub
                        value = (rawValue + left) & 0xFF;
                        break;
                    case 2: // Up
                        value = (rawValue + up) & 0xFF;
                        break;
                    case 3: // Average
                        value = (rawValue + Math.floor((left + up) / 2)) & 0xFF;
                        break;
                    case 4: // Paeth
                        value = (rawValue + this.paeth(left, up, upperLeft)) & 0xFF;
                        break;
                    default:
                        throw new Error(`Failed decoding PNG image. Unsupported filter type '${filterType}'.`);
                }

                unfiltered[rowOffset + column] = value;
            }

            sourceRowOffset += rowBytes;

        }

        var rgba = new Uint8Array(width * height * 4);
        var unfilteredOffset = 0;
        var rgbaOffset = 0;

        for (var pixelIndex = 0; pixelIndex < (width * height); pixelIndex++) {

            if (colorType == 6) { // RGBA
                rgba[rgbaOffset] = unfiltered[unfilteredOffset];
                rgba[rgbaOffset + 1] = unfiltered[unfilteredOffset + 1];
                rgba[rgbaOffset + 2] = unfiltered[unfilteredOffset + 2];
                rgba[rgbaOffset + 3] = unfiltered[unfilteredOffset + 3];
                unfilteredOffset += 4;
            }
            else if (colorType == 2) { // RGB
                rgba[rgbaOffset] = unfiltered[unfilteredOffset];
                rgba[rgbaOffset + 1] = unfiltered[unfilteredOffset + 1];
                rgba[rgbaOffset + 2] = unfiltered[unfilteredOffset + 2];
                rgba[rgbaOffset + 3] = 255;
                unfilteredOffset += 3;
            }
            else if (colorType == 0) { // Grayscale
                var gray = unfiltered[unfilteredOffset];
                rgba[rgbaOffset] = gray;
                rgba[rgbaOffset + 1] = gray;
                rgba[rgbaOffset + 2] = gray;
                rgba[rgbaOffset + 3] = 255;
                unfilteredOffset += 1;
            }
            else if (colorType == 4) { // Grayscale + alpha
                var grayAlpha = unfiltered[unfilteredOffset];
                rgba[rgbaOffset] = grayAlpha;
                rgba[rgbaOffset + 1] = grayAlpha;
                rgba[rgbaOffset + 2] = grayAlpha;
                rgba[rgbaOffset + 3] = unfiltered[unfilteredOffset + 1];
                unfilteredOffset += 2;
            }
            else if (colorType == 3) { // Indexed palette
                var paletteIndex = unfiltered[unfilteredOffset];
                var paletteOffset = (paletteIndex * 3);
                rgba[rgbaOffset] = palette[paletteOffset] ?? 0;
                rgba[rgbaOffset + 1] = palette[paletteOffset + 1] ?? 0;
                rgba[rgbaOffset + 2] = palette[paletteOffset + 2] ?? 0;
                rgba[rgbaOffset + 3] = paletteAlpha?.[paletteIndex] ?? 255;
                unfilteredOffset += 1;
            }

            rgbaOffset += 4;

        }

        return {
            width: width,
            height: height,
            bytes: rgba
        };

    }

    /**
     * Decode PNG bytes into caller-supplied destination RGBA buffer.
     * @param {Uint8Array} source Source PNG bytes.
     * @param {number} sourceStart Start offset.
     * @param {number} sourceStop End offset.
     * @param {Uint8Array} destination Destination bytes.
     * @param {number} destinationStart Destination start offset.
     * @returns {Promise<boolean>} TRUE when decoded.
     */
    async decode(source, sourceStart, sourceStop, destination, destinationStart) {

        var decoded = await this.decodeImage(source, sourceStart, sourceStop);
        var start = destinationStart ?? 0;

        if ((destination instanceof Uint8Array) == false) {
            throw new Error("Failed decoding PNG image. Destination must be Uint8Array.");
        }

        if ((start < 0) || ((start + decoded.bytes.length) > destination.length)) {
            throw new Error("Failed decoding PNG image. Destination buffer is too small.");
        }

        destination.set(decoded.bytes, start);
        return true;

    }

    constructor() {
    }

}
