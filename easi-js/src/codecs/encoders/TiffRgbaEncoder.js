//
// TiffRgbaEncoder.js
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

export default class TiffRgbaEncoder {

    /**
     * Write a 16-bit unsigned integer in little-endian order.
     * @param {Uint8Array} bytes Destination bytes.
     * @param {number} offset Offset.
     * @param {number} value Value.
     */
    writeU16(bytes, offset, value) {
        bytes[offset] = (value & 0xFF);
        bytes[offset + 1] = ((value >>> 8) & 0xFF);
    }

    /**
     * Write a 32-bit unsigned integer in little-endian order.
     * @param {Uint8Array} bytes Destination bytes.
     * @param {number} offset Offset.
     * @param {number} value Value.
     */
    writeU32(bytes, offset, value) {
        bytes[offset] = (value & 0xFF);
        bytes[offset + 1] = ((value >>> 8) & 0xFF);
        bytes[offset + 2] = ((value >>> 16) & 0xFF);
        bytes[offset + 3] = ((value >>> 24) & 0xFF);
    }

    /**
     * Write one IFD entry.
     * @param {Uint8Array} bytes Destination bytes.
     * @param {number} offset Entry offset.
     * @param {number} tag TIFF tag.
     * @param {number} type TIFF type.
     * @param {number} count Component count.
     * @param {number} valueOrOffset Inline value or data offset.
     */
    writeIFDEntry(bytes, offset, tag, type, count, valueOrOffset) {
        this.writeU16(bytes, offset + 0, tag);
        this.writeU16(bytes, offset + 2, type);
        this.writeU32(bytes, offset + 4, count);
        this.writeU32(bytes, offset + 8, valueOrOffset);
    }

    /**
     * Encode RGBA pixels to baseline uncompressed TIFF bytes.
     * @param {Uint8Array} rgba RGBA pixel bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @returns {{ bytes: Uint8Array, mimeType: string, format: string }} Encoded payload.
     */
    encode(rgba, width, height) {

        var entries = [
            { tag: 256, type: 4, count: 1, value: width },       // ImageWidth (LONG)
            { tag: 257, type: 4, count: 1, value: height },      // ImageLength (LONG)
            { tag: 258, type: 3, count: 4, value: 0 },           // BitsPerSample (SHORT[4]) -> offset
            { tag: 259, type: 3, count: 1, value: 1 },           // Compression = none
            { tag: 262, type: 3, count: 1, value: 2 },           // PhotometricInterpretation = RGB
            { tag: 273, type: 4, count: 1, value: 0 },           // StripOffsets -> offset
            { tag: 277, type: 3, count: 1, value: 4 },           // SamplesPerPixel = 4
            { tag: 278, type: 4, count: 1, value: height },      // RowsPerStrip = full image
            { tag: 279, type: 4, count: 1, value: rgba.length }, // StripByteCounts
            { tag: 284, type: 3, count: 1, value: 1 },           // PlanarConfiguration = chunky
            { tag: 338, type: 3, count: 1, value: 2 }            // ExtraSamples = unassociated alpha
        ];

        var headerSize = 8;
        var entryCount = entries.length;
        var ifdSize = (2 + (entryCount * 12) + 4);
        var bitsPerSampleSize = 8; // 4 shorts
        var bitsPerSampleOffset = headerSize + ifdSize;
        var stripOffset = bitsPerSampleOffset + bitsPerSampleSize;
        var totalSize = stripOffset + rgba.length;

        var bytes = new Uint8Array(totalSize);

        // TIFF header: little-endian, magic 42, first IFD at offset 8.
        bytes[0] = 0x49; bytes[1] = 0x49;
        this.writeU16(bytes, 2, 42);
        this.writeU32(bytes, 4, 8);

        // IFD count
        this.writeU16(bytes, headerSize, entryCount);

        // Fill dynamic offsets
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].tag == 258) {
                entries[i].value = bitsPerSampleOffset;
            }
            if (entries[i].tag == 273) {
                entries[i].value = stripOffset;
            }
        }

        // IFD entries
        var entryOffset = (headerSize + 2);
        for (var j = 0; j < entries.length; j++) {
            this.writeIFDEntry(
                bytes,
                entryOffset,
                entries[j].tag,
                entries[j].type,
                entries[j].count,
                entries[j].value
            );
            entryOffset += 12;
        }

        // Next IFD offset = 0
        this.writeU32(bytes, headerSize + 2 + (entryCount * 12), 0);

        // BitsPerSample values (8, 8, 8, 8)
        this.writeU16(bytes, bitsPerSampleOffset + 0, 8);
        this.writeU16(bytes, bitsPerSampleOffset + 2, 8);
        this.writeU16(bytes, bitsPerSampleOffset + 4, 8);
        this.writeU16(bytes, bitsPerSampleOffset + 6, 8);

        // Pixel bytes
        bytes.set(rgba, stripOffset);

        return {
            bytes,
            mimeType: 'image/tiff',
            format: 'tiff'
        };

    }

    constructor() {
    }

};
