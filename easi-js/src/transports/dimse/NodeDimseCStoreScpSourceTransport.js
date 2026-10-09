//
// NodeDimseCStoreScpSourceTransport.js
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
import NodeDimseQueryRetrieveSourceTransport from "./NodeDimseQueryRetrieveSourceTransport.js";

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default class NodeDimseCStoreScpSourceTransport extends DimseSourceTransport {

    /**
     * Resolve one listen option from read-call options, association object, constructor defaults, and fallback.
     * @param {object | null} association The association/listener options.
     * @param {object | null} options The per-read options.
     * @param {string} name The option key.
     * @param {*} fallback The fallback value.
     * @returns {*} Resolved value.
     */
    resolveOption(association, options, name, fallback = null) {

        if ((options != null) && (options[name] != null))
            return options[name];

        if ((association != null) && (association[name] != null))
            return association[name];

        if ((this._defaultAssociation != null) && (this._defaultAssociation[name] != null))
            return this._defaultAssociation[name];

        if ((this._options != null) && (this._options[name] != null))
            return this._options[name];

        // Explicitly started listeners retain their settings for later reads.
        if ((this._listenerSettings != null) && (this._listenerSettings[name] != null))
            return this._listenerSettings[name];

        return fallback;

    }

    /**
     * Normalize one read/listen configuration.
     * @param {object | null} association Association/listener options.
     * @param {object | null} options Read options.
     * @returns {object} Normalized settings.
     */
    resolveSettings(association, options = null) {

        var host = String(this.resolveOption(association, options, "host", "127.0.0.1"));
        var port = Number(this.resolveOption(association, options, "port", 11112));
        var calledAeTitle = this.resolveOption(association, options, "calledAeTitle", null);
        var waitForFirstInstanceMs = Number(this.resolveOption(association, options, "waitForFirstInstanceMs", 30000));
        var batchIdleGraceMs = Number(this.resolveOption(association, options, "batchIdleGraceMs", 250));
        var maxBatchInstances = Number(this.resolveOption(association, options, "maxBatchInstances", 0));
        var compactThreshold = Number(this.resolveOption(association, options, "compactThreshold", 256));
        var boundary = this.resolveOption(association, options, "boundary", null);
        var maxPduLength = Number(this.resolveOption(association, options, "maxPduLength", 16384));
        var maxCommandBytes = Number(this.resolveOption(association, options, "maxCommandBytes", 1024 * 1024));
        var maxDataSetBytes = Number(this.resolveOption(association, options, "maxDataSetBytes", 512 * 1024 * 1024));
        var maxTotalDataSetBytes = Number(this.resolveOption(association, options, "maxTotalDataSetBytes", 512 * 1024 * 1024));
        var storageSopClassUids = this.resolveOption(association, options, "storageSopClassUids", null);
        var storageTransferSyntaxUids = this.resolveOption(association, options, "storageTransferSyntaxUids", null);
        var moveStoreTls = this.resolveOption(association, options, "moveStoreTls", null);
        if (moveStoreTls == null) {
            moveStoreTls = this.resolveOption(association, options, "tls", null);
        }
        var onConcern = this.resolveOption(association, options, "onConcern", null);

        var policy = Object.assign({}, this._listenerSettings?.policy || {});
        var policyFromOption = this.resolveOption(association, options, "moveStorePolicy", null);
        if ((policyFromOption != null) && (typeof policyFromOption === "object")) {
            policy = Object.assign(policy, policyFromOption);
        }
        var policyAlias = this.resolveOption(association, options, "policy", null);
        if ((policyAlias != null) && (typeof policyAlias === "object")) {
            policy = Object.assign(policy, policyAlias);
        }

        var explicitPolicyKeys = [
            "allowedCallingAeTitles",
            "deniedCallingAeTitles",
            "allowedRemoteHosts",
            "deniedRemoteHosts",
            "maxActiveAssociations",
            "associationTimeoutMs",
            "rejectWithAssociationRj"
        ];

        for (var policyIndex = 0; policyIndex < explicitPolicyKeys.length; policyIndex++) {
            var policyKey = explicitPolicyKeys[policyIndex];
            var explicitValue = this.resolveOption(association, options, policyKey, null);
            if (explicitValue != null) {
                policy[policyKey] = explicitValue;
            }
        }

        if ((typeof host !== "string") || (host.length == 0))
            throw new Exception("Invalid DIMSE C-STORE SCP listen host.", GeneralErrorCodes.InvalidParameter);

        if ((Number.isInteger(port) == false) || (port < 0) || (port > 65535))
            throw new Exception("Invalid DIMSE C-STORE SCP listen port.", GeneralErrorCodes.InvalidParameter);

        if ((typeof calledAeTitle != "string") || (calledAeTitle.trim().length == 0)
            || (calledAeTitle.length > 16) || /[^\x20-\x7e]|\\/.test(calledAeTitle))
            throw new Exception("Invalid DIMSE C-STORE SCP called AE Title.", GeneralErrorCodes.InvalidParameter);

        if ((Number.isInteger(waitForFirstInstanceMs) == false) || (waitForFirstInstanceMs <= 0) || (waitForFirstInstanceMs > 2147483647))
            throw new Exception("Invalid DIMSE C-STORE SCP waitForFirstInstanceMs.", GeneralErrorCodes.InvalidParameter);

        if ((Number.isInteger(batchIdleGraceMs) == false) || (batchIdleGraceMs < 0) || (batchIdleGraceMs > 2147483647))
            throw new Exception("Invalid DIMSE C-STORE SCP batchIdleGraceMs.", GeneralErrorCodes.InvalidParameter);

        if ((Number.isInteger(maxBatchInstances) == false) || (maxBatchInstances < 0))
            throw new Exception("Invalid DIMSE C-STORE SCP maxBatchInstances.", GeneralErrorCodes.InvalidParameter);

        if ((Number.isInteger(compactThreshold) == false) || (compactThreshold < 1))
            throw new Exception("Invalid DIMSE C-STORE SCP compactThreshold.", GeneralErrorCodes.InvalidParameter);

        if ((Number.isInteger(maxPduLength) == false) || (maxPduLength < 8) || (maxPduLength > 0xFFFFFFFF))
            throw new Exception("Invalid DIMSE C-STORE SCP maxPduLength.", GeneralErrorCodes.InvalidParameter);

        for (var limit of [maxCommandBytes, maxDataSetBytes, maxTotalDataSetBytes]) {
            if ((Number.isSafeInteger(limit) == false) || (limit <= 0))
                throw new Exception("Invalid DIMSE C-STORE SCP byte limit.", GeneralErrorCodes.InvalidParameter);
        }

        if ((policy.maxActiveAssociations != null)
            && ((Number.isInteger(Number(policy.maxActiveAssociations)) == false) || (Number(policy.maxActiveAssociations) < 0)))
            throw new Exception("Invalid DIMSE C-STORE SCP maxActiveAssociations.", GeneralErrorCodes.InvalidParameter);

        if ((policy.associationTimeoutMs != null)
            && ((Number.isInteger(Number(policy.associationTimeoutMs)) == false) || (Number(policy.associationTimeoutMs) <= 0)
                || (Number(policy.associationTimeoutMs) > 2147483647)))
            throw new Exception("Invalid DIMSE C-STORE SCP associationTimeoutMs.", GeneralErrorCodes.InvalidParameter);

        for (var uids of [storageSopClassUids, storageTransferSyntaxUids]) {
            if ((uids != null) && ((Array.isArray(uids) == false)
                || uids.some((uid) => (typeof uid != "string") || (uid.length > 64) || /^[0-9]+(\.[0-9]+)+$/.test(uid) == false)))
                throw new Exception("Invalid DIMSE C-STORE SCP SOP or transfer syntax UID list.", GeneralErrorCodes.InvalidParameter);
        }

        if ((onConcern != null) && (typeof onConcern !== "function"))
            throw new Exception("Invalid DIMSE C-STORE SCP onConcern callback.", GeneralErrorCodes.InvalidParameter);

        if ((boundary == null) || (String(boundary).length == 0)) {
            boundary = `easi-dimse-cstore-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
        }

        return {
            host,
            port,
            calledAeTitle: String(calledAeTitle).trim(),
            waitForFirstInstanceMs,
            batchIdleGraceMs,
            maxBatchInstances,
            compactThreshold,
            boundary: String(boundary),
            maxPduLength,
            maxCommandBytes,
            maxDataSetBytes,
            maxTotalDataSetBytes,
            storageSopClassUids: Array.isArray(storageSopClassUids) ? storageSopClassUids.slice() : [],
            storageTransferSyntaxUids: Array.isArray(storageTransferSyntaxUids) ? storageTransferSyntaxUids.slice() : [],
            moveStoreTls,
            onConcern,
            policy
        };

    }

    /**
     * Determine if current listener matches requested settings.
     * @param {object} settings Requested settings.
     * @returns {boolean} TRUE when listener is already compatible.
     */
    isListenerCompatible(settings) {

        if (this._moveStore == null)
            return false;

        if (this._listenerSettings == null)
            return false;

        if (this._listenerSettings.host !== settings.host)
            return false;

        if (this._listenerSettings.calledAeTitle !== settings.calledAeTitle)
            return false;

        if ((this._listenerSettings.maxPduLength !== settings.maxPduLength)
            || (this._listenerSettings.maxCommandBytes !== settings.maxCommandBytes)
            || (this._listenerSettings.maxDataSetBytes !== settings.maxDataSetBytes)
            || (this._listenerSettings.maxTotalDataSetBytes !== settings.maxTotalDataSetBytes)
            || (this._listenerSettings.moveStoreTls !== settings.moveStoreTls)
            || (JSON.stringify(this._listenerSettings.storageSopClassUids) !== JSON.stringify(settings.storageSopClassUids))
            || (JSON.stringify(this._listenerSettings.storageTransferSyntaxUids) !== JSON.stringify(settings.storageTransferSyntaxUids))
            || (JSON.stringify(this._listenerSettings.policy) !== JSON.stringify(settings.policy)))
            return false;

        // Port 0 means "ephemeral". Once started, listener port will be concrete.
        if ((settings.port > 0) && (Number(this._moveStore.port) !== Number(settings.port)))
            return false;

        return true;

    }

    /**
     * Start/reuse the C-STORE SCP listener.
     * @param {object | null} association Association/listener options.
     * @param {object | null} options Read/listener options.
     * @returns {Promise<object>} Listener metadata.
     */
    async start(association = null, options = null) {

        var generation = this._generation;
        var precedingStart = this._startPromise || Promise.resolve();
        var startup = precedingStart.catch(() => {}).then(() => this.startListener(association, options, generation));
        this._startPromise = startup;
        try {
            return await startup;
        }
        finally {
            if (this._startPromise === startup)
                this._startPromise = null;
        }

    }

    /**
     * Initialize one listener after any preceding startup has settled.
     * @param {object | null} association Association/listener options.
     * @param {object | null} options Read/listener options.
     * @param {number} generation Listener lifecycle at the time startup was requested.
     * @returns {Promise<object>} Listener metadata.
     */
    async startListener(association, options, generation) {

        if (generation !== this._generation)
            throw new Exception("DIMSE C-STORE SCP listener was closed during startup.", GeneralErrorCodes.GeneralError);

        var settings = this.resolveSettings(association, options);

        if (this.isListenerCompatible(settings) == true) {
            return {
                host: this._moveStore.host,
                port: this._moveStore.port,
                calledAeTitle: this._listenerSettings.calledAeTitle
            };
        }

        await this.closeListener();

        var queryOptions = {
            moveStoreHost: settings.host,
            moveStorePort: settings.port,
            moveStoreCalledAeTitle: settings.calledAeTitle,
            moveStoreWaitTimeoutMs: settings.waitForFirstInstanceMs,
            moveStoreIdleGraceMs: settings.batchIdleGraceMs,
            storageSopClassUids: settings.storageSopClassUids,
            storageTransferSyntaxUids: settings.storageTransferSyntaxUids,
            moveStoreTls: settings.moveStoreTls,
            onConcern: settings.onConcern,
            moveStorePolicy: settings.policy,
            maxCommandBytes: settings.maxCommandBytes,
            maxDataSetBytes: settings.maxDataSetBytes,
            maxTotalDataSetBytes: settings.maxTotalDataSetBytes
        };

        var associationOptions = Object.assign({}, (association || {}), {
            maxPduLength: settings.maxPduLength
        });

        var moveStore = await this._helper.startMoveStoreServer(associationOptions, queryOptions);
        if (generation !== this._generation) {
            await moveStore.close();
            throw new Exception("DIMSE C-STORE SCP listener was closed during startup.", GeneralErrorCodes.GeneralError);
        }
        this._moveStore = moveStore;
        this._listenerSettings = settings;
        this._readIndex = 0;

        return {
            host: this._moveStore.host,
            port: this._moveStore.port,
            calledAeTitle: settings.calledAeTitle
        };

    }

    /**
     * Close listener and clear local state.
     */
    async close() {

        this._generation++;
        await this.closeListener();

    }

    /**
     * Close the current listener without cancelling a queued replacement.
     */
    async closeListener() {

        var moveStore = this._moveStore;
        this._moveStore = null;
        this._listenerSettings = null;
        this._readIndex = 0;

        if (moveStore != null) {
            for (var socket of moveStore.state?.activeConnections || []) {
                socket.destroy();
            }
            await moveStore.close();
        }

    }

    /**
     * Gets current listener endpoint information.
     * @returns {{ host: string, port: number, calledAeTitle: string } | null} Listener endpoint.
     */
    get listener() {

        if ((this._moveStore == null) || (this._listenerSettings == null))
            return null;

        return {
            host: this._moveStore.host,
            port: this._moveStore.port,
            calledAeTitle: this._listenerSettings.calledAeTitle
        };

    }

    /**
     * Wait for one or more new instances to arrive and settle for this read transaction.
     * @param {object} settings Resolved settings.
     * @param {AbortSignal | null} signal Optional cancellation signal.
     * @returns {Promise<Array<Uint8Array>>} New Part-10 instances for this read call.
     */
    async waitForBatch(settings, signal = null) {

        if (this._moveStore == null)
            throw new Exception("DIMSE C-STORE SCP listener is not initialized.", GeneralErrorCodes.GeneralError);

        var moveStore = this._moveStore;
        var state = moveStore.state;
        var startTime = Date.now();
        var startIndex = this._readIndex;

        while (true) {

            if (signal?.aborted == true)
                throw signal.reason instanceof Error ? signal.reason
                    : new Exception("DIMSE C-STORE SCP read aborted.", GeneralErrorCodes.GeneralError);

            if ((this._moveStore !== moveStore) || (moveStore.closed == true))
                throw new Exception("DIMSE C-STORE SCP listener closed while waiting for instances.", GeneralErrorCodes.GeneralError);

            if (state.lastError != null) {
                var error = state.lastError;
                state.lastError = null;
                throw error;
            }

            var total = state.instances.length;
            var available = (total - startIndex);
            var now = Date.now();

            if (available > 0) {

                var lastReceivedAt = Number(state.lastReceivedAt || 0);
                var idleMs = (lastReceivedAt > 0) ? (now - lastReceivedAt) : 0;

                if ((settings.maxBatchInstances > 0) && (available >= settings.maxBatchInstances)) {
                    break;
                }

                if (idleMs >= settings.batchIdleGraceMs) {
                    break;
                }

            }
            else if ((now - startTime) > settings.waitForFirstInstanceMs) {
                throw new Exception("Timed out waiting for incoming DIMSE C-STORE instances.", GeneralErrorCodes.GeneralError);
            }

            await delay(25);

        }

        var endIndex = state.instances.length;
        if ((settings.maxBatchInstances > 0) && ((endIndex - startIndex) > settings.maxBatchInstances)) {
            endIndex = (startIndex + settings.maxBatchInstances);
        }

        var batch = state.instances.slice(startIndex, endIndex);
        this._readIndex = endIndex;

        // Release consumed payloads immediately so the listener's retained-byte
        // budget is available for the next batch. compactThreshold remains an
        // accepted option for compatibility with earlier listener configurations.
        if (this._readIndex > 0) {
            state.instances.splice(0, this._readIndex);
            this._readIndex = 0;
        }

        return batch;

    }

    /**
     * Read one batch of incoming C-STORE instances as one DICOM source envelope.
     * @param {object | null} association Association/listener options.
     * @param {object | null} options Read options.
     * @returns {Promise<object>} DIMSE source envelope.
     */
    async read(association, options = null) {

        if (this._reading == true)
            throw new Exception("Concurrent reads on one DIMSE C-STORE SCP listener are not supported.", GeneralErrorCodes.InvalidParameter);

        var signal = this.resolveOption(association, options, "signal", null);
        if ((signal != null) && ((typeof signal.addEventListener != "function")
            || (typeof signal.removeEventListener != "function")))
            throw new Exception("Invalid DIMSE C-STORE SCP AbortSignal.", GeneralErrorCodes.InvalidParameter);

        if (signal?.aborted == true)
            throw signal.reason instanceof Error ? signal.reason
                : new Exception("DIMSE C-STORE SCP read aborted.", GeneralErrorCodes.GeneralError);

        this._reading = true;
        try {
            var settings = this.resolveSettings(association, options);
            await this.start(association, options);

            var startedAtMs = Date.now();
            var instances = await this.waitForBatch(settings, signal);

            var diagnostics = {
                operation: "c-store-scp",
                startedAtMs,
                durationMs: (Date.now() - startedAtMs),
                moveStore: {
                    host: this._moveStore.host,
                    port: this._moveStore.port,
                    calledAeTitle: settings.calledAeTitle,
                    policyRejections: Array.isArray(this._moveStore?.state?.policyRejections)
                        ? this._moveStore.state.policyRejections.slice()
                        : []
                }
            };

            return this._helper.buildReadEnvelope(instances, {
                operation: "c-store-scp",
                boundary: settings.boundary
            }, {
                host: this._moveStore.host,
                port: this._moveStore.port,
                calledAeTitle: settings.calledAeTitle
            }, diagnostics);
        }
        finally {
            this._reading = false;
        }

    }

    /**
     * Construct one node DIMSE C-STORE SCP source transport.
     * @param {object | null} defaultAssociation Default listener association settings.
     * @param {object | null} options Transport defaults.
     */
    constructor(defaultAssociation = null, options = null) {

        super();
        this._defaultAssociation = defaultAssociation;
        this._options = options || {};
        this._helper = new NodeDimseQueryRetrieveSourceTransport(defaultAssociation, options);
        this._moveStore = null;
        this._listenerSettings = null;
        this._readIndex = 0;

        this._reading = false;
        this._generation = 0;
        this._startPromise = null;

    }

}
