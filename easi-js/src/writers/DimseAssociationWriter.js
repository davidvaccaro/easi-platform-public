//
// DimseAssociationWriter.js - 1.0.0
//
// DimseAssociationWriter Class
//

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';

export default class DimseAssociationWriter {

    /**
     * Determine whether one value is byte-like payload.
     * @param {unknown} value Candidate payload value.
     * @returns {boolean} TRUE when the value can represent bytes.
     */
    isByteLike(value) {

        if (value == null)
            return false;

        if (value instanceof Uint8Array)
            return true;

        if (value instanceof ArrayBuffer)
            return true;

        if (ArrayBuffer.isView(value))
            return true;

        if (Array.isArray(value)) {
            for (var i = 0; i < value.length; i++) {
                if ((typeof value[i] !== 'number') || (Number.isFinite(value[i]) == false))
                    return false;
            }
            return true;
        }

        return false;

    }

    /**
     * Determine whether source represents a batch of independent byte payloads.
     * @param {unknown} source Candidate source payload.
     * @returns {boolean} TRUE when source is a batch payload.
     */
    isBytePayloadBatch(source) {

        if (Array.isArray(source) == false)
            return false;

        if (source.length == 0)
            return false;

        // Plain number arrays represent one byte payload, not a batch.
        var isNumberArray = true;
        for (var i = 0; i < source.length; i++) {
            if ((typeof source[i] !== 'number') || (Number.isFinite(source[i]) == false)) {
                isNumberArray = false;
                break;
            }
        }
        if (isNumberArray == true)
            return false;

        for (var j = 0; j < source.length; j++) {
            if (this.isByteLike(source[j]) == false)
                return false;
        }

        return true;

    }

    /**
     * Resolve the DIMSE destination transport for one write call.
     * @param {object | null} options Optional write options.
     * @returns {object} The transport.
     */
    resolveTransport(options = null) {

        if ((options != null)
            && (typeof options === 'object')
            && (options.transport != null)) {
            return options.transport;
        }

        return this._transport;

    }

    /**
     * Remove transport-adapter options before forwarding to transport write.
     * @param {object | null} options Optional write options.
     * @returns {object | null} Sanitized options.
     */
    sanitizeOptions(options = null) {

        if (options == null)
            return null;

        var sanitized = Object.assign({}, options);
        delete sanitized.transport;

        return sanitized;

    }

    /**
     * Write one payload to a DIMSE destination.
     * @param {object | null} association DIMSE destination association options.
     * @param {Uint8Array | object} source The source payload.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} Write result metadata.
     */
    async write(association, source, options = null) {

        const transport = this.resolveTransport(options);
        if ((transport == null) || (typeof transport.write !== 'function')) {
            throw new Exception('Invalid DIMSE destination transport.', GeneralErrorCodes.InvalidParameter);
        }

        var writeOptions = this.sanitizeOptions(options);

        if (this.isBytePayloadBatch(source) == true) {

            var results = [];
            var bytesWritten = 0;

            for (var index = 0; index < source.length; index++) {
                var partResult = await transport.write(association, source[index], writeOptions);
                results.push(partResult);
                bytesWritten += Number(partResult?.bytesWritten || 0);

                if (partResult?.ok !== true)
                    break;
            }

            var last = (results.length > 0) ? results[results.length - 1] : null;
            return {
                ok: results.every((item) => (item?.ok === true)),
                status: last?.status ?? 'Success',
                dimseStatus: last?.dimseStatus ?? 0x0000,
                bytesWritten,
                association: association ?? undefined,
                metadata: {
                    count: source.length,
                    results
                }
            };

        }

        return transport.write(association, source, writeOptions);

    }

    /**
     * Construct one DIMSE association writer.
     * @param {object | null} transport DIMSE destination transport adapter.
     */
    constructor(transport = null) {
        this._transport = transport;
    }

}
