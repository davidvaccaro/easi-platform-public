//
// DimseAssociationReader.js
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

import Exception from '../environment/Exception.js';
import { GeneralErrorCodes } from '../environment/Exception.js';
import PartStreamReader from './PartStreamReader.js';

export default class DimseAssociationReader {

    /**
     * Indicates this reader is source-bound (association/transport lifecycle managed by reader).
     * @returns {boolean} TRUE.
     */
    get isSourceBound() {
        return true;
    }

    /**
     * Resolve the DIMSE source transport for one read call.
     * @param {object | null} options Optional read options.
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
     * Normalize one transport envelope to source + parse options.
     * @param {any} payload The transport payload envelope.
     * @param {object | null} options Read options.
     * @returns {{ source: any, readOptions: object }} Normalized source and read options.
     */
    normalizePayload(payload, options = null) {

        var readOptions = Object.assign({}, options || {});
        delete readOptions.transport;

        if ((payload != null) && (typeof payload === 'object')) {

            if (Object.prototype.hasOwnProperty.call(payload, 'contentType') == true) {
                readOptions.contentType = payload.contentType;
            }

            if (Object.prototype.hasOwnProperty.call(payload, 'contentLength') == true) {
                readOptions.contentLength = payload.contentLength;
            }

            if (Object.prototype.hasOwnProperty.call(payload, 'onEmit') == true) {
                readOptions.onEmit = payload.onEmit;
            }

            if (payload.stream != null) {
                return {
                    source: payload.stream,
                    readOptions
                };
            }

            if (payload.data != null) {
                return {
                    source: payload.data,
                    readOptions
                };
            }

            if (payload.source != null) {
                return {
                    source: payload.source,
                    readOptions
                };
            }

        }

        return {
            source: payload,
            readOptions
        };

    }

    /**
     * Read from one DIMSE source association.
     * @param {object | null} source DIMSE association/source options (overrides constructor default when provided).
     * @param {{ transport?: object, contentType?: string | object, contentLength?: number | string | null, onEmit?: Function | null } | null} options Optional read options.
     * @returns {Promise<object>} Parser result.
     */
    async read(source = null, options = null) {

        const transport = this.resolveTransport(options);
        if ((transport == null) || (typeof transport.read !== 'function')) {
            throw new Exception('Invalid DIMSE source transport.', GeneralErrorCodes.InvalidParameter);
        }

        const association = (source != null) ? source : this._association;
        const payload = await transport.read(association, options);
        const normalized = this.normalizePayload(payload, options);

        if (normalized.source == null) {
            throw new Exception('Invalid DIMSE source payload. Missing data/stream source.', GeneralErrorCodes.GeneralError);
        }

        return this._partReader.read(normalized.source, normalized.readOptions);

    }

    /**
     * Start one source-bound DIMSE listener lifecycle when transport supports start().
     * @param {object | null} source DIMSE association/source options (overrides constructor default when provided).
     * @param {object | null} options Optional read/start options.
     * @returns {Promise<object | null>} Optional listener metadata.
     */
    async start(source = null, options = null) {

        const transport = this.resolveTransport(options);
        if ((transport == null) || (typeof transport.read !== "function")) {
            throw new Exception('Invalid DIMSE source transport.', GeneralErrorCodes.InvalidParameter);
        }

        if (typeof transport.start !== "function")
            return null;

        const association = (source != null) ? source : this._association;
        return await transport.start(association, options);

    }

    /**
     * Stop one source-bound DIMSE listener lifecycle when transport supports close()/stop().
     * @param {object | null} source DIMSE association/source options.
     * @param {object | null} options Optional read/stop options.
     */
    async stop(source = null, options = null) {

        const transport = this.resolveTransport(options);
        if (transport == null)
            return;

        if (typeof transport.close === "function") {
            await transport.close();
            return;
        }

        if (typeof transport.stop === "function") {
            await transport.stop(source, options);
        }

    }

    /**
     * Set the parser.
     * @param {object} parser The parser.
     */
    set parser(parser) {
        this._partReader.parser = parser;
    }

    /**
     * Get the parser.
     * @returns {object | null} The parser.
     */
    get parser() {
        return this._partReader.parser;
    }

    /**
     * Set the onPart callback.
     * @param {Function | null} onPart The onPart callback.
     */
    set onPart(onPart) {
        this._partReader.onPart = onPart;
    }

    /**
     * Get the onPart callback.
     * @returns {Function | null} The onPart callback.
     */
    get onPart() {
        return this._partReader.onPart;
    }

    /**
     * Construct one DIMSE association reader.
     * @param {object | null} association Default DIMSE source association options.
     * @param {object | null} transport DIMSE source transport adapter.
     * @param {PartStreamReader | null} partReader Optional part reader.
     */
    constructor(association = null, transport = null, partReader = null) {
        this._association = association;
        this._transport = transport;
        this._partReader = (partReader != null) ? partReader : new PartStreamReader();
    }

}
