//
// InMemoryDimseDestinationTransport.js - 1.0.0
//
// In-Memory DIMSE Destination Transport Class
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
