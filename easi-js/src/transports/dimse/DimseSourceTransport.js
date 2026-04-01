//
// DimseSourceTransport.js
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

export default class DimseSourceTransport {

    /**
     * Read one DIMSE source payload.
     * Implementations should return one transport envelope object or one direct stream/byte source.
     *
     * Recommended envelope contract:
     * {
     *   source?: Uint8Array | ArrayBuffer | DataView | Array<number> | ReadableStream | ReadableStreamDefaultReader<Uint8Array>,
     *   data?: Uint8Array | ArrayBuffer | DataView | Array<number>,
     *   stream?: ReadableStream | ReadableStreamDefaultReader<Uint8Array>,
     *   contentType?: string | object,          // defaults to "application/dicom"
     *   contentLength?: number | string | null,
     *   onEmit?: Function | null,               // optional per-read emit callback override
     *   metadata?: object
     * }
     *
     * The reader will consume `source`, then `data`, then `stream`.
     * @param {object | null} association DIMSE association/source options.
     * @param {object | null} options Optional read options.
     * @returns {Promise<object | Uint8Array | ReadableStream | ReadableStreamDefaultReader<Uint8Array>>} Source payload envelope.
     */
    async read(association, options = null) {
        throw new Exception(
            "DIMSE source transport is not implemented.",
            GeneralErrorCodes.NotImplemented
        );
    }

}
