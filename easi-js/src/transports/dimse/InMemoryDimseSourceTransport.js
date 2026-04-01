//
// InMemoryDimseSourceTransport.js
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
import DimseSourceTransport from "./DimseSourceTransport.js";
import DimseTransportContract from "./DimseTransportContract.js";

export default class InMemoryDimseSourceTransport extends DimseSourceTransport {

    /**
     * Enqueue one pre-built read envelope.
     * @param {object} envelope The read envelope.
     * @returns {InMemoryDimseSourceTransport} Current transport instance.
     */
    enqueueEnvelope(envelope) {
        this._queue.push(envelope);
        return this;
    }

    /**
     * Enqueue one source payload as a normalized DIMSE read envelope.
     * @param {unknown} source The source payload.
     * @param {{ contentType?: string | object, contentLength?: number | string | null, onEmit?: Function | null, metadata?: object } | null} options Envelope options.
     * @returns {InMemoryDimseSourceTransport} Current transport instance.
     */
    enqueueSource(source, options = null) {
        this._queue.push(DimseTransportContract.createReadEnvelope(source, options));
        return this;
    }

    /**
     * Clear all queued source envelopes.
     * @returns {InMemoryDimseSourceTransport} Current transport instance.
     */
    clear() {
        this._queue = [];
        return this;
    }

    /**
     * Read one queued source envelope.
     * @param {object | null} association DIMSE association/source options.
     * @param {object | null} options Optional read options.
     * @returns {Promise<object>} Read envelope.
     */
    async read(association, options = null) {

        if (this._queue.length == 0) {
            throw new Exception(
                "In-memory DIMSE source queue is empty.",
                GeneralErrorCodes.GeneralError
            );
        }

        var envelope = this._queue.shift();
        if ((envelope == null) || (typeof envelope !== "object")) {
            envelope = DimseTransportContract.createReadEnvelope(envelope, null);
        }

        // Ensure a normalized source envelope shape.
        if ((envelope.source == null) && (envelope.data == null) && (envelope.stream == null)) {
            throw new Exception(
                "Invalid in-memory DIMSE source envelope. Missing source/data/stream.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        return {
            source: (envelope.source != null) ? envelope.source : ((envelope.data != null) ? envelope.data : envelope.stream),
            contentType: (envelope.contentType != null) ? envelope.contentType : "application/dicom",
            contentLength: (envelope.contentLength != null)
                ? envelope.contentLength
                : DimseTransportContract.inferContentLength(
                    (envelope.source != null) ? envelope.source : envelope.data
                ),
            onEmit: (envelope.onEmit !== undefined) ? envelope.onEmit : undefined,
            metadata: Object.assign({}, envelope.metadata || {}, {
                sourceAssociation: association || null
            })
        };

    }

    /**
     * Construct one in-memory DIMSE source transport.
     * @param {Array<unknown> | null} sources Optional initial source payloads.
     */
    constructor(sources = null) {

        super();
        this._queue = [];

        if (Array.isArray(sources) == true) {
            for (var i = 0; i < sources.length; i++) {
                this.enqueueSource(sources[i]);
            }
        }

    }

}
