//
// DimseSourceTransport.js - 1.0.0
//
// DIMSE Source Transport Interface Class
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
