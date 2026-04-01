//
// PngRgbaEncoder.js
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

export default class PngRgbaEncoder {

    /**
     * Convert a 32-bit unsigned value to big-endian bytes.
     * @param {number} value The input value.
     * @returns {Uint8Array} The encoded bytes.
     */
    u32be(value) {
        return new Uint8Array([
            (value >>> 24) & 0xFF,
            (value >>> 16) & 0xFF,
            (value >>> 8) & 0xFF,
            value & 0xFF
        ]);
    }

    /**
     * Concatenate multiple byte arrays.
     * @param {Array<Uint8Array>} arrays Input arrays.
     * @returns {Uint8Array} Combined bytes.
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
     * Compute CRC-32 for PNG chunks.
     * @param {Uint8Array} bytes The input bytes.
     * @returns {number} CRC-32 value.
     */
    crc32(bytes) {

        var crc = 0xFFFFFFFF;

        for (var i = 0; i < bytes.length; i++) {
            crc ^= bytes[i];
            for (var bit = 0; bit < 8; bit++) {
                if ((crc & 1) == 1) {
                    crc = (crc >>> 1) ^ 0xEDB88320;
                }
                else {
                    crc = (crc >>> 1);
                }
            }
        }

        return (crc ^ 0xFFFFFFFF) >>> 0;

    }

    /**
     * Compute Adler-32 checksum for zlib streams.
     * @param {Uint8Array} bytes The input bytes.
     * @returns {number} Adler-32 checksum.
     */
    adler32(bytes) {

        var a = 1;
        var b = 0;

        for (var i = 0; i < bytes.length; i++) {
            a = (a + bytes[i]) % 65521;
            b = (b + a) % 65521;
        }

        return (((b << 16) | a) >>> 0);

    }

    /**
     * Create a zlib stream using uncompressed DEFLATE blocks.
     * @param {Uint8Array} bytes The input bytes.
     * @returns {Uint8Array} Zlib bytes.
     */
    zlibStore(bytes) {

        var blocks = [];
        var offset = 0;
        var maxBlockLength = 65535;

        // zlib header (CMF/FLG): deflate + 32K window, fastest algorithm.
        blocks.push(new Uint8Array([0x78, 0x01]));

        while (offset < bytes.length) {

            var remaining = (bytes.length - offset);
            var blockLength = Math.min(maxBlockLength, remaining);
            var isFinal = ((offset + blockLength) >= bytes.length) ? 1 : 0;
            var nlen = (~blockLength) & 0xFFFF;

            blocks.push(new Uint8Array([
                isFinal,
                blockLength & 0xFF, (blockLength >>> 8) & 0xFF,
                nlen & 0xFF, (nlen >>> 8) & 0xFF
            ]));

            blocks.push(bytes.subarray(offset, (offset + blockLength)));
            offset += blockLength;

        }

        var checksum = this.adler32(bytes);
        blocks.push(this.u32be(checksum));

        return this.concat(blocks);

    }

    /**
     * Build one PNG chunk.
     * @param {string} type The 4-character chunk type.
     * @param {Uint8Array} data Chunk payload.
     * @returns {Uint8Array} Encoded chunk.
     */
    chunk(type, data) {

        var typeBytes = (new TextEncoder()).encode(type);
        var crcInput = this.concat([typeBytes, data]);
        var crc = this.crc32(crcInput);

        return this.concat([
            this.u32be(data.length),
            typeBytes,
            data,
            this.u32be(crc)
        ]);

    }

    /**
     * Encode RGBA pixels to PNG bytes.
     * @param {Uint8Array} rgba RGBA pixel bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @returns {{ bytes: Uint8Array, mimeType: string, format: string }} Encoded payload.
     */
    encode(rgba, width, height) {

        var rowLength = (width * 4);
        var scanlines = new Uint8Array((height * (rowLength + 1)));
        var sourceOffset = 0;
        var scanlineOffset = 0;

        for (var y = 0; y < height; y++) {
            scanlines[scanlineOffset] = 0; // PNG filter type 0 (None)
            scanlineOffset += 1;
            scanlines.set(rgba.subarray(sourceOffset, sourceOffset + rowLength), scanlineOffset);
            scanlineOffset += rowLength;
            sourceOffset += rowLength;
        }

        var ihdr = new Uint8Array(13);
        ihdr.set(this.u32be(width), 0);
        ihdr.set(this.u32be(height), 4);
        ihdr[8] = 8; // bit depth
        ihdr[9] = 6; // color type: RGBA
        ihdr[10] = 0; // compression method
        ihdr[11] = 0; // filter method
        ihdr[12] = 0; // interlace method

        var idat = this.zlibStore(scanlines);

        var png = this.concat([
            new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
            this.chunk('IHDR', ihdr),
            this.chunk('IDAT', idat),
            this.chunk('IEND', new Uint8Array(0))
        ]);

        return {
            bytes: png,
            mimeType: 'image/png',
            format: 'png'
        };

    }

    constructor() {
    }

};
