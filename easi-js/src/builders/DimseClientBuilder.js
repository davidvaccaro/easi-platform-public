//
// DimseClientBuilder.js - 1.0.0
//
// DIMSE Client Builder Class
//

import DimseClient from "../clients/DimseClient.js";
import NodeDimseQueryRetrieveSourceTransport from "../transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";

export default class DimseClientBuilder {

    /**
     * Create a new DIMSE client builder.
     * @returns {DimseClientBuilder} A new DIMSE client builder.
     */
    static builder() {
        return new DimseClientBuilder();
    }

    /**
     * Determine if one value is a plain object.
     * @param {unknown} value Candidate value.
     * @returns {boolean} TRUE when value is plain object.
     */
    isPlainObject(value) {
        return ((value != null) && (typeof value === "object") && (Array.isArray(value) == false));
    }

    /**
     * Configure the default association object for the DIMSE client.
     * @param {object | null} association DIMSE association options.
     * @returns {DimseClientBuilder} The current builder.
     */
    withAssociation(association = null) {
        this.association = association;
        return this;
    }

    /**
     * Configure the association via one association builder object.
     * @param {object} associationBuilder Association builder with `build()` method.
     * @returns {DimseClientBuilder} The current builder.
     */
    withAssociationBuilder(associationBuilder) {

        if ((associationBuilder == null) || (typeof associationBuilder.build !== "function")) {
            throw new Error("withAssociationBuilder(...) requires an object with build() function.");
        }

        this.association = associationBuilder.build();
        return this;

    }

    /**
     * Configure one DIMSE client transport.
     * Transport should implement `echo(association, options)`.
     * @param {object | null} transport Transport implementation.
     * @returns {DimseClientBuilder} The current builder.
     */
    withTransport(transport = null) {
        this.transport = transport;
        return this;
    }

    /**
     * Build one DIMSE client from configured builder state.
     * @returns {DimseClient} Built DIMSE client instance.
     */
    build() {

        if ((this.association != null) && (this.isPlainObject(this.association) == false)) {
            throw new Error("DIMSE client association must be an object or null.");
        }

        var association = (this.association != null)
            ? Object.assign({}, this.association)
            : null;
        if ((association != null) && this.isPlainObject(association.query)) {
            association.query = Object.assign({}, association.query);
        }

        var transport = this.transport || new NodeDimseQueryRetrieveSourceTransport();
        if (typeof transport.echo !== "function") {
            throw new Error("DIMSE client transport must implement echo(association, options).");
        }

        return new DimseClient(association, transport);

    }

    /**
     * Construct one DIMSE client builder.
     */
    constructor() {
        this.association = null;
        this.transport = null;
    }

}
