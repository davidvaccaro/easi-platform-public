//
// DimseDestinationTransport.js - 1.0.0
//
// DIMSE Destination Transport Interface Class
//

import Exception from "../../environment/Exception.js";
import { GeneralErrorCodes } from "../../environment/Exception.js";

export default class DimseDestinationTransport {

    /**
     * Write one payload to a DIMSE destination.
     *
     * Recommended write result contract:
     * {
     *   ok: boolean,
     *   status?: string | number,
     *   dimseStatus?: string | number,          // DIMSE status code/value
     *   bytesWritten?: number,
     *   association?: object,
     *   metadata?: object
     * }
     *
     * Implementations should return `ok=false` only for transport-level negative acknowledgements
     * that were handled and converted to a non-throwing response. Throw when the pipeline should fail.
     * @param {object | null} association DIMSE association/destination options.
     * @param {Uint8Array | object} source Source payload to write.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} Write result metadata.
     */
    async write(association, source, options = null) {
        throw new Exception(
            "DIMSE destination transport is not implemented.",
            GeneralErrorCodes.NotImplemented
        );
    }

}
