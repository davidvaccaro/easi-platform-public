//
// DimseAssociationWriter.js
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
            var warnings = results.filter((item) => (item?.ok === true) && ((Number(item?.dimseStatus) & 0xF000) === 0xB000));
            var failed = last?.ok !== true;
            return {
                ok: results.every((item) => (item?.ok === true)),
                status: failed ? (last?.status ?? 'Failure') : (warnings.length > 0 ? 'Warning' : (last?.status ?? 'Success')),
                dimseStatus: failed ? (last?.dimseStatus ?? 0xC000) : (warnings[0]?.dimseStatus ?? last?.dimseStatus ?? 0x0000),
                bytesWritten,
                association: association ?? undefined,
                metadata: {
                    count: source.length,
                    attempted: results.length,
                    completed: results.filter((item) => (item?.ok === true) && ((Number(item?.dimseStatus) & 0xF000) !== 0xB000)).length,
                    failed: results.filter((item) => (item?.ok !== true)).length,
                    warning: warnings.length,
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
