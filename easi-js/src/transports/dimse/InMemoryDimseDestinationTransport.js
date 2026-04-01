//
// InMemoryDimseDestinationTransport.js
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

import DimseDestinationTransport from "./DimseDestinationTransport.js";
import DimseTransportContract from "./DimseTransportContract.js";

export default class InMemoryDimseDestinationTransport extends DimseDestinationTransport {

    /**
     * Clear all captured writes.
     * @returns {InMemoryDimseDestinationTransport} Current transport instance.
     */
    clear() {
        this._writes = [];
        return this;
    }

    /**
     * Get captured write records.
     * @returns {Array<object>} Captured write records.
     */
    get writes() {
        return this._writes;
    }

    /**
     * Write one payload to the in-memory DIMSE destination.
     * @param {object | null} association DIMSE association/destination options.
     * @param {Uint8Array | object} source Source payload to write.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} Normalized write result.
     */
    async write(association, source, options = null) {

        const sourceBytes = DimseTransportContract.toBytes(source);
        const bytesWritten = (sourceBytes != null)
            ? sourceBytes.length
            : Number(source?.bytesWritten || 0);

        const record = {
            association: association || null,
            source: source,
            sourceBytes: (sourceBytes != null) ? new Uint8Array(sourceBytes) : null,
            options: options || null,
            bytesWritten: bytesWritten,
            index: this._writes.length
        };

        this._writes.push(record);

        return DimseTransportContract.createWriteResult({
            ok: true,
            status: "Success",
            dimseStatus: 0x0000,
            association: association || null,
            bytesWritten: bytesWritten,
            metadata: {
                writeIndex: record.index
            }
        });

    }

    /**
     * Construct one in-memory DIMSE destination transport.
     */
    constructor() {
        super();
        this._writes = [];
    }

}
