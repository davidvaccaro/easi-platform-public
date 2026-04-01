//
// DimseDestinationTransport.js
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
