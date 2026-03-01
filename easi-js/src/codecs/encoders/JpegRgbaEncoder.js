//
// JpegRgbaEncoder.js - 1.0.0
//
// JPEG RGBA Encoder Class
//

export default class JpegRgbaEncoder {

    static ZigZag = new Uint8Array([
        0, 1, 8, 16, 9, 2, 3, 10,
        17, 24, 32, 25, 18, 11, 4, 5,
        12, 19, 26, 33, 40, 48, 41, 34,
        27, 20, 13, 6, 7, 14, 21, 28,
        35, 42, 49, 56, 57, 50, 43, 36,
        29, 22, 15, 23, 30, 37, 44, 51,
        58, 59, 52, 45, 38, 31, 39, 46,
        53, 60, 61, 54, 47, 55, 62, 63
    ]);

    static BaseLuminanceQuantization = new Uint8Array([
        16, 11, 10, 16, 24, 40, 51, 61,
        12, 12, 14, 19, 26, 58, 60, 55,
        14, 13, 16, 24, 40, 57, 69, 56,
        14, 17, 22, 29, 51, 87, 80, 62,
        18, 22, 37, 56, 68, 109, 103, 77,
        24, 35, 55, 64, 81, 104, 113, 92,
        49, 64, 78, 87, 103, 121, 120, 101,
        72, 92, 95, 98, 112, 100, 103, 99
    ]);

    static BaseChrominanceQuantization = new Uint8Array([
        17, 18, 24, 47, 99, 99, 99, 99,
        18, 21, 26, 66, 99, 99, 99, 99,
        24, 26, 56, 99, 99, 99, 99, 99,
        47, 66, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99,
        99, 99, 99, 99, 99, 99, 99, 99
    ]);

    /**
     * Resolve normalized JPEG quality (1-100).
     * @param {number | null | undefined} quality The quality setting.
     * @returns {number} Normalized quality.
     */
    resolveQuality(quality) {

        var resolved = Number(quality);

        if (Number.isFinite(resolved) == false) {
            resolved = 90;
        }
        else if (resolved <= 1) {
            resolved = Math.round(resolved * 100);
        }
        else {
            resolved = Math.round(resolved);
        }

        if (resolved < 1)
            resolved = 1;
        if (resolved > 100)
            resolved = 100;

        return resolved;

    }

    /**
     * Scale one quantization table for quality.
     * @param {Uint8Array} baseTable Base quantization table.
     * @param {number} quality Quality (1-100).
     * @returns {Uint8Array} Scaled quantization table.
     */
    scaleQuantizationTable(baseTable, quality) {

        var scale = (quality < 50)
            ? Math.floor(5000 / quality)
            : (200 - (quality * 2));

        var table = new Uint8Array(64);

        for (var i = 0; i < 64; i++) {
            var value = Math.floor(((baseTable[i] * scale) + 50) / 100);
            if (value < 1)
                value = 1;
            else if (value > 255)
                value = 255;
            table[i] = value;
        }

        return table;

    }

    /**
     * Build an 8x8 cosine lookup table used by DCT.
     * @returns {Array<Array<number>>} The lookup table.
     */
    buildCosineTable() {

        var table = [];

        for (var u = 0; u < 8; u++) {
            var row = [];
            for (var x = 0; x < 8; x++) {
                row.push(Math.cos((((2 * x) + 1) * u * Math.PI) / 16));
            }
            table.push(row);
        }

        return table;

    }

    /**
     * Build one canonical Huffman symbol->code table.
     * @param {Uint8Array} codeCounts Number of codes by code length (1..16).
     * @param {Uint8Array} values Symbol values.
     * @returns {object} Symbol to { code, length } map.
     */
    buildHuffmanCodeMap(codeCounts, values) {

        var map = {};
        var code = 0;
        var valueIndex = 0;

        for (var length = 1; length <= 16; length++) {

            var count = codeCounts[length] ?? 0;

            for (var i = 0; i < count; i++) {
                var symbol = values[valueIndex++];
                map[symbol] = { code, length };
                code += 1;
            }

            code <<= 1;

        }

        return map;

    }

    /**
     * Compute value category size in bits.
     * @param {number} value Input value.
     * @returns {number} Category size.
     */
    valueSize(value) {

        if (value == 0)
            return 0;

        var absolute = Math.abs(value);
        var bits = 0;

        while (absolute > 0) {
            bits += 1;
            absolute >>= 1;
        }

        return bits;

    }

    /**
     * Compute JPEG additional bits payload for one value.
     * @param {number} value Input value.
     * @param {number} size Category size.
     * @returns {number} Additional bits.
     */
    valueBits(value, size) {

        if (size == 0)
            return 0;

        if (value >= 0)
            return value;

        return value + ((1 << size) - 1);

    }

    /**
     * Write one 16-bit big-endian value.
     * @param {Array<number>} bytes Destination bytes.
     * @param {number} value Value.
     */
    writeWord(bytes, value) {
        bytes.push((value >>> 8) & 0xFF);
        bytes.push(value & 0xFF);
    }

    /**
     * Write one marker.
     * @param {Array<number>} bytes Destination bytes.
     * @param {number} marker Marker byte (without leading 0xFF).
     */
    writeMarker(bytes, marker) {
        bytes.push(0xFF, marker);
    }

    /**
     * Write the JFIF APP0 segment.
     * @param {Array<number>} bytes Destination bytes.
     */
    writeAPP0(bytes) {

        this.writeMarker(bytes, 0xE0);
        this.writeWord(bytes, 16);
        bytes.push(0x4A, 0x46, 0x49, 0x46, 0x00); // JFIF\0
        bytes.push(0x01, 0x01); // version 1.01
        bytes.push(0x00); // units
        this.writeWord(bytes, 1); // X density
        this.writeWord(bytes, 1); // Y density
        bytes.push(0x00, 0x00); // thumbnail

    }

    /**
     * Write DQT with luminance and chrominance tables.
     * @param {Array<number>} bytes Destination bytes.
     * @param {Uint8Array} luminanceTable Luminance quantization table.
     * @param {Uint8Array} chrominanceTable Chrominance quantization table.
     */
    writeDQT(bytes, luminanceTable, chrominanceTable) {

        this.writeMarker(bytes, 0xDB);
        this.writeWord(bytes, 2 + (1 + 64) + (1 + 64));

        bytes.push(0x00); // 8-bit precision, table 0
        for (var i = 0; i < 64; i++) {
            bytes.push(luminanceTable[JpegRgbaEncoder.ZigZag[i]]);
        }

        bytes.push(0x01); // 8-bit precision, table 1
        for (var j = 0; j < 64; j++) {
            bytes.push(chrominanceTable[JpegRgbaEncoder.ZigZag[j]]);
        }

    }

    /**
     * Write SOF0 (baseline frame header).
     * @param {Array<number>} bytes Destination bytes.
     * @param {number} width Image width.
     * @param {number} height Image height.
     */
    writeSOF0(bytes, width, height) {

        this.writeMarker(bytes, 0xC0);
        this.writeWord(bytes, 17);
        bytes.push(8); // precision
        this.writeWord(bytes, height);
        this.writeWord(bytes, width);
        bytes.push(3); // components

        // Y
        bytes.push(1);
        bytes.push(0x11); // H=1, V=1
        bytes.push(0);

        // Cb
        bytes.push(2);
        bytes.push(0x11);
        bytes.push(1);

        // Cr
        bytes.push(3);
        bytes.push(0x11);
        bytes.push(1);

    }

    /**
     * Write DHT segment with two DC and two AC tables.
     * @param {Array<number>} bytes Destination bytes.
     */
    writeDHT(bytes) {

        var dhtPayloadLength =
            (1 + 16 + this.dcLuminanceValues.length)
            + (1 + 16 + this.acLuminanceValues.length)
            + (1 + 16 + this.dcChrominanceValues.length)
            + (1 + 16 + this.acChrominanceValues.length);

        this.writeMarker(bytes, 0xC4);
        this.writeWord(bytes, 2 + dhtPayloadLength);

        // DC table 0
        bytes.push(0x00);
        for (var i = 1; i <= 16; i++)
            bytes.push(this.dcLuminanceCodeCounts[i] ?? 0);
        for (var d0 = 0; d0 < this.dcLuminanceValues.length; d0++)
            bytes.push(this.dcLuminanceValues[d0]);

        // AC table 0
        bytes.push(0x10);
        for (var j = 1; j <= 16; j++)
            bytes.push(this.acLuminanceCodeCounts[j] ?? 0);
        for (var a0 = 0; a0 < this.acLuminanceValues.length; a0++)
            bytes.push(this.acLuminanceValues[a0]);

        // DC table 1
        bytes.push(0x01);
        for (var k = 1; k <= 16; k++)
            bytes.push(this.dcChrominanceCodeCounts[k] ?? 0);
        for (var d1 = 0; d1 < this.dcChrominanceValues.length; d1++)
            bytes.push(this.dcChrominanceValues[d1]);

        // AC table 1
        bytes.push(0x11);
        for (var m = 1; m <= 16; m++)
            bytes.push(this.acChrominanceCodeCounts[m] ?? 0);
        for (var a1 = 0; a1 < this.acChrominanceValues.length; a1++)
            bytes.push(this.acChrominanceValues[a1]);

    }

    /**
     * Write SOS segment.
     * @param {Array<number>} bytes Destination bytes.
     */
    writeSOS(bytes) {

        this.writeMarker(bytes, 0xDA);
        this.writeWord(bytes, 12);
        bytes.push(3);

        // Y uses DC0/AC0
        bytes.push(1);
        bytes.push(0x00);

        // Cb uses DC1/AC1
        bytes.push(2);
        bytes.push(0x11);

        // Cr uses DC1/AC1
        bytes.push(3);
        bytes.push(0x11);

        bytes.push(0x00, 0x3F, 0x00);

    }

    /**
     * Build Y/Cb/Cr planes from RGBA bytes.
     * @param {Uint8Array} rgba RGBA bytes.
     * @param {number} width Image width.
     * @param {number} height Image height.
     * @returns {{ y: Float64Array, cb: Float64Array, cr: Float64Array }} Planes.
     */
    buildPlanes(rgba, width, height) {

        var pixelCount = (width * height);
        var yPlane = new Float64Array(pixelCount);
        var cbPlane = new Float64Array(pixelCount);
        var crPlane = new Float64Array(pixelCount);

        var sourceIndex = 0;

        for (var i = 0; i < pixelCount; i++) {

            var r = rgba[sourceIndex];
            var g = rgba[sourceIndex + 1];
            var b = rgba[sourceIndex + 2];

            var y = (0.299 * r) + (0.587 * g) + (0.114 * b);
            var cb = (-0.168736 * r) - (0.331264 * g) + (0.5 * b) + 128;
            var cr = (0.5 * r) - (0.418688 * g) - (0.081312 * b) + 128;

            yPlane[i] = Math.max(0, Math.min(255, y));
            cbPlane[i] = Math.max(0, Math.min(255, cb));
            crPlane[i] = Math.max(0, Math.min(255, cr));

            sourceIndex += 4;

        }

        return {
            y: yPlane,
            cb: cbPlane,
            cr: crPlane
        };

    }

    /**
     * Extract one 8x8 component block with edge padding.
     * @param {Float64Array} plane Component plane.
     * @param {number} width Image width.
     * @param {number} height Image height.
     * @param {number} blockX Block x-index.
     * @param {number} blockY Block y-index.
     * @returns {Float64Array} Centered 8x8 block values.
     */
    loadBlock(plane, width, height, blockX, blockY) {

        var block = new Float64Array(64);
        var xStart = (blockX * 8);
        var yStart = (blockY * 8);
        var index = 0;

        for (var y = 0; y < 8; y++) {

            var sampleY = yStart + y;
            if (sampleY >= height)
                sampleY = (height - 1);

            var rowOffset = (sampleY * width);

            for (var x = 0; x < 8; x++) {

                var sampleX = xStart + x;
                if (sampleX >= width)
                    sampleX = (width - 1);

                block[index++] = plane[rowOffset + sampleX] - 128;

            }

        }

        return block;

    }

    /**
     * Compute forward DCT coefficients for one 8x8 block.
     * @param {Float64Array} block Centered block samples.
     * @returns {Float64Array} DCT coefficients.
     */
    fdct(block) {

        var result = new Float64Array(64);

        for (var v = 0; v < 8; v++) {

            var cv = (v == 0) ? this.inverseSqrtTwo : 1;

            for (var u = 0; u < 8; u++) {

                var cu = (u == 0) ? this.inverseSqrtTwo : 1;
                var sum = 0;

                for (var y = 0; y < 8; y++) {
                    for (var x = 0; x < 8; x++) {
                        sum += block[(y * 8) + x] * this.cosineTable[u][x] * this.cosineTable[v][y];
                    }
                }

                result[(v * 8) + u] = (0.25 * cu * cv * sum);

            }

        }

        return result;

    }

    /**
     * Quantize DCT coefficients.
     * @param {Float64Array} dctCoefficients DCT coefficients.
     * @param {Uint8Array} quantizationTable Quantization table.
     * @returns {Int16Array} Quantized coefficients.
     */
    quantize(dctCoefficients, quantizationTable) {

        var output = new Int16Array(64);

        for (var i = 0; i < 64; i++) {
            output[i] = Math.round(dctCoefficients[i] / quantizationTable[i]);
        }

        return output;

    }

    /**
     * Encode one quantized block into entropy bitstream.
     * @param {Int16Array} block Quantized block.
     * @param {number} previousDC Previous DC value for this component.
     * @param {object} dcCodeMap DC symbol map.
     * @param {object} acCodeMap AC symbol map.
     * @param {BitWriter} bitWriter Bit writer.
     * @returns {number} Current block DC for differential coding.
     */
    encodeBlock(block, previousDC, dcCodeMap, acCodeMap, bitWriter) {

        var dc = block[0];
        var difference = (dc - previousDC);

        var dcSize = this.valueSize(difference);
        if (dcSize > 11) {
            difference >>= (dcSize - 11);
            dcSize = 11;
        }
        var dcHuffman = dcCodeMap[dcSize];
        if (dcHuffman == null) {
            throw new Error('JPEG encoder failed to resolve DC Huffman symbol.');
        }

        bitWriter.writeBits(dcHuffman.code, dcHuffman.length);

        if (dcSize > 0) {
            bitWriter.writeBits(this.valueBits(difference, dcSize), dcSize);
        }

        var zeroRun = 0;

        for (var k = 1; k < 64; k++) {

            var coefficient = block[JpegRgbaEncoder.ZigZag[k]];

            if (coefficient == 0) {
                zeroRun += 1;
                continue;
            }

            while (zeroRun > 15) {
                var zrl = acCodeMap[0xF0];
                bitWriter.writeBits(zrl.code, zrl.length);
                zeroRun -= 16;
            }

            var acSize = this.valueSize(coefficient);

            if (acSize > 10) {
                coefficient >>= (acSize - 10);
                acSize = 10;
            }

            var symbol = ((zeroRun << 4) | acSize);
            var acHuffman = acCodeMap[symbol];
            if (acHuffman == null) {
                throw new Error('JPEG encoder failed to resolve AC Huffman symbol.');
            }

            bitWriter.writeBits(acHuffman.code, acHuffman.length);
            bitWriter.writeBits(this.valueBits(coefficient, acSize), acSize);

            zeroRun = 0;

        }

        if (zeroRun > 0) {
            var eob = acCodeMap[0x00];
            bitWriter.writeBits(eob.code, eob.length);
        }

        return dc;

    }

    /**
     * Encode RGBA pixels to JPEG bytes.
     * @param {Uint8Array} rgba RGBA pixel bytes.
     * @param {number} width Frame width.
     * @param {number} height Frame height.
     * @param {{ quality?: number } | null} options Encoder options.
     * @returns {{ bytes: Uint8Array, mimeType: string, format: string }} Encoded payload.
     */
    encode(rgba, width, height, options = null) {

        if ((rgba == null) || (width == null) || (height == null)) {
            throw new Error('JPEG encoding requires RGBA bytes, width and height.');
        }

        var expectedLength = (width * height * 4);
        if (rgba.length < expectedLength) {
            throw new Error('JPEG encoding received an RGBA buffer shorter than width*height*4.');
        }

        var quality = this.resolveQuality(options?.quality);

        var luminanceTable = this.scaleQuantizationTable(
            JpegRgbaEncoder.BaseLuminanceQuantization,
            quality
        );

        var chrominanceTable = this.scaleQuantizationTable(
            JpegRgbaEncoder.BaseChrominanceQuantization,
            quality
        );

        var planes = this.buildPlanes(rgba, width, height);

        var blocksWide = Math.ceil(width / 8);
        var blocksHigh = Math.ceil(height / 8);

        var bytes = [];

        // SOI
        this.writeMarker(bytes, 0xD8);

        // APP0 JFIF
        this.writeAPP0(bytes);

        // DQT
        this.writeDQT(bytes, luminanceTable, chrominanceTable);

        // SOF0
        this.writeSOF0(bytes, width, height);

        // DHT
        this.writeDHT(bytes);

        // SOS
        this.writeSOS(bytes);

        var bitWriter = new BitWriter(bytes);

        var previousYDC = 0;
        var previousCbDC = 0;
        var previousCrDC = 0;

        for (var blockY = 0; blockY < blocksHigh; blockY++) {
            for (var blockX = 0; blockX < blocksWide; blockX++) {

                var yBlock = this.quantize(this.fdct(this.loadBlock(planes.y, width, height, blockX, blockY)), luminanceTable);
                var cbBlock = this.quantize(this.fdct(this.loadBlock(planes.cb, width, height, blockX, blockY)), chrominanceTable);
                var crBlock = this.quantize(this.fdct(this.loadBlock(planes.cr, width, height, blockX, blockY)), chrominanceTable);

                previousYDC = this.encodeBlock(yBlock, previousYDC, this.dcLuminanceCodeMap, this.acLuminanceCodeMap, bitWriter);
                previousCbDC = this.encodeBlock(cbBlock, previousCbDC, this.dcChrominanceCodeMap, this.acChrominanceCodeMap, bitWriter);
                previousCrDC = this.encodeBlock(crBlock, previousCrDC, this.dcChrominanceCodeMap, this.acChrominanceCodeMap, bitWriter);

            }
        }

        bitWriter.flush();

        // EOI
        this.writeMarker(bytes, 0xD9);

        return {
            bytes: new Uint8Array(bytes),
            mimeType: 'image/jpeg',
            format: 'jpeg'
        };

    }

    /**
     * Construct a JPEG RGBA encoder instance.
     */
    constructor() {

        this.inverseSqrtTwo = (1 / Math.sqrt(2));
        this.cosineTable = this.buildCosineTable();

        // Standard JPEG baseline Huffman tables.
        this.dcLuminanceCodeCounts = new Uint8Array([0, 0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
        this.dcLuminanceValues = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

        this.acLuminanceCodeCounts = new Uint8Array([0, 0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 125]);
        this.acLuminanceValues = new Uint8Array([
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12,
            0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
            0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0,
            0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0A, 0x16,
            0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39,
            0x3A, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
            0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
            0x6A, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79,
            0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98,
            0x99, 0x9A, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7,
            0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5,
            0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xD2, 0xD3, 0xD4,
            0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA,
            0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8,
            0xF9, 0xFA
        ]);

        this.dcChrominanceCodeCounts = new Uint8Array([0, 0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]);
        this.dcChrominanceValues = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

        this.acChrominanceCodeCounts = new Uint8Array([0, 0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 119]);
        this.acChrominanceValues = new Uint8Array([
            0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21,
            0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71,
            0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91,
            0xA1, 0xB1, 0xC1, 0x09, 0x23, 0x33, 0x52, 0xF0,
            0x15, 0x62, 0x72, 0xD1, 0x0A, 0x16, 0x24, 0x34,
            0xE1, 0x25, 0xF1, 0x17, 0x18, 0x19, 0x1A, 0x26,
            0x27, 0x28, 0x29, 0x2A, 0x35, 0x36, 0x37, 0x38,
            0x39, 0x3A, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
            0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58,
            0x59, 0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68,
            0x69, 0x6A, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78,
            0x79, 0x7A, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87,
            0x88, 0x89, 0x8A, 0x92, 0x93, 0x94, 0x95, 0x96,
            0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3, 0xA4, 0xA5,
            0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4,
            0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3,
            0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xD2,
            0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA,
            0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9,
            0xEA, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8,
            0xF9, 0xFA
        ]);

        this.dcLuminanceCodeMap = this.buildHuffmanCodeMap(this.dcLuminanceCodeCounts, this.dcLuminanceValues);
        this.acLuminanceCodeMap = this.buildHuffmanCodeMap(this.acLuminanceCodeCounts, this.acLuminanceValues);
        this.dcChrominanceCodeMap = this.buildHuffmanCodeMap(this.dcChrominanceCodeCounts, this.dcChrominanceValues);
        this.acChrominanceCodeMap = this.buildHuffmanCodeMap(this.acChrominanceCodeCounts, this.acChrominanceValues);

    }

}

class BitWriter {

    /**
     * Write bits to output stream.
     * @param {number} value Bits value.
     * @param {number} length Number of bits.
     */
    writeBits(value, length) {

        if (length <= 0)
            return;

        var maskedValue = value & ((1 << length) - 1);

        this.accumulator = ((this.accumulator << length) | maskedValue) >>> 0;
        this.accumulatorLength += length;

        while (this.accumulatorLength >= 8) {

            var byte = (this.accumulator >>> (this.accumulatorLength - 8)) & 0xFF;
            this.destination.push(byte);

            if (byte == 0xFF) {
                this.destination.push(0x00);
            }

            this.accumulatorLength -= 8;

            if (this.accumulatorLength > 0) {
                this.accumulator &= ((1 << this.accumulatorLength) - 1);
            }
            else {
                this.accumulator = 0;
            }

        }

    }

    /**
     * Flush remaining bits with JPEG-compliant 1-padding.
     */
    flush() {

        if (this.accumulatorLength <= 0)
            return;

        var padLength = (8 - this.accumulatorLength);
        this.writeBits((1 << padLength) - 1, padLength);

    }

    /**
     * Construct a bit writer.
     * @param {Array<number>} destination The destination byte array.
     */
    constructor(destination) {
        this.destination = destination;
        this.accumulator = 0;
        this.accumulatorLength = 0;
    }

}
