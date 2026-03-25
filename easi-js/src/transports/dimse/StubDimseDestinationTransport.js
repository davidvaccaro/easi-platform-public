//
// StubDimseDestinationTransport.js - 1.0.0
//
// Stub DIMSE Destination Transport Class
//

import Exception from "../../environment/Exception.js";
import { GeneralErrorCodes } from "../../environment/Exception.js";
import DimseDestinationTransport from "./DimseDestinationTransport.js";

export default class StubDimseDestinationTransport extends DimseDestinationTransport {

    /**
     * Always throws, indicating DIMSE destination transport is currently a stub.
     * @param {object | null} association DIMSE association/destination options.
     * @param {Uint8Array | object} source Source payload.
     * @param {object | null} options Optional write options.
     * @returns {Promise<never>}
     */
    async write(association, source, options = null) {
        throw new Exception(
            "DIMSE destination transport is not implemented yet. Provide a custom DIMSE destination transport.",
            GeneralErrorCodes.NotImplemented
        );
    }

}
