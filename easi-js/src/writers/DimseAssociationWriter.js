//
// DimseAssociationWriter.js - 1.0.0
//
// DimseAssociationWriter Class
//

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';
import StubDimseDestinationTransport from '../transports/dimse/StubDimseDestinationTransport.js';

export default class DimseAssociationWriter {

    /**
     * Resolve the DIMSE destination transport for one write call.
     * @param {object | null} options Optional write options.
     * @returns {object} The transport.
     */
    resolveTransport(options = null) {

        if ((options != null)
            && (typeof options === 'object')
            && (options.transport != null)) {
            return options.transport;
        }

        return this._transport;

    }

    /**
     * Remove transport-adapter options before forwarding to transport write.
     * @param {object | null} options Optional write options.
     * @returns {object | null} Sanitized options.
     */
    sanitizeOptions(options = null) {

        if (options == null)
            return null;

        var sanitized = Object.assign({}, options);
        delete sanitized.transport;

        return sanitized;

    }

    /**
     * Write one payload to a DIMSE destination.
     * @param {object | null} association DIMSE destination association options.
     * @param {Uint8Array | object} source The source payload.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} Write result metadata.
     */
    async write(association, source, options = null) {

        const transport = this.resolveTransport(options);
        if ((transport == null) || (typeof transport.write !== 'function')) {
            throw new Exception('Invalid DIMSE destination transport.', GeneralErrorCodes.InvalidParameter);
        }

        return transport.write(association, source, this.sanitizeOptions(options));

    }

    /**
     * Construct one DIMSE association writer.
     * @param {object | null} transport Optional DIMSE destination transport adapter.
     */
    constructor(transport = null) {
        this._transport = (transport != null) ? transport : new StubDimseDestinationTransport();
    }

}
