//
// PipelineOperationResult.js
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

/**
 * Standardized operation result envelope for non-materialized and writer operations.
 */
export default class PipelineOperationResult {

    /**
     * Build one terminal operation result envelope.
     * @param {string} operation Terminal operation name (for example `toDicomData`).
     * @param {number} bytesWritten Total bytes written/emitted.
     * @param {Uint8Array | null} payload Materialized payload when present.
     * @param {object | null} output Optional raw output object.
     * @returns {object} Standardized operation result.
     */
    static fromTerminal(operation, bytesWritten = 0, payload = null, output = null) {

        var normalizedBytesWritten = Number(bytesWritten ?? 0);
        if (Number.isFinite(normalizedBytesWritten) == false) {
            normalizedBytesWritten = 0;
        }

        return {
            resultType: "PipelineOperationResult",
            version: "1.0",
            operation: operation,
            category: "terminal",
            materialized: (payload instanceof Uint8Array),
            bytesWritten: Math.max(0, Math.trunc(normalizedBytesWritten)),
            payload: (payload instanceof Uint8Array) ? payload : null,
            output: output
        };

    }

    /**
     * Build one writer operation result envelope.
     * Preserves writer-specific fields while adding a stable top-level contract.
     * @param {string} writerName Writer type name.
     * @param {*} writerOutput Raw writer output.
     * @returns {object} Standardized writer result envelope.
     */
    static fromWriter(writerName, writerOutput) {

        var source = ((writerOutput != null) && (typeof writerOutput === "object"))
            ? writerOutput
            : {};

        var payload = source.body;
        if ((payload instanceof Uint8Array) == false) {
            payload = null;
        }

        var normalizedBytesWritten = Number(source.bytesWritten ?? 0);
        if (Number.isFinite(normalizedBytesWritten) == false) {
            normalizedBytesWritten = 0;
        }

        return Object.assign({}, source, {
            resultType: "PipelineOperationResult",
            version: "1.0",
            operation: "into",
            category: "writer",
            writer: writerName,
            materialized: (payload instanceof Uint8Array),
            bytesWritten: Math.max(0, Math.trunc(normalizedBytesWritten)),
            payload: payload,
            output: writerOutput
        });

    }

}

