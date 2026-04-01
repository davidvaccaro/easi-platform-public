//
// DimseClient.js - 1.0.0
//
// DIMSE Client Class
//

import Exception from "../environment/Exception.js";
import { GeneralErrorCodes } from "../environment/Exception.js";
import NodeDimseQueryRetrieveSourceTransport from "../transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";

export default class DimseClient {

    /**
     * Resolve one effective association from default/client and per-call overrides.
     * @param {object | null} associationOverride Optional association override.
     * @returns {object | null} Effective association object.
     */
    resolveAssociation(associationOverride = null) {

        if (associationOverride == null) {
            return this._association;
        }

        if (this._association == null) {
            return associationOverride;
        }

        if ((typeof this._association !== "object") || (typeof associationOverride !== "object")) {
            return associationOverride;
        }

        var merged = Object.assign({}, this._association, associationOverride);

        if (((this._association?.query != null) || (associationOverride?.query != null))
            && (typeof this._association?.query === "object")
            && (typeof associationOverride?.query === "object")) {
            merged.query = Object.assign({}, this._association.query, associationOverride.query);
        }

        return merged;

    }

    /**
     * Execute DIMSE C-ECHO against the configured association.
     * @param {object | null} options Optional echo options. Use `options.association` to override association for this call.
     * @returns {Promise<object>} Echo response/result object.
     */
    async echo(options = null) {

        var normalizedOptions = ((options != null) && (typeof options === "object"))
            ? Object.assign({}, options)
            : {};
        var associationOverride = (normalizedOptions.association != null)
            ? normalizedOptions.association
            : null;
        delete normalizedOptions.association;

        var association = this.resolveAssociation(associationOverride);
        if ((association == null) || (typeof association !== "object")) {
            throw new Exception(
                "DIMSE C-ECHO requires an association object.",
                GeneralErrorCodes.InvalidParameter
            );
        }

        if ((this._transport == null) || (typeof this._transport.echo !== "function")) {
            throw new Exception(
                "DIMSE client transport does not support echo(association, options).",
                GeneralErrorCodes.NotImplemented
            );
        }

        return await this._transport.echo(association, normalizedOptions);

    }

    /**
     * Construct one DIMSE client.
     * @param {object | null} association Default DIMSE association options.
     * @param {object | null} transport DIMSE client transport implementation.
     */
    constructor(association = null, transport = null) {
        this._association = association;
        this._transport = transport || new NodeDimseQueryRetrieveSourceTransport();
    }

}
