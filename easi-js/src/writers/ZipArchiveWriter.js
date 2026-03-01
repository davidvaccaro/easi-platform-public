//
// ZipArchiveWriter.js - 1.0.0
//
// ZIP Archive Writer Class
//

export default class ZipArchiveWriter {

    /**
     * Determine if the value is Promise-like.
     * @param {*} value The value to test.
     * @returns {boolean} TRUE when thenable.
     */
    isThenable(value) {
        return ((value != null) && (typeof value.then === 'function'));
    }

    /**
     * Normalize one value to bytes.
     * @param {Uint8Array | ArrayBuffer | DataView | Array<number>} value The source value.
     * @returns {Uint8Array} Normalized bytes.
     */
    toBytes(value) {

        if (value == null)
            return new Uint8Array(0);

        if (value instanceof Uint8Array)
            return value;

        if (value instanceof ArrayBuffer)
            return new Uint8Array(value);

        if (ArrayBuffer.isView(value))
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

        if (Array.isArray(value))
            return Uint8Array.from(value);

        return (new TextEncoder()).encode(String(value));

    }

    /**
     * Encode text as UTF-8 bytes.
     * @param {string} value The text value.
     * @returns {Uint8Array} Encoded bytes.
     */
    encodeText(value) {
        return (new TextEncoder()).encode(String(value ?? ''));
    }

    /**
     * Create a little-endian uint16 byte array.
     * @param {number} value The value.
     * @returns {Uint8Array} Encoded bytes.
     */
    u16le(value) {
        return new Uint8Array([
            value & 0xFF,
            (value >>> 8) & 0xFF
        ]);
    }

    /**
     * Create a little-endian uint32 byte array.
     * @param {number} value The value.
     * @returns {Uint8Array} Encoded bytes.
     */
    u32le(value) {
        return new Uint8Array([
            value & 0xFF,
            (value >>> 8) & 0xFF,
            (value >>> 16) & 0xFF,
            (value >>> 24) & 0xFF
        ]);
    }

    /**
     * Compute CRC32 for a byte array.
     * @param {Uint8Array} bytes The input bytes.
     * @returns {number} CRC32 value.
     */
    crc32(bytes) {

        var crc = 0xFFFFFFFF;

        for (var i = 0; i < bytes.length; i++) {
            crc = (crc >>> 8) ^ this.crcTable[(crc ^ bytes[i]) & 0xFF];
        }

        return (crc ^ 0xFFFFFFFF) >>> 0;

    }

    /**
     * Convert a Date to DOS date/time values.
     * @param {Date} date The source date.
     * @returns {{ time: number, date: number }} DOS time/date.
     */
    toDosDateTime(date = null) {

        var value = (date instanceof Date) ? date : new Date();

        var year = value.getFullYear();
        if (year < 1980)
            year = 1980;

        var month = value.getMonth() + 1;
        var day = value.getDate();
        var hour = value.getHours();
        var minute = value.getMinutes();
        var second = Math.floor(value.getSeconds() / 2);

        var dosTime = ((hour & 0x1F) << 11)
            | ((minute & 0x3F) << 5)
            | (second & 0x1F);

        var dosDate = (((year - 1980) & 0x7F) << 9)
            | ((month & 0x0F) << 5)
            | (day & 0x1F);

        return {
            time: dosTime,
            date: dosDate
        };

    }

    /**
     * Build one local file header.
     * @param {object} entry The entry descriptor.
     * @returns {Uint8Array} Local header bytes.
     */
    buildLocalHeader(entry) {

        var nameBytes = entry.nameBytes;

        var bytes = new Uint8Array(30 + nameBytes.length);
        var view = new DataView(bytes.buffer);

        view.setUint32(0, 0x04034B50, true); // local file header signature
        view.setUint16(4, 20, true);         // version needed to extract
        view.setUint16(6, 0, true);          // general purpose bit flag
        view.setUint16(8, 0, true);          // compression method: store
        view.setUint16(10, entry.dosTime, true);
        view.setUint16(12, entry.dosDate, true);
        view.setUint32(14, entry.crc32, true);
        view.setUint32(18, entry.size, true); // compressed size
        view.setUint32(22, entry.size, true); // uncompressed size
        view.setUint16(26, nameBytes.length, true);
        view.setUint16(28, 0, true);          // extra length

        bytes.set(nameBytes, 30);

        return bytes;

    }

    /**
     * Build one central directory file header.
     * @param {object} entry The entry descriptor.
     * @returns {Uint8Array} Central directory header bytes.
     */
    buildCentralHeader(entry) {

        var nameBytes = entry.nameBytes;

        var bytes = new Uint8Array(46 + nameBytes.length);
        var view = new DataView(bytes.buffer);

        view.setUint32(0, 0x02014B50, true); // central file header signature
        view.setUint16(4, 20, true);         // version made by
        view.setUint16(6, 20, true);         // version needed to extract
        view.setUint16(8, 0, true);          // flags
        view.setUint16(10, 0, true);         // compression: store
        view.setUint16(12, entry.dosTime, true);
        view.setUint16(14, entry.dosDate, true);
        view.setUint32(16, entry.crc32, true);
        view.setUint32(20, entry.size, true);
        view.setUint32(24, entry.size, true);
        view.setUint16(28, nameBytes.length, true);
        view.setUint16(30, 0, true);         // extra length
        view.setUint16(32, 0, true);         // file comment length
        view.setUint16(34, 0, true);         // disk number start
        view.setUint16(36, 0, true);         // internal file attrs
        view.setUint32(38, 0, true);         // external file attrs
        view.setUint32(42, entry.localOffset, true);

        bytes.set(nameBytes, 46);

        return bytes;

    }

    /**
     * Build End of Central Directory record.
     * @param {number} entryCount Number of archive entries.
     * @param {number} centralSize Central directory size.
     * @param {number} centralOffset Central directory offset.
     * @returns {Uint8Array} EOCD bytes.
     */
    buildEndOfCentralDirectory(entryCount, centralSize, centralOffset) {

        var bytes = new Uint8Array(22);
        var view = new DataView(bytes.buffer);

        view.setUint32(0, 0x06054B50, true); // EOCD signature
        view.setUint16(4, 0, true);          // number of this disk
        view.setUint16(6, 0, true);          // central dir disk
        view.setUint16(8, entryCount, true); // entries on this disk
        view.setUint16(10, entryCount, true);
        view.setUint32(12, centralSize, true);
        view.setUint32(16, centralOffset, true);
        view.setUint16(20, 0, true);         // comment length

        return bytes;

    }

    /**
     * Emit one chunk.
     * @param {Uint8Array} chunk The chunk.
     */
    async emit(chunk) {

        if ((chunk == null) || (chunk.length == 0))
            return;

        this.bytesWritten += chunk.length;

        if (this.onChunk != null) {
            var result = this.onChunk(chunk);
            if (this.isThenable(result) == true) {
                await result;
            }
        }

        if (this.collectOutput == true) {
            this.outputChunks.push(chunk);
        }

    }

    /**
     * Build one output byte array from collected chunks.
     * @returns {Uint8Array} Combined bytes.
     */
    toOutputBytes() {

        if (this.outputChunks.length == 0)
            return new Uint8Array(0);

        if (this.outputChunks.length == 1)
            return this.outputChunks[0];

        var output = new Uint8Array(this.bytesWritten);
        var offset = 0;

        for (var i = 0; i < this.outputChunks.length; i++) {
            output.set(this.outputChunks[i], offset);
            offset += this.outputChunks[i].length;
        }

        return output;

    }

    /**
     * Normalize an archive entry path.
     * @param {string} path The raw path.
     * @returns {string} Normalized path.
     */
    normalizePath(path) {

        var value = String(path ?? '')
            .replace(/\\/g, '/')
            .replace(/^\/+/, '')
            .replace(/\/+/g, '/');

        return value;

    }

    /**
     * Add one file entry to the archive.
     * @param {string} path Entry path.
     * @param {Uint8Array | ArrayBuffer | DataView | Array<number>} data Entry bytes.
     * @param {{ modifiedAt?: Date }} options Optional file options.
     * @returns {Promise<object>} Entry descriptor.
     */
    async addFile(path, data, options = null) {

        if (this.finalized == true)
            throw new Error('Cannot add ZIP entries after finalize.');

        var normalizedPath = this.normalizePath(path);
        var payload = this.toBytes(data);
        var pathBytes = this.encodeText(normalizedPath);
        var dos = this.toDosDateTime(options?.modifiedAt ?? null);

        var entry = {
            path: normalizedPath,
            nameBytes: pathBytes,
            size: payload.length,
            crc32: this.crc32(payload),
            dosTime: dos.time,
            dosDate: dos.date,
            localOffset: this.offset
        };

        var localHeader = this.buildLocalHeader(entry);

        await this.emit(localHeader);
        await this.emit(payload);

        this.offset += localHeader.length + payload.length;
        this.entries.push(entry);

        return {
            path: entry.path,
            size: entry.size,
            crc32: entry.crc32,
            offset: entry.localOffset
        };

    }

    /**
     * Finalize the ZIP archive and emit central directory records.
     * @returns {Promise<Uint8Array | number>} Archive bytes when collecting, otherwise total bytes written.
     */
    async finalize() {

        if (this.finalized == true) {
            return this.collectOutput ? this.toOutputBytes() : this.bytesWritten;
        }

        var centralOffset = this.offset;
        var centralSize = 0;

        for (var i = 0; i < this.entries.length; i++) {
            var centralHeader = this.buildCentralHeader(this.entries[i]);
            await this.emit(centralHeader);
            centralSize += centralHeader.length;
        }

        this.offset += centralSize;

        var eocd = this.buildEndOfCentralDirectory(this.entries.length, centralSize, centralOffset);
        await this.emit(eocd);
        this.offset += eocd.length;

        this.finalized = true;

        return this.collectOutput ? this.toOutputBytes() : this.bytesWritten;

    }

    /**
     * Construct one ZIP archive writer.
     * @param {{ onChunk?: Function, collectOutput?: boolean } | null} options Writer options.
     */
    constructor(options = null) {

        options = options ?? {};

        this.onChunk = options.onChunk ?? null;
        this.collectOutput = (options.collectOutput != null)
            ? (options.collectOutput == true)
            : (this.onChunk == null);

        this.entries = [];
        this.outputChunks = [];
        this.offset = 0;
        this.bytesWritten = 0;
        this.finalized = false;

        this.crcTable = new Uint32Array(256);
        for (var i = 0; i < 256; i++) {
            var value = i;
            for (var bit = 0; bit < 8; bit++) {
                if ((value & 1) == 1)
                    value = (value >>> 1) ^ 0xEDB88320;
                else
                    value = (value >>> 1);
            }
            this.crcTable[i] = value >>> 0;
        }

    }

}
