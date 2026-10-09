//
// DimseAssociationBuilder.js
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

export default class DimseAssociationBuilder {

    /**
     * Create a new DIMSE association builder.
     * @returns {DimseAssociationBuilder} A new DIMSE association builder.
     */
    static builder() {
        return new DimseAssociationBuilder();
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
     * Normalize and validate one host value.
     * @param {unknown} host Host value.
     * @returns {string} Normalized host.
     */
    normalizeHost(host) {

        var normalized = String(host ?? "").trim();
        if (normalized.length == 0) {
            throw new Error("DIMSE association host must be a non-empty string.");
        }

        return normalized;

    }

    /**
     * Normalize and validate one TCP port value.
     * @param {unknown} port Port value.
     * @returns {number} Normalized integer port.
     */
    normalizePort(port) {

        var numeric = Number(port);
        if ((Number.isInteger(numeric) == false) || (numeric <= 0) || (numeric > 65535)) {
            throw new Error("DIMSE association port must be an integer in range 1-65535.");
        }

        return numeric;

    }

    /**
     * Normalize one AE-title value.
     * @param {unknown} aeTitle AE-title value.
     * @param {string} label Validation label.
     * @returns {string} Normalized AE-title.
     */
    normalizeAeTitle(aeTitle, label) {

        var normalized = String(aeTitle ?? "").trim();
        if (normalized.length == 0) {
            throw new Error(`${label} must be a non-empty string.`);
        }

        if (normalized.length > 16) {
            throw new Error(`${label} must be 16 characters or fewer.`);
        }

        if (normalized.indexOf("\\") >= 0) {
            throw new Error(`${label} cannot include backslash (\\).`);
        }

        for (var index = 0; index < normalized.length; index++) {

            var charCode = normalized.charCodeAt(index);
            if ((charCode < 0x20) || (charCode > 0x7E)) {
                throw new Error(`${label} must contain printable ASCII characters only.`);
            }

        }

        return normalized;

    }

    /**
     * Normalize one query object.
     * @param {unknown} query Query object.
     * @returns {object} Normalized query object.
     */
    normalizeQuery(query) {

        if (this.isPlainObject(query) == false) {
            throw new Error("DIMSE association query must be an object.");
        }

        var normalized = Object.assign({}, query);

        if (normalized.moveDestinationAeTitle != null) {
            normalized.moveDestinationAeTitle = this.normalizeAeTitle(
                normalized.moveDestinationAeTitle,
                "DIMSE query moveDestinationAeTitle"
            );
        }

        if (normalized.moveStoreCalledAeTitle != null) {
            normalized.moveStoreCalledAeTitle = this.normalizeAeTitle(
                normalized.moveStoreCalledAeTitle,
                "DIMSE query moveStoreCalledAeTitle"
            );
        }

        return normalized;

    }

    /**
     * Normalize one verification object.
     * @param {unknown} verification Verification object.
     * @returns {object} Normalized verification object.
     */
    normalizeVerification(verification) {

        if (this.isPlainObject(verification) == false) {
            throw new Error("DIMSE association verification must be an object.");
        }

        var normalized = Object.assign({}, verification);

        if (normalized.messageId != null) {
            var messageId = Number(normalized.messageId);
            if ((Number.isInteger(messageId) == false) || (messageId <= 0) || (messageId > 65535)) {
                throw new Error("DIMSE verification messageId must be an integer in range 1-65535.");
            }
            normalized.messageId = messageId;
        }

        return normalized;

    }

    /**
     * Normalize and validate one TLS configuration object.
     * @param {boolean | object | null} tlsConfig TLS configuration.
     * @param {string} label Validation label.
     * @returns {boolean | object} Normalized TLS config.
     */
    normalizeTlsConfig(tlsConfig, label) {

        if ((tlsConfig == null) || (tlsConfig === false))
            return false;

        if (tlsConfig === true)
            return {};

        if (this.isPlainObject(tlsConfig) == false) {
            throw new Error(`${label} must be boolean, object, or null.`);
        }

        var normalized = Object.assign({}, tlsConfig);

        var hasCert = (normalized.cert != null);
        var hasKey = (normalized.key != null);

        if (hasCert != hasKey) {
            throw new Error(`${label} requires both cert and key when mTLS client identity is configured.`);
        }

        if ((normalized.rejectUnauthorized != null) && (typeof normalized.rejectUnauthorized !== "boolean")) {
            throw new Error(`${label}.rejectUnauthorized must be boolean when provided.`);
        }

        return normalized;

    }

    /**
     * Normalize one positive timeout in milliseconds.
     * @param {number | null} timeoutMs Timeout value.
     * @param {string} label Validation label.
     * @returns {number} Normalized timeout.
     */
    normalizeTimeout(timeoutMs, label) {
        var numeric = Number(timeoutMs);
        if ((Number.isInteger(numeric) == false) || (numeric <= 0) || (numeric > 2147483647)) {
            throw new Error(`${label} must be an integer in range 1-2147483647.`);
        }
        return numeric;
    }

    /**
     * Normalize one DIMSE max PDU length.
     * @param {number | null} maxPduLength Max PDU length in bytes.
     * @returns {number} Normalized max PDU length.
     */
    normalizeMaxPduLength(maxPduLength) {
        var numeric = Number(maxPduLength);
        if ((Number.isInteger(numeric) == false) || (numeric < 8) || (numeric > 0xFFFFFFFF)) {
            throw new Error("DIMSE maxPduLength must be an integer in range 8-4294967295.");
        }
        return numeric;
    }

    /**
     * Normalize one move-store policy object.
     * @param {object | null} policy Move-store policy object.
     * @returns {object} Normalized move-store policy.
     */
    normalizeMoveStorePolicy(policy) {

        if (this.isPlainObject(policy) == false) {
            throw new Error("DIMSE move-store policy must be an object.");
        }

        var normalized = Object.assign({}, policy);

        if (normalized.associationTimeoutMs != null) {
            normalized.associationTimeoutMs = this.normalizeTimeout(
                normalized.associationTimeoutMs,
                "DIMSE moveStorePolicy.associationTimeoutMs"
            );
        }

        if (normalized.maxActiveAssociations != null) {
            var maxActiveAssociations = Number(normalized.maxActiveAssociations);
            if ((Number.isSafeInteger(maxActiveAssociations) == false) || (maxActiveAssociations <= 0)) {
                throw new Error("DIMSE moveStorePolicy.maxActiveAssociations must be a positive integer.");
            }
            normalized.maxActiveAssociations = maxActiveAssociations;
        }

        if ((normalized.rejectWithAssociationRj != null)
            && (typeof normalized.rejectWithAssociationRj !== "boolean")) {
            throw new Error("DIMSE moveStorePolicy.rejectWithAssociationRj must be boolean.");
        }

        return normalized;

    }

    /**
     * Ensure transport TLS options object exists for option-level setters.
     * @returns {object} Mutable transport TLS options object.
     */
    ensureTransportTlsOptions() {

        if (this.transportTlsConfigured == false) {
            this.withTransportTls(true);
        }

        if ((this.transportTls == null)
            || (this.transportTls === false)
            || (this.isPlainObject(this.transportTls) == false)) {
            this.transportTls = {};
        }

        return this.transportTls;

    }

    /**
     * Ensure move-store TLS options object exists for option-level setters.
     * @returns {object} Mutable move-store TLS options object.
     */
    ensureMoveStoreTlsOptions() {

        if (this.moveStoreTlsConfigured == false) {
            this.withMoveStoreTls(true);
        }

        if ((this.moveStoreTls == null)
            || (this.moveStoreTls === false)
            || (this.isPlainObject(this.moveStoreTls) == false)) {
            this.moveStoreTls = {};
        }

        return this.moveStoreTls;

    }

    /**
     * Ensure query options object exists for option-level setters.
     * @returns {object} Mutable query options object.
     */
    ensureQueryOptions() {

        if (this.queryConfigured == false) {
            this.withQuery({});
        }

        if (this.isPlainObject(this.query) == false) {
            this.query = {};
        }

        return this.query;

    }

    /**
     * Ensure verification options object exists for option-level setters.
     * @returns {object} Mutable verification options object.
     */
    ensureVerificationOptions() {

        if (this.verificationConfigured == false) {
            this.withVerification({});
        }

        if (this.isPlainObject(this.verification) == false) {
            this.verification = {};
        }

        return this.verification;

    }

    /**
     * Configure a base association object.
     * @param {object | null} association Base association.
     * @param {boolean} clone Indicates if base association should be cloned during build.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withBaseAssociation(association, clone = true) {
        this.baseAssociation = association;
        this.cloneBaseAssociation = (clone !== false);
        return this;
    }

    /**
     * Configure association host.
     * @param {string} host Association host.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withHost(host) {
        this.hostConfigured = true;
        this.host = host;
        return this;
    }

    /**
     * Configure association port.
     * @param {number} port Association TCP port.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withPort(port) {
        this.portConfigured = true;
        this.port = port;
        return this;
    }

    /**
     * Configure association calling AE-title.
     * @param {string} aeTitle Calling AE-title.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withCallingAeTitle(aeTitle) {
        this.callingAeTitleConfigured = true;
        this.callingAeTitle = aeTitle;
        return this;
    }

    /**
     * Configure association called AE-title.
     * @param {string} aeTitle Called AE-title.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withCalledAeTitle(aeTitle) {
        this.calledAeTitleConfigured = true;
        this.calledAeTitle = aeTitle;
        return this;
    }

    /**
     * Configure association query descriptor.
     * @param {{
     *   operation?: 'c-find' | 'c-get' | 'c-move',
     *   queryRetrieveModel?: 'study-root' | 'patient-root',
     *   performFind?: boolean,
     *   studyInstanceUid?: string,
     *   seriesInstanceUid?: string,
     *   sopInstanceUid?: string,
     *   patientId?: string,
     *   accessionNumber?: string,
     *   messageIdStart?: number,
     *   priority?: number,
     *   moveDestinationAeTitle?: string,
     *   moveStoreHost?: string,
     *   moveStorePort?: number,
     *   moveStoreCalledAeTitle?: string,
     *   moveStoreTls?: boolean | { cert?: unknown, key?: unknown, ca?: unknown, passphrase?: string, rejectUnauthorized?: boolean }
     * }} query Query descriptor.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withQuery(query = {}) {
        if (this.isPlainObject(query) == false) {
            throw new Error("withQuery(...) requires query object.");
        }
        this.queryConfigured = true;
        this.query = Object.assign({}, query);
        return this;
    }

    /**
     * Configure one query option.
     * @param {string} name Query option name.
     * @param {unknown} value Query option value.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withQueryOption(name, value) {
        if ((typeof name !== "string") || (name.length == 0))
            throw new Error("withQueryOption(name, value) requires a non-empty option name.");
        this.ensureQueryOptions()[name] = value;
        return this;
    }

    /**
     * Configure association verification descriptor.
     * @param {{ messageId?: number }} verification Verification descriptor.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withVerification(verification = {}) {
        if (this.isPlainObject(verification) == false) {
            throw new Error("withVerification(...) requires verification object.");
        }
        this.verificationConfigured = true;
        this.verification = Object.assign({}, verification);
        return this;
    }

    /**
     * Configure one verification option.
     * @param {string} name Verification option name.
     * @param {unknown} value Verification option value.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withVerificationOption(name, value) {
        if ((typeof name !== "string") || (name.length == 0))
            throw new Error("withVerificationOption(name, value) requires a non-empty option name.");
        this.ensureVerificationOptions()[name] = value;
        return this;
    }

    /**
     * Configure DIMSE C-ECHO message id.
     * @param {number} messageId DIMSE C-ECHO message id.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withVerificationMessageId(messageId) {
        return this.withVerificationOption("messageId", messageId);
    }

    /**
     * Configure C-MOVE destination AE-title.
     * @param {string} aeTitle Destination AE-title.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withMoveDestinationAeTitle(aeTitle) {
        this.ensureQueryOptions().moveDestinationAeTitle = this.normalizeAeTitle(
            aeTitle,
            "DIMSE query moveDestinationAeTitle"
        );
        return this;
    }

    /**
     * Configure local move-store listener called AE-title.
     * @param {string} aeTitle Listener called AE-title.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withMoveStoreCalledAeTitle(aeTitle) {
        this.ensureQueryOptions().moveStoreCalledAeTitle = this.normalizeAeTitle(
            aeTitle,
            "DIMSE query moveStoreCalledAeTitle"
        );
        return this;
    }

    /**
     * Configure outbound DIMSE transport TLS.
     * @param {boolean | { cert?: unknown, key?: unknown, ca?: unknown, passphrase?: string, rejectUnauthorized?: boolean, servername?: string } | null} tlsConfig TLS config (`true` => default object, `false` => disabled).
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withTransportTls(tlsConfig = true) {
        this.transportTlsConfigured = true;
        this.transportTls = tlsConfig;
        return this;
    }

    /**
     * Configure one transport TLS option.
     * @param {string} name Option key.
     * @param {unknown} value Option value.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withTransportTlsOption(name, value) {
        if ((typeof name !== "string") || (name.length == 0))
            throw new Error("withTransportTlsOption(name, value) requires a non-empty option name.");
        this.ensureTransportTlsOptions()[name] = value;
        return this;
    }

    /**
     * Configure outbound mTLS transport settings.
     * @param {{ cert: unknown, key: unknown, ca?: unknown, passphrase?: string, rejectUnauthorized?: boolean, servername?: string }} tlsOptions mTLS options.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withTransportMutualTls(tlsOptions = null) {

        if (this.isPlainObject(tlsOptions) == false) {
            throw new Error("withTransportMutualTls(...) requires TLS options object.");
        }

        if ((tlsOptions.cert == null) || (tlsOptions.key == null)) {
            throw new Error("withTransportMutualTls(...) requires both cert and key.");
        }

        var options = Object.assign({}, tlsOptions);
        if (options.rejectUnauthorized == null) {
            options.rejectUnauthorized = true;
        }

        return this.withTransportTls(options);

    }

    /**
     * Configure C-MOVE store-listener TLS.
     * @param {boolean | object | null} tlsConfig TLS config (`true` => default object, `false` => disabled).
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withMoveStoreTls(tlsConfig = true) {
        this.moveStoreTlsConfigured = true;
        this.moveStoreTls = tlsConfig;
        return this;
    }

    /**
     * Configure one move-store TLS option.
     * @param {string} name Option key.
     * @param {unknown} value Option value.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withMoveStoreTlsOption(name, value) {
        if ((typeof name !== "string") || (name.length == 0))
            throw new Error("withMoveStoreTlsOption(name, value) requires a non-empty option name.");
        this.ensureMoveStoreTlsOptions()[name] = value;
        return this;
    }

    /**
     * Configure move-store listener mTLS settings.
     * @param {{ cert: unknown, key: unknown, ca?: unknown, passphrase?: string, rejectUnauthorized?: boolean }} tlsOptions mTLS options.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withMoveStoreMutualTls(tlsOptions = null) {

        if (this.isPlainObject(tlsOptions) == false) {
            throw new Error("withMoveStoreMutualTls(...) requires TLS options object.");
        }

        if ((tlsOptions.cert == null) || (tlsOptions.key == null)) {
            throw new Error("withMoveStoreMutualTls(...) requires both cert and key.");
        }

        var options = Object.assign({}, tlsOptions);
        if (options.rejectUnauthorized == null) {
            options.rejectUnauthorized = true;
        }

        return this.withMoveStoreTls(options);

    }

    /**
     * Configure DIMSE association timeout (ms).
     * @param {number} timeoutMs Timeout in milliseconds.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withAssociationTimeoutMs(timeoutMs) {
        this.associationTimeoutMsConfigured = true;
        this.associationTimeoutMs = timeoutMs;
        return this;
    }

    /**
     * Configure DIMSE association max PDU length (bytes).
     * @param {number} maxPduLength Max PDU length in bytes.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withMaxPdu(maxPduLength) {
        this.maxPduLengthConfigured = true;
        this.maxPduLength = maxPduLength;
        return this;
    }

    /**
     * Configure DIMSE association max PDU length (bytes).
     * Alias for withMaxPdu(...).
     * @param {number} maxPduLength Max PDU length in bytes.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withMaxPduLength(maxPduLength) {
        return this.withMaxPdu(maxPduLength);
    }

    /**
     * Configure move-store policy object.
     * @param {object} policy Move-store policy.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withMoveStorePolicy(policy = {}) {
        if (this.isPlainObject(policy) == false) {
            throw new Error("withMoveStorePolicy(...) requires policy object.");
        }
        this.moveStorePolicyConfigured = true;
        this.moveStorePolicy = Object.assign({}, policy);
        return this;
    }

    /**
     * Configure one move-store policy option.
     * @param {string} name Policy option name.
     * @param {unknown} value Policy option value.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withMoveStorePolicyOption(name, value) {
        if ((typeof name !== "string") || (name.length == 0))
            throw new Error("withMoveStorePolicyOption(name, value) requires a non-empty option name.");
        if (this.moveStorePolicyConfigured == false) {
            this.moveStorePolicyConfigured = true;
            this.moveStorePolicy = {};
        }
        this.moveStorePolicy[name] = value;
        return this;
    }

    /**
     * Configure move-store association timeout policy (ms).
     * @param {number} timeoutMs Timeout in milliseconds.
     * @returns {DimseAssociationBuilder} The current builder.
     */
    withMoveStoreAssociationTimeoutMs(timeoutMs) {
        return this.withMoveStorePolicyOption("associationTimeoutMs", timeoutMs);
    }

    /**
     * Build one DIMSE association object from configured builder state.
     * @returns {object} DIMSE association options object.
     */
    build() {

        var association = {};

        if (this.baseAssociation != null) {

            if (this.isPlainObject(this.baseAssociation) == false) {
                throw new Error("withBaseAssociation(...) requires association object or null.");
            }

            association = (this.cloneBaseAssociation == true)
                ? Object.assign({}, this.baseAssociation)
                : this.baseAssociation;

        }

        if (this.hostConfigured == true) {
            association.host = this.normalizeHost(this.host);
        }

        if (this.portConfigured == true) {
            association.port = this.normalizePort(this.port);
        }

        if (this.callingAeTitleConfigured == true) {
            association.callingAeTitle = this.normalizeAeTitle(this.callingAeTitle, "DIMSE association callingAeTitle");
        }

        if (this.calledAeTitleConfigured == true) {
            association.calledAeTitle = this.normalizeAeTitle(this.calledAeTitle, "DIMSE association calledAeTitle");
        }

        if (this.queryConfigured == true) {
            association.query = this.normalizeQuery(this.query);
        }

        if (this.verificationConfigured == true) {
            association.verification = this.normalizeVerification(this.verification);
        }
        else if (association.verification != null) {
            association.verification = this.normalizeVerification(association.verification);
        }

        if (this.transportTlsConfigured == true) {
            association.tls = this.normalizeTlsConfig(this.transportTls, "DIMSE transport TLS");
        }

        if (this.associationTimeoutMsConfigured == true) {
            association.associationTimeoutMs = this.normalizeTimeout(
                this.associationTimeoutMs,
                "DIMSE associationTimeoutMs"
            );
        }

        if (this.maxPduLengthConfigured == true) {
            association.maxPduLength = this.normalizeMaxPduLength(this.maxPduLength);
        }

        if ((this.moveStoreTlsConfigured == true) || (this.moveStorePolicyConfigured == true)) {

            var baseQuery = this.isPlainObject(association.query) ? association.query : {};
            var query = Object.assign({}, baseQuery);

            if (this.moveStoreTlsConfigured == true) {
                query.moveStoreTls = this.normalizeTlsConfig(
                    this.moveStoreTls,
                    "DIMSE move-store TLS"
                );
            }

            if (this.moveStorePolicyConfigured == true) {
                query.moveStorePolicy = this.normalizeMoveStorePolicy(this.moveStorePolicy);
            }

            association.query = this.normalizeQuery(query);

        }
        else if (association.query != null) {
            association.query = this.normalizeQuery(association.query);
        }

        return association;

    }

    /**
     * Construct a DIMSE association builder.
     */
    constructor() {
        this.baseAssociation = null;
        this.cloneBaseAssociation = true;

        this.hostConfigured = false;
        this.host = null;
        this.portConfigured = false;
        this.port = null;
        this.callingAeTitleConfigured = false;
        this.callingAeTitle = null;
        this.calledAeTitleConfigured = false;
        this.calledAeTitle = null;
        this.queryConfigured = false;
        this.query = null;
        this.verificationConfigured = false;
        this.verification = null;

        this.transportTlsConfigured = false;
        this.transportTls = null;
        this.associationTimeoutMsConfigured = false;
        this.associationTimeoutMs = null;
        this.maxPduLengthConfigured = false;
        this.maxPduLength = null;
        this.moveStoreTlsConfigured = false;
        this.moveStoreTls = null;
        this.moveStorePolicyConfigured = false;
        this.moveStorePolicy = {};
    }

}
