//
// StubDimseSourceTransport.js - 1.0.0
//
// Stub DIMSE Source Transport Class
//

import Exception from "../../environment/Exception.js";
import { GeneralErrorCodes } from "../../environment/Exception.js";
import DimseSourceTransport from "./DimseSourceTransport.js";

export default class StubDimseSourceTransport extends DimseSourceTransport {

    /**
     * Always throws, indicating DIMSE source transport is currently a stub.
     * @param {object | null} association DIMSE association/source options.
     * @param {object | null} options Optional read options.
     * @returns {Promise<never>}
     */
    async read(association, options = null) {
        throw new Exception(
            "DIMSE source transport is not implemented yet. Provide a custom DIMSE source transport.",
            GeneralErrorCodes.NotImplemented
        );
    }

}
