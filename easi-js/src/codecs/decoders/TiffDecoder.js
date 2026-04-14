//
// TiffDecoder.js
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

export default class TiffDecoder {

    /**
     * Read uint16 with selected endianness.
     * @param {DataView} view Data view.
     * @param {number} offset Byte offset.
     * @param {boolean} littleEndian Endianness.
     * @returns {number} Value.
     */
    readU16(view, offset, littleEndian) {
        return view.getUint16(offset, littleEndian);
    }

    /**
     * Read uint32 with selected endianness.
     * @param {DataView} view Data view.
     * @param {number} offset Byte offset.
     * @param {boolean} littleEndian Endianness.
     * @returns {number} Value.
     */
    readU32(view, offset, littleEndian) {
        return view.getUint32(offset, littleEndian);
    }

    /**
     * Resolve TIFF scalar type size in bytes.
     * @param {number} type TIFF type.
     * @returns {number} Size in bytes.
     */
    sizeOfType(type) {
        if (type == 1) return 1; // BYTE
        if (type == 2) return 1; // ASCII
        if (type == 7) return 1; // UNDEFINED
        if (type == 3) return 2; // SHORT
        if (type == 4) return 4; // LONG
        if (type == 5) return 8; // RATIONAL
        return 0;
    }

    /**
     * Read typed values from TIFF entry payload.
     * @param {Uint8Array} bytes Source bytes.
     * @param {DataView} view Data view.
     * @param {number} type TIFF type.
     * @param {number} count Component count.
     * @param {number} valueOrOffset Inline value or offset.
     * @param {boolean} littleEndian Endianness.
     * @returns {Array<number>} Values.
     */
    readValues(bytes, view, type, count, valueOrOffset, littleEndian) {

        var typeSize = this.sizeOfType(type);
        if (typeSize == 0) {
            // Ignore unsupported field payload types that are not required for pixel decode.
            return [];
        }

        var totalSize = (typeSize * count);
        var values = [];
        var readOffset = null;

        if (totalSize <= 4) {
            // Inline field payload occupies the 4-byte value/offset slot.
            var inlineBytes = new Uint8Array(4);
            var inlineView = new DataView(inlineBytes.buffer);
            inlineView.setUint32(0, valueOrOffset >>> 0, littleEndian);
            readOffset = 0;

            if (type == 1) {
                for (var i = 0; i < count; i++) {
                    values.push(inlineBytes[readOffset + i]);
                }
                return values;
            }

            if (type == 3) {
                for (var shortIndex = 0; shortIndex < count; shortIndex++) {
                    values.push(inlineView.getUint16(readOffset + (shortIndex * 2), littleEndian));
                }
                return values;
            }

            if (type == 4) {
                values.push(inlineView.getUint32(readOffset, littleEndian));
                return values;
            }

            for (var defaultIndex = 0; defaultIndex < count; defaultIndex++) {
                values.push(inlineBytes[readOffset + defaultIndex]);
            }
            return values;
        }

        readOffset = valueOrOffset;
        if ((readOffset < 0) || ((readOffset + totalSize) > bytes.length)) {
            throw new Error("Failed decoding TIFF image. Field value offset is out of range.");
        }

        if (type == 1) {
            for (var byteIndex = 0; byteIndex < count; byteIndex++) {
                values.push(bytes[readOffset + byteIndex]);
            }
            return values;
        }

        if (type == 3) {
            for (var shortValueIndex = 0; shortValueIndex < count; shortValueIndex++) {
                values.push(this.readU16(view, readOffset + (shortValueIndex * 2), littleEndian));
            }
            return values;
        }

        if (type == 4) {
            for (var longIndex = 0; longIndex < count; longIndex++) {
                values.push(this.readU32(view, readOffset + (longIndex * 4), littleEndian));
            }
            return values;
        }

        if (type == 2) {
            for (var asciiIndex = 0; asciiIndex < count; asciiIndex++) {
                values.push(bytes[readOffset + asciiIndex]);
            }
            return values;
        }

        if (type == 7) {
            for (var undefinedIndex = 0; undefinedIndex < count; undefinedIndex++) {
                values.push(bytes[readOffset + undefinedIndex]);
            }
            return values;
        }

        if (type == 5) {
            for (var rationalIndex = 0; rationalIndex < count; rationalIndex++) {
                var rationalOffset = readOffset + (rationalIndex * 8);
                var numerator = this.readU32(view, rationalOffset + 0, littleEndian);
                var denominator = this.readU32(view, rationalOffset + 4, littleEndian);
                values.push((denominator == 0) ? 0 : (numerator / denominator));
            }
            return values;
        }

        return [];

    }

    /**
     * Read one TIFF image into RGBA bytes.
     * @param {Uint8Array} source Source bytes.
     * @param {number} sourceStart Start offset.
     * @param {number | null} sourceStop End offset.
     * @returns {{ width: number, height: number, bytes: Uint8Array }} Decoded image.
     */
    decodeImage(source, sourceStart = 0, sourceStop = null) {

        if (sourceStop == null) {
            sourceStop = source?.length ?? 0;
        }

        source = source.subarray(sourceStart, sourceStop);
        if (source.length < 8) {
            throw new Error("Failed decoding TIFF image. Source bytes are too short.");
        }

        var byteOrder0 = source[0];
        var byteOrder1 = source[1];
        var littleEndian = false;

        if ((byteOrder0 == 0x49) && (byteOrder1 == 0x49)) {
            littleEndian = true;
        }
        else if ((byteOrder0 == 0x4D) && (byteOrder1 == 0x4D)) {
            littleEndian = false;
        }
        else {
            throw new Error("Failed decoding TIFF image. Invalid byte order marker.");
        }

        var view = new DataView(source.buffer, source.byteOffset, source.byteLength);
        var magic = this.readU16(view, 2, littleEndian);
        if (magic != 42) {
            throw new Error("Failed decoding TIFF image. Unsupported TIFF magic.");
        }

        var ifdOffset = this.readU32(view, 4, littleEndian);
        if ((ifdOffset <= 0) || ((ifdOffset + 2) > source.length)) {
            throw new Error("Failed decoding TIFF image. Invalid IFD offset.");
        }

        var entryCount = this.readU16(view, ifdOffset, littleEndian);
        var entriesOffset = (ifdOffset + 2);

        var fields = new Map();
        for (var entryIndex = 0; entryIndex < entryCount; entryIndex++) {
            var entryOffset = entriesOffset + (entryIndex * 12);
            if ((entryOffset + 12) > source.length) {
                throw new Error("Failed decoding TIFF image. Corrupt IFD entry.");
            }

            var tag = this.readU16(view, entryOffset + 0, littleEndian);
            var type = this.readU16(view, entryOffset + 2, littleEndian);
            var count = this.readU32(view, entryOffset + 4, littleEndian);
            var valueOrOffset = this.readU32(view, entryOffset + 8, littleEndian);

            fields.set(tag, {
                type,
                count,
                values: this.readValues(source, view, type, count, valueOrOffset, littleEndian)
            });
        }

        var width = fields.get(256)?.values?.[0] ?? 0;
        var height = fields.get(257)?.values?.[0] ?? 0;
        var bitsPerSample = fields.get(258)?.values ?? [8];
        var compression = fields.get(259)?.values?.[0] ?? 1;
        var photometric = fields.get(262)?.values?.[0] ?? 2;
        var stripOffsets = fields.get(273)?.values ?? null;
        var samplesPerPixel = fields.get(277)?.values?.[0] ?? bitsPerSample.length;
        var rowsPerStrip = fields.get(278)?.values?.[0] ?? height;
        var stripByteCounts = fields.get(279)?.values ?? null;
        var planarConfiguration = fields.get(284)?.values?.[0] ?? 1;

        if ((width <= 0) || (height <= 0)) {
            throw new Error("Failed decoding TIFF image. Missing image dimensions.");
        }

        if (compression != 1) {
            throw new Error("Failed decoding TIFF image. Only uncompressed TIFF is supported.");
        }

        if (planarConfiguration != 1) {
            throw new Error("Failed decoding TIFF image. Only chunky planar configuration is supported.");
        }

        if ((stripOffsets == null) || (stripByteCounts == null) || (stripOffsets.length == 0)) {
            throw new Error("Failed decoding TIFF image. Missing strip offsets/lengths.");
        }

        for (var bitsIndex = 0; bitsIndex < bitsPerSample.length; bitsIndex++) {
            if (bitsPerSample[bitsIndex] != 8) {
                throw new Error("Failed decoding TIFF image. Only 8-bit samples are supported.");
            }
        }

        var bytesPerPixel = samplesPerPixel;
        if ((bytesPerPixel != 1) && (bytesPerPixel != 2) && (bytesPerPixel != 3) && (bytesPerPixel != 4)) {
            throw new Error("Failed decoding TIFF image. Unsupported sample layout.");
        }

        var raw = new Uint8Array(width * height * bytesPerPixel);
        var rawOffset = 0;
        var stripCount = Math.min(stripOffsets.length, stripByteCounts.length);

        for (var stripIndex = 0; stripIndex < stripCount; stripIndex++) {
            var stripOffset = stripOffsets[stripIndex];
            var stripLength = stripByteCounts[stripIndex];

            if ((stripOffset < 0) || ((stripOffset + stripLength) > source.length)) {
                throw new Error("Failed decoding TIFF image. Strip payload exceeds source bounds.");
            }

            var strip = source.subarray(stripOffset, stripOffset + stripLength);
            var copyLength = Math.min(strip.length, raw.length - rawOffset);
            raw.set(strip.subarray(0, copyLength), rawOffset);
            rawOffset += copyLength;
            if (rawOffset >= raw.length)
                break;
        }

        if (rawOffset < raw.length) {
            throw new Error("Failed decoding TIFF image. Incomplete strip payload.");
        }

        var rgba = new Uint8Array(width * height * 4);
        var sourcePixelOffset = 0;
        var rgbaOffset = 0;

        for (var pixelIndex = 0; pixelIndex < (width * height); pixelIndex++) {

            if (bytesPerPixel == 4) {
                rgba[rgbaOffset] = raw[sourcePixelOffset];
                rgba[rgbaOffset + 1] = raw[sourcePixelOffset + 1];
                rgba[rgbaOffset + 2] = raw[sourcePixelOffset + 2];
                rgba[rgbaOffset + 3] = raw[sourcePixelOffset + 3];
            }
            else if (bytesPerPixel == 3) {
                rgba[rgbaOffset] = raw[sourcePixelOffset];
                rgba[rgbaOffset + 1] = raw[sourcePixelOffset + 1];
                rgba[rgbaOffset + 2] = raw[sourcePixelOffset + 2];
                rgba[rgbaOffset + 3] = 255;
            }
            else if (bytesPerPixel == 2) {
                var grayTwo = raw[sourcePixelOffset];
                rgba[rgbaOffset] = grayTwo;
                rgba[rgbaOffset + 1] = grayTwo;
                rgba[rgbaOffset + 2] = grayTwo;
                rgba[rgbaOffset + 3] = raw[sourcePixelOffset + 1];
            }
            else {
                var gray = raw[sourcePixelOffset];
                if (photometric == 0) { // WhiteIsZero
                    gray = 255 - gray;
                }
                rgba[rgbaOffset] = gray;
                rgba[rgbaOffset + 1] = gray;
                rgba[rgbaOffset + 2] = gray;
                rgba[rgbaOffset + 3] = 255;
            }

            sourcePixelOffset += bytesPerPixel;
            rgbaOffset += 4;

        }

        // rowsPerStrip is parsed/validated for model completeness. For uncompressed chunky
        // strips we consume bytes sequentially across strips above.
        void rowsPerStrip;

        return {
            width: width,
            height: height,
            bytes: rgba
        };

    }

    /**
     * Decode TIFF bytes into caller-supplied destination RGBA buffer.
     * @param {Uint8Array} source Source TIFF bytes.
     * @param {number} sourceStart Start offset.
     * @param {number} sourceStop End offset.
     * @param {Uint8Array} destination Destination bytes.
     * @param {number} destinationStart Destination start offset.
     * @returns {boolean} TRUE when decoded.
     */
    decode(source, sourceStart, sourceStop, destination, destinationStart) {

        var decoded = this.decodeImage(source, sourceStart, sourceStop);
        var start = destinationStart ?? 0;

        if ((destination instanceof Uint8Array) == false) {
            throw new Error("Failed decoding TIFF image. Destination must be Uint8Array.");
        }

        if ((start < 0) || ((start + decoded.bytes.length) > destination.length)) {
            throw new Error("Failed decoding TIFF image. Destination buffer is too small.");
        }

        destination.set(decoded.bytes, start);
        return true;

    }

    constructor() {
    }

}
