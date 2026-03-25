//
// DimseTransportContract.js - 1.0.0
//
// DIMSE Transport Contract Helper Class
//

export default class DimseTransportContract {

    /**
     * Determine if one value is byte-like.
     * @param {unknown} value Candidate value.
     * @returns {boolean} TRUE when the value is byte-like.
     */
    static isByteLike(value) {

        if (value == null)
            return false;

        if (value instanceof Uint8Array)
            return true;

        if (value instanceof ArrayBuffer)
            return true;

        if (ArrayBuffer.isView(value))
            return true;

        if (Array.isArray(value))
            return true;

        return false;

    }

    /**
     * Normalize one value to Uint8Array where possible.
     * @param {unknown} value The value to normalize.
     * @returns {Uint8Array | null} The normalized bytes or null when not byte-like.
     */
    static toBytes(value) {

        if (value == null)
            return null;

        if (value instanceof Uint8Array)
            return value;

        if (value instanceof ArrayBuffer)
            return new Uint8Array(value);

        if (ArrayBuffer.isView(value))
            return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

        if (Array.isArray(value))
            return Uint8Array.from(value);

        return null;

    }

    /**
     * Infer content length from one source value where possible.
     * @param {unknown} source The source value.
     * @returns {number | null} The inferred content length.
     */
    static inferContentLength(source) {
        const bytes = this.toBytes(source);
        return (bytes != null) ? bytes.length : null;
    }

    /**
     * Create one normalized DIMSE source read envelope.
     * @param {unknown} source The source payload (bytes/stream/reader).
     * @param {{ contentType?: string | object, contentLength?: number | string | null, onEmit?: Function | null, metadata?: object } | null} options Envelope options.
     * @returns {{ source: unknown, contentType: string | object, contentLength: number | string | null, onEmit?: Function | null, metadata?: object }} Read envelope.
     */
    static createReadEnvelope(source, options = null) {

        if (options == null) {
            options = {};
        }

        return {
            source: source,
            contentType: (options.contentType != null) ? options.contentType : "application/dicom",
            contentLength: (options.contentLength != null)
                ? options.contentLength
                : this.inferContentLength(source),
            onEmit: (options.onEmit !== undefined) ? options.onEmit : undefined,
            metadata: (options.metadata != null) ? options.metadata : undefined
        };

    }

    /**
     * Create one normalized DIMSE destination write result.
     * @param {{ ok?: boolean, status?: string | number, dimseStatus?: string | number, bytesWritten?: number, association?: object, metadata?: object }} options Result options.
     * @returns {{ ok: boolean, status: string | number, dimseStatus: string | number, bytesWritten: number, association?: object, metadata?: object }} Write result.
     */
    static createWriteResult(options = null) {

        if (options == null) {
            options = {};
        }

        return {
            ok: (options.ok !== false),
            status: (options.status != null) ? options.status : "Success",
            dimseStatus: (options.dimseStatus != null) ? options.dimseStatus : 0x0000,
            bytesWritten: Number(options.bytesWritten || 0),
            association: (options.association != null) ? options.association : undefined,
            metadata: (options.metadata != null) ? options.metadata : undefined
        };

    }

}
