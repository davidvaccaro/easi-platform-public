//
// NodeDimseCStoreScuTransport.js
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

import net from "node:net";
import tls from "node:tls";

import Exception from "../../environment/Exception.js";
import { GeneralErrorCodes } from "../../environment/Exception.js";
import DimseDestinationTransport from "./DimseDestinationTransport.js";
import DimseTransportContract from "./DimseTransportContract.js";

const APPLICATION_CONTEXT_UID = "1.2.840.10008.3.1.1.1";
const DEFAULT_IMPLEMENTATION_CLASS_UID = "1.2.826.0.1.3680043.10.5432.1";
const DEFAULT_IMPLEMENTATION_VERSION_NAME = "EASIJS_1_0";

const PDU_TYPES = {
    A_ASSOCIATE_RQ: 0x01,
    A_ASSOCIATE_AC: 0x02,
    A_ASSOCIATE_RJ: 0x03,
    P_DATA_TF: 0x04,
    A_RELEASE_RQ: 0x05,
    A_RELEASE_RP: 0x06,
    A_ABORT: 0x07
};

function padAeTitle(value) {

    var text = (value == null) ? "" : String(value);
    if (text.length > 16) {
        text = text.substring(0, 16);
    }

    while (text.length < 16) {
        text += " ";
    }

    return text;

}

function toTextBytes(value) {
    return (new TextEncoder()).encode(String(value));
}

function padEven(valueBytes, padByte = 0x00) {

    if ((valueBytes.length % 2) == 0) {
        return valueBytes;
    }

    var padded = new Uint8Array(valueBytes.length + 1);
    padded.set(valueBytes, 0);
    padded[padded.length - 1] = padByte;

    return padded;

}

function toUint16BE(value) {
    var bytes = new Uint8Array(2);
    (new DataView(bytes.buffer)).setUint16(0, value >>> 0, false);
    return bytes;
}

function toUint16LE(value) {
    var bytes = new Uint8Array(2);
    (new DataView(bytes.buffer)).setUint16(0, value >>> 0, true);
    return bytes;
}

function toUint32BE(value) {
    var bytes = new Uint8Array(4);
    (new DataView(bytes.buffer)).setUint32(0, value >>> 0, false);
    return bytes;
}

function toUint32LE(value) {
    var bytes = new Uint8Array(4);
    (new DataView(bytes.buffer)).setUint32(0, value >>> 0, true);
    return bytes;
}

function concatBytes(chunks) {

    var total = 0;
    for (var i = 0; i < chunks.length; i++) {
        total += chunks[i].length;
    }

    var result = new Uint8Array(total);
    var offset = 0;
    for (var index = 0; index < chunks.length; index++) {
        result.set(chunks[index], offset);
        offset += chunks[index].length;
    }

    return result;

}

function makeItem(type, payload) {

    return concatBytes([
        new Uint8Array([type, 0x00]),
        toUint16BE(payload.length),
        payload
    ]);

}

function makePdu(type, payload) {
    return concatBytes([
        new Uint8Array([type, 0x00]),
        toUint32BE(payload.length),
        payload
    ]);
}

function encodeCommandElement(group, element, valueBytes) {

    return concatBytes([
        toUint16LE(group),
        toUint16LE(element),
        toUint32LE(valueBytes.length),
        valueBytes
    ]);

}

function encodeCommandUI(group, element, value) {
    return encodeCommandElement(group, element, padEven(toTextBytes(value), 0x00));
}

function encodeCommandUS(group, element, value) {
    return encodeCommandElement(group, element, toUint16LE(value));
}

function encodeCommandUL(group, element, value) {
    return encodeCommandElement(group, element, toUint32LE(value));
}

function encodeCStoreRqCommand(sopClassUid, sopInstanceUid, messageId, priority = 0x0000) {

    var body = concatBytes([
        encodeCommandUI(0x0000, 0x0002, sopClassUid),
        encodeCommandUS(0x0000, 0x0100, 0x0001), // C-STORE-RQ
        encodeCommandUS(0x0000, 0x0110, messageId),
        encodeCommandUS(0x0000, 0x0700, priority),
        encodeCommandUS(0x0000, 0x0800, 0x0000), // data-set present
        encodeCommandUI(0x0000, 0x1000, sopInstanceUid)
    ]);

    return concatBytes([
        encodeCommandUL(0x0000, 0x0000, body.length),
        body
    ]);

}

function parseCommandElements(bytes) {

    var elements = new Map();
    var offset = 0;

    while (offset < bytes.length) {

        if ((offset + 8) > bytes.length) {
            throw new Exception("Truncated DIMSE command element header.", GeneralErrorCodes.GeneralError);
        }

        var view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
        var group = view.getUint16(0, true);
        var element = view.getUint16(2, true);
        var length = view.getUint32(4, true);
        offset += 8;

        if ((group != 0x0000) || ((length % 2) != 0) || ((offset + length) > bytes.length)) {
            throw new Exception("Invalid DIMSE command element.", GeneralErrorCodes.GeneralError);
        }

        var tag = group.toString(16).padStart(4, "0").toUpperCase()
            + element.toString(16).padStart(4, "0").toUpperCase();
        if (elements.has(tag)) {
            throw new Exception("Duplicate DIMSE command element.", GeneralErrorCodes.GeneralError);
        }
        elements.set(tag, bytes.subarray(offset, offset + length));
        offset += length;

    }

    var groupLength = elements.get("00000000");
    if ((groupLength == null) || (groupLength.length != 4)
        || ((new DataView(groupLength.buffer, groupLength.byteOffset, 4)).getUint32(0, true) != (bytes.length - 12))) {
        throw new Exception("Invalid DIMSE command group length.", GeneralErrorCodes.GeneralError);
    }

    return elements;

}

function decodeCommandUS(elements, tag) {
    var value = elements.get(tag);
    if ((value == null) || (value.length != 2)) {
        throw new Exception(`Missing or invalid DIMSE command field ${tag}.`, GeneralErrorCodes.GeneralError);
    }
    return (new DataView(value.buffer, value.byteOffset, value.byteLength)).getUint16(0, true);
}

function readMetaElementHeader(bytes, offset) {

    if ((offset + 8) > bytes.length) {
        return null;
    }

    var view = new DataView(bytes.buffer, bytes.byteOffset + offset, Math.min(12, bytes.length - offset));
    var group = view.getUint16(0, true);
    var element = view.getUint16(2, true);
    var vr = String.fromCharCode(bytes[offset + 4]) + String.fromCharCode(bytes[offset + 5]);

    var longVr = (vr == "OB") || (vr == "OD") || (vr == "OF") || (vr == "OL") || (vr == "OV")
        || (vr == "OW") || (vr == "SQ") || (vr == "SV") || (vr == "UV")
        || (vr == "UC") || (vr == "UR") || (vr == "UT") || (vr == "UN");

    var headerLength = longVr ? 12 : 8;
    if ((offset + headerLength) > bytes.length) {
        return null;
    }

    var length = longVr
        ? (new DataView(bytes.buffer, bytes.byteOffset + offset + 8, 4)).getUint32(0, true)
        : (new DataView(bytes.buffer, bytes.byteOffset + offset + 6, 2)).getUint16(0, true);

    return { group, element, vr, headerLength, length };

}

function parsePart10Meta(bytes) {

    if ((bytes == null) || (bytes.length < 132)) {
        return null;
    }

    if ((bytes[128] != 0x44) || (bytes[129] != 0x49) || (bytes[130] != 0x43) || (bytes[131] != 0x4D)) {
        return null;
    }

    var offset = 132;
    var meta = {
        transferSyntaxUid: null,
        sopClassUid: null,
        sopInstanceUid: null,
        dataSetOffset: 132
    };

    while (offset < bytes.length) {

        if (((offset + 2) <= bytes.length)
            && ((new DataView(bytes.buffer, bytes.byteOffset + offset, 2)).getUint16(0, true) != 0x0002)) {
            meta.dataSetOffset = offset;
            return meta;
        }

        var header = readMetaElementHeader(bytes, offset);
        if (header == null) {
            throw new Exception("Truncated C-STORE File Meta Information header.", GeneralErrorCodes.InvalidParameter);
        }

        if (header.group != 0x0002) {
            meta.dataSetOffset = offset;
            return meta;
        }

        var valueStart = offset + header.headerLength;
        var valueStop = valueStart + header.length;
        if ((valueStop > bytes.length) || ((header.length % 2) != 0)) {
            throw new Exception("Invalid C-STORE File Meta Information value length.", GeneralErrorCodes.InvalidParameter);
        }

        var valueBytes = bytes.subarray(valueStart, valueStop);
        var valueText = (new TextDecoder()).decode(valueBytes).replace(/\0/g, "").trim();

        if ((header.group == 0x0002) && (header.element == 0x0002)) {
            meta.sopClassUid = valueText;
        }
        else if ((header.group == 0x0002) && (header.element == 0x0003)) {
            meta.sopInstanceUid = valueText;
        }
        else if ((header.group == 0x0002) && (header.element == 0x0010)) {
            meta.transferSyntaxUid = valueText;
        }

        offset = valueStop;

    }

    meta.dataSetOffset = Math.min(offset, bytes.length);
    return meta;

}

function isLikelyUidText(value) {

    if ((typeof value !== "string") || (value.length == 0)) {
        return false;
    }

    var trimmed = value.replace(/\0/g, "").trim();
    if (trimmed.length == 0) {
        return false;
    }

    return (trimmed.length <= 64) && (/^[0-9]+(\.[0-9]+)+$/.test(trimmed) == true);

}

function decodeUidBytes(valueBytes) {
    return (new TextDecoder()).decode(valueBytes).replace(/\0/g, "").trim();
}

function tryReadUidElementAt(dataSetBytes, offset, isLittleEndian, isExplicitVr, group, element) {

    if ((offset + 8) > dataSetBytes.length) {
        return null;
    }

    var view = new DataView(dataSetBytes.buffer, dataSetBytes.byteOffset + offset, Math.min(12, dataSetBytes.length - offset));
    var parsedGroup = view.getUint16(0, isLittleEndian);
    var parsedElement = view.getUint16(2, isLittleEndian);

    if ((parsedGroup != group) || (parsedElement != element)) {
        return null;
    }

    var valueLength = 0;
    var valueOffset = 0;

    if (isExplicitVr == true) {

        if ((offset + 8) > dataSetBytes.length) {
            return null;
        }

        var vr0 = dataSetBytes[offset + 4];
        var vr1 = dataSetBytes[offset + 5];
        if ((vr0 != 0x55) || (vr1 != 0x49)) {
            return null;
        }

        valueLength = (new DataView(dataSetBytes.buffer, dataSetBytes.byteOffset + offset + 6, 2)).getUint16(0, isLittleEndian);
        valueOffset = offset + 8;

    }
    else {

        valueLength = (new DataView(dataSetBytes.buffer, dataSetBytes.byteOffset + offset + 4, 4)).getUint32(0, isLittleEndian);
        valueOffset = offset + 8;

    }

    if ((valueLength <= 0) || (valueLength > 256)) {
        return null;
    }

    var valueStop = valueOffset + valueLength;
    if (valueStop > dataSetBytes.length) {
        return null;
    }

    var uid = decodeUidBytes(dataSetBytes.subarray(valueOffset, valueStop));
    if (isLikelyUidText(uid) == false) {
        return null;
    }

    return uid;

}

function extractUidFromDataSet(dataSetBytes, group, element, transferSyntaxUid) {

    if ((dataSetBytes == null) || (dataSetBytes.length < 8)) {
        return null;
    }

    // Read only top-level elements in the declared transfer syntax. Byte scanning
    // can mistake nested values or pixel bytes for the instance's SOP UIDs.
    if (transferSyntaxUid == "1.2.840.10008.1.2.1.99") {
        return null; // Deflated data sets require File Meta Information or explicit UIDs.
    }
    var isLittleEndian = (transferSyntaxUid != "1.2.840.10008.1.2.2");
    var isExplicitVr = (transferSyntaxUid != "1.2.840.10008.1.2");
    var offset = 0;
    while ((offset + 8) <= dataSetBytes.length) {
        var uid = tryReadUidElementAt(dataSetBytes, offset, isLittleEndian, isExplicitVr, group, element);
        if (uid != null) {
            return uid;
        }
        var view = new DataView(dataSetBytes.buffer, dataSetBytes.byteOffset + offset, 8);
        var vr = String.fromCharCode(dataSetBytes[offset + 4], dataSetBytes[offset + 5]);
        var longVr = ["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "SV", "UC", "UN", "UR", "UT", "UV"].includes(vr);
        var headerLength = isExplicitVr && longVr ? 12 : 8;
        if ((offset + headerLength) > dataSetBytes.length) {
            return null;
        }
        var length = isExplicitVr
            ? (longVr
                ? (new DataView(dataSetBytes.buffer, dataSetBytes.byteOffset + offset + 8, 4)).getUint32(0, isLittleEndian)
                : view.getUint16(6, isLittleEndian))
            : view.getUint32(4, isLittleEndian);
        if ((length == 0xFFFFFFFF) || ((offset + headerLength + length) > dataSetBytes.length)) {
            return null;
        }
        offset += headerLength + length;
    }

    return null;

}

function createPromiseQueue() {

    var values = [];
    var waiters = [];
    var failure = null;

    return {
        push(value) {
            if (failure != null) {
                return;
            }
            if (waiters.length > 0) {
                waiters.shift().resolve(value);
                return;
            }
            values.push(value);
        },
        fail(error) {
            failure = error;
            while (waiters.length > 0) {
                waiters.shift().reject(error);
            }
        },
        async shift() {
            if (values.length > 0) {
                return values.shift();
            }
            if (failure != null) {
                throw failure;
            }
            return await new Promise((resolve, reject) => {
                waiters.push({ resolve, reject });
            });
        }
    };

}

export default class NodeDimseCStoreScuTransport extends DimseDestinationTransport {

    /**
     * Resolve one association option from write-call, instance config, and default.
     * @param {object | null} association Write-call association object.
     * @param {string} name Option property name.
     * @param {unknown} fallback Fallback value.
     * @returns {unknown} Resolved option value.
     */
    resolveAssociationValue(association, name, fallback = null) {

        if ((association != null) && (association[name] != null)) {
            return association[name];
        }

        if ((this._defaultAssociation != null) && (this._defaultAssociation[name] != null)) {
            return this._defaultAssociation[name];
        }

        if ((this._options != null) && (this._options[name] != null)) {
            return this._options[name];
        }

        return fallback;

    }

    /**
     * Validate required DIMSE association fields.
     * @param {object | null} association Association options.
     */
    validateAssociation(association) {

        var host = this.resolveAssociationValue(association, "host", null);
        var port = this.resolveAssociationValue(association, "port", null);
        var callingAeTitle = this.resolveAssociationValue(association, "callingAeTitle", null);
        var calledAeTitle = this.resolveAssociationValue(association, "calledAeTitle", null);

        if ((typeof host !== "string") || (host.length == 0)) {
            throw new Exception("Invalid DIMSE association host.", GeneralErrorCodes.InvalidParameter);
        }

        if ((Number.isInteger(Number(port)) == false) || (Number(port) <= 0) || (Number(port) > 65535)) {
            throw new Exception("Invalid DIMSE association port.", GeneralErrorCodes.InvalidParameter);
        }

        if ((typeof callingAeTitle !== "string") || (callingAeTitle.trim().length == 0)
            || (callingAeTitle.length > 16) || /[^\x20-\x7e]|\\/.test(callingAeTitle)) {
            throw new Exception("Invalid DIMSE calling AE Title.", GeneralErrorCodes.InvalidParameter);
        }

        if ((typeof calledAeTitle !== "string") || (calledAeTitle.trim().length == 0)
            || (calledAeTitle.length > 16) || /[^\x20-\x7e]|\\/.test(calledAeTitle)) {
            throw new Exception("Invalid DIMSE called AE Title.", GeneralErrorCodes.InvalidParameter);
        }

        var timeoutMs = Number(this.resolveAssociationValue(association, "associationTimeoutMs", 15000));
        var maxPduLength = Number(this.resolveAssociationValue(association, "maxPduLength", 16384));
        if ((Number.isInteger(timeoutMs) == false) || (timeoutMs <= 0) || (timeoutMs > 2147483647)) {
            throw new Exception("Invalid DIMSE association timeout.", GeneralErrorCodes.InvalidParameter);
        }
        if ((Number.isInteger(maxPduLength) == false) || (maxPduLength < 8) || (maxPduLength > 0xFFFFFFFF)) {
            throw new Exception("Invalid DIMSE maximum PDU length.", GeneralErrorCodes.InvalidParameter);
        }

    }

    /**
     * Resolve C-STORE payload fields from source bytes and options.
     * @param {Uint8Array} sourceBytes Part-10 bytes.
     * @param {object | null} options Write options.
     * @returns {{ sopClassUid: string, sopInstanceUid: string, transferSyntaxUid: string, dataSetBytes: Uint8Array, parsedMeta: object | null }} Payload fields.
     */
    resolveStorePayload(sourceBytes, options = null) {

        if (options == null) {
            options = {};
        }

        var parsedMeta = parsePart10Meta(sourceBytes);

        var sopClassUid = options.sopClassUid ?? null;
        var sopInstanceUid = options.sopInstanceUid ?? null;
        var transferSyntaxUid = options.transferSyntaxUid
            ?? parsedMeta?.transferSyntaxUid
            ?? "1.2.840.10008.1.2.1";

        var dataSetOffset = options.dataSetOffset;
        if (dataSetOffset == null) {
            dataSetOffset = parsedMeta?.dataSetOffset ?? 0;
        }
        if ((Number.isInteger(Number(dataSetOffset)) == false) || (Number(dataSetOffset) < 0) || (Number(dataSetOffset) >= sourceBytes.length)) {
            throw new Exception("Invalid C-STORE data-set offset.", GeneralErrorCodes.InvalidParameter);
        }

        var dataSetBytes = sourceBytes.subarray(Number(dataSetOffset));

        // Prefer data-set UIDs over File Meta UIDs so C-STORE command fields
        // always match the transmitted data-set after in-pipeline mutations
        // (for example de-identification UID reassignment).
        var dataSetSopClassUid = null;
        var dataSetSopInstanceUid = null;

        dataSetSopClassUid = extractUidFromDataSet(dataSetBytes, 0x0008, 0x0016, transferSyntaxUid);
        dataSetSopInstanceUid = extractUidFromDataSet(dataSetBytes, 0x0008, 0x0018, transferSyntaxUid);

        if (((sopClassUid != null) && (dataSetSopClassUid != null) && (sopClassUid != dataSetSopClassUid))
            || ((sopInstanceUid != null) && (dataSetSopInstanceUid != null) && (sopInstanceUid != dataSetSopInstanceUid))) {
            throw new Exception("C-STORE command UIDs conflict with the data set.", GeneralErrorCodes.InvalidParameter);
        }
        if ((parsedMeta?.transferSyntaxUid != null) && (parsedMeta.transferSyntaxUid != transferSyntaxUid)) {
            throw new Exception("C-STORE does not transcode a conflicting File Meta Information transfer syntax.", GeneralErrorCodes.InvalidParameter);
        }

        if ((typeof sopClassUid !== "string") || (sopClassUid.length == 0)) {
            sopClassUid = dataSetSopClassUid
                ?? parsedMeta?.sopClassUid
                ?? null;
        }

        if ((typeof sopInstanceUid !== "string") || (sopInstanceUid.length == 0)) {
            sopInstanceUid = dataSetSopInstanceUid
                ?? parsedMeta?.sopInstanceUid
                ?? null;
        }

        if (isLikelyUidText(sopClassUid) == false) {
            throw new Exception("Unable to resolve SOP Class UID for C-STORE request.", GeneralErrorCodes.InvalidParameter);
        }

        if (isLikelyUidText(sopInstanceUid) == false) {
            throw new Exception("Unable to resolve SOP Instance UID for C-STORE request.", GeneralErrorCodes.InvalidParameter);
        }

        if (isLikelyUidText(transferSyntaxUid) == false) {
            throw new Exception("Unable to resolve Transfer Syntax UID for C-STORE request.", GeneralErrorCodes.InvalidParameter);
        }

        return {
            sopClassUid,
            sopInstanceUid,
            transferSyntaxUid,
            dataSetBytes,
            parsedMeta
        };

    }

    /**
     * Create one socket for the specified association.
     * @param {object | null} association Association options.
     * @param {AbortSignal | null} signal Optional cancellation signal.
     * @returns {Promise<object>} Connected socket.
     */
    async connectSocket(association, signal = null) {

        const host = this.resolveAssociationValue(association, "host");
        const port = Number(this.resolveAssociationValue(association, "port"));
        const tlsOptions = this.resolveAssociationValue(association, "tls", false);
        const timeoutMs = Number(this.resolveAssociationValue(association, "associationTimeoutMs", 15000));

        return await new Promise((resolve, reject) => {

            var socket = null;
            var completed = false;

            const onError = (error) => {
                if (completed == true) {
                    return;
                }
                completed = true;
                signal?.removeEventListener("abort", onAbort);
                reject(error);
            };

            const onConnect = () => {
                if (completed == true) {
                    return;
                }
                completed = true;
                signal?.removeEventListener("abort", onAbort);
                resolve(socket);
            };

            const onAbort = () => {
                socket.destroy(signal.reason instanceof Error ? signal.reason
                    : new Exception("DIMSE C-STORE write aborted.", GeneralErrorCodes.GeneralError));
            };

            if ((tlsOptions != null) && (tlsOptions !== false)) {
                var options = Object.assign({}, (typeof tlsOptions == "object") ? tlsOptions : {}, { host, port });
                socket = tls.connect(options, onConnect);
            }
            else {
                socket = net.createConnection({ host, port }, onConnect);
            }

            socket.setNoDelay(true);
            socket.setTimeout(timeoutMs, () => {
                socket.destroy(new Exception("DIMSE association timed out.", GeneralErrorCodes.GeneralError));
            });
            socket.once("error", onError);
            signal?.addEventListener("abort", onAbort, { once: true });
            if (signal?.aborted == true) {
                onAbort();
            }

        });

    }

    /**
     * Create one PDU reader queue for a socket.
     * @param {object} socket Socket instance.
     * @param {number} maxPduLength Advertised maximum incoming P-DATA payload length.
     * @returns {{ queue: object, cleanup: Function }} Queue and cleanup callback.
     */
    createPduReader(socket, maxPduLength = 16384) {

        var buffer = new Uint8Array(0);
        var queue = createPromiseQueue();

        const append = (current, incoming) => {
            var result = new Uint8Array(current.length + incoming.length);
            result.set(current, 0);
            result.set(incoming, current.length);
            return result;
        };

        const parse = () => {
            while (buffer.length >= 6) {
                var pduType = buffer[0];
                var pduLength = (new DataView(buffer.buffer, buffer.byteOffset + 2, 4)).getUint32(0, false);
                if ((pduType < 0x01) || (pduType > 0x07)
                    || ((pduType == PDU_TYPES.P_DATA_TF) && ((pduLength < 6) || (pduLength > maxPduLength)))
                    || ((pduType != PDU_TYPES.P_DATA_TF) && (pduLength > 1048576))
                    || ((pduType >= PDU_TYPES.A_RELEASE_RQ) && (pduLength != 4))
                    || ((pduType == PDU_TYPES.A_ASSOCIATE_RJ) && (pduLength != 4))) {
                    throw new Exception("Invalid DIMSE PDU type or length.", GeneralErrorCodes.GeneralError);
                }
                var total = 6 + pduLength;
                if (buffer.length < total) {
                    return;
                }

                var payload = buffer.subarray(6, total);
                queue.push({
                    type: pduType,
                    payload
                });
                buffer = buffer.subarray(total);
            }
        };

        const onData = (chunk) => {
            var incoming = DimseTransportContract.toBytes(chunk);
            if (incoming == null) {
                incoming = new Uint8Array(0);
            }
            try {
                buffer = append(buffer, incoming);
                parse();
            }
            catch (error) {
                queue.fail(error);
                socket.destroy();
            }
        };

        const onError = (error) => {
            queue.fail(error || new Exception("DIMSE socket failure.", GeneralErrorCodes.GeneralError));
        };

        const onClose = () => {
            queue.fail(new Exception(buffer.length > 0 ? "DIMSE socket closed with a truncated PDU."
                : "DIMSE socket closed.", GeneralErrorCodes.GeneralError));
        };

        socket.on("data", onData);
        socket.once("error", onError);
        socket.once("close", onClose);
        if (socket.destroyed == true) {
            onClose();
        }

        return {
            queue,
            cleanup: () => {
                socket.off("data", onData);
                socket.off("error", onError);
                socket.off("close", onClose);
            }
        };

    }

    /**
     * Write one PDU to the socket.
     * @param {object} socket Socket instance.
     * @param {Uint8Array} bytes PDU bytes.
     */
    async writePdu(socket, bytes) {

        await new Promise((resolve, reject) => {
            socket.write(Buffer.from(bytes), (error) => {
                if (error != null) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });

    }

    /**
     * Build A-ASSOCIATE-RQ.
     * @param {object | null} association Association options.
     * @param {string} sopClassUid Affected SOP Class UID.
     * @param {string} transferSyntaxUid Presentation transfer syntax UID.
     * @returns {Uint8Array} PDU bytes.
     */
    buildAssociateRqPdu(association, sopClassUid, transferSyntaxUid) {

        const calledAeTitle = padAeTitle(this.resolveAssociationValue(association, "calledAeTitle"));
        const callingAeTitle = padAeTitle(this.resolveAssociationValue(association, "callingAeTitle"));
        const maxPduLength = Number(this.resolveAssociationValue(association, "maxPduLength", 16384));
        const implementationClassUid = this.resolveAssociationValue(association, "implementationClassUid", DEFAULT_IMPLEMENTATION_CLASS_UID);
        const implementationVersionName = this.resolveAssociationValue(association, "implementationVersionName", DEFAULT_IMPLEMENTATION_VERSION_NAME);

        const applicationContextItem = makeItem(0x10, toTextBytes(APPLICATION_CONTEXT_UID));

        const abstractSyntaxItem = makeItem(0x30, toTextBytes(sopClassUid));
        const transferSyntaxItem = makeItem(0x40, toTextBytes(transferSyntaxUid));
        const presentationContextBody = concatBytes([
            new Uint8Array([0x01, 0x00, 0x00, 0x00]), // PCID=1, reserved x3
            abstractSyntaxItem,
            transferSyntaxItem
        ]);
        const presentationContextItem = makeItem(0x20, presentationContextBody);

        const maximumLengthItem = makeItem(0x51, toUint32BE(maxPduLength));
        const implementationClassUidItem = makeItem(0x52, toTextBytes(implementationClassUid));
        const implementationVersionNameItem = makeItem(0x55, toTextBytes(implementationVersionName));
        const userInformationItem = makeItem(0x50, concatBytes([
            maximumLengthItem,
            implementationClassUidItem,
            implementationVersionNameItem
        ]));

        const fixed = concatBytes([
            toUint16BE(0x0001), // protocol version
            new Uint8Array([0x00, 0x00]),
            toTextBytes(calledAeTitle),
            toTextBytes(callingAeTitle),
            new Uint8Array(32)
        ]);

        return makePdu(PDU_TYPES.A_ASSOCIATE_RQ, concatBytes([
            fixed,
            applicationContextItem,
            presentationContextItem,
            userInformationItem
        ]));

    }

    /**
     * Parse A-ASSOCIATE-AC payload for accepted context and max PDU length.
     * @param {Uint8Array} payload AC payload.
     * @returns {{ accepted: boolean, maxPduLength: number, acceptedTransferSyntaxUid: string | null }} Parse result.
     */
    parseAssociateAc(payload) {

        if ((payload.length < 68)
            || (((new DataView(payload.buffer, payload.byteOffset, 2)).getUint16(0, false) & 0x0001) == 0)) {
            throw new Exception("Invalid DIMSE association accept fixed fields.", GeneralErrorCodes.GeneralError);
        }

        var accepted = false;
        var acceptedTransferSyntaxUid = null;
        var maxPduLength = null;
        var applicationContextSeen = false;
        var contextSeen = false;
        var userInformationSeen = false;
        const readItems = (bytes, start, visit) => {
            var offset = start;
            while (offset < bytes.length) {
                if ((offset + 4) > bytes.length) {
                    throw new Exception("Truncated DIMSE association item header.", GeneralErrorCodes.GeneralError);
                }
                var type = bytes[offset];
                var length = (new DataView(bytes.buffer, bytes.byteOffset + offset + 2, 2)).getUint16(0, false);
                var stop = offset + 4 + length;
                if (stop > bytes.length) {
                    throw new Exception("Truncated DIMSE association item value.", GeneralErrorCodes.GeneralError);
                }
                visit(type, bytes.subarray(offset + 4, stop));
                offset = stop;
            }
        };

        readItems(payload, 68, (type, value) => {
            if (type == 0x10) {
                if (applicationContextSeen || ((new TextDecoder()).decode(value) != APPLICATION_CONTEXT_UID)) {
                    throw new Exception("Invalid DIMSE application context.", GeneralErrorCodes.GeneralError);
                }
                applicationContextSeen = true;
            }
            else if (type == 0x21) {
                if (contextSeen || (value.length < 4) || (value[0] != 0x01) || (value[2] > 4)) {
                    throw new Exception("Unexpected DIMSE presentation context acceptance.", GeneralErrorCodes.GeneralError);
                }
                contextSeen = true;
                accepted = (value[2] == 0x00);
                readItems(value, 4, (subType, subValue) => {
                    if (subType == 0x40) {
                        if (acceptedTransferSyntaxUid != null) {
                            throw new Exception("Duplicate DIMSE accepted transfer syntax.", GeneralErrorCodes.GeneralError);
                        }
                        acceptedTransferSyntaxUid = (new TextDecoder()).decode(subValue);
                    }
                });
            }
            else if (type == 0x50) {
                if (userInformationSeen) {
                    throw new Exception("Duplicate DIMSE user information item.", GeneralErrorCodes.GeneralError);
                }
                userInformationSeen = true;
                readItems(value, 0, (subType, subValue) => {
                    if (subType == 0x51) {
                        if ((maxPduLength != null) || (subValue.length != 4)) {
                            throw new Exception("Invalid DIMSE maximum PDU length item.", GeneralErrorCodes.GeneralError);
                        }
                        maxPduLength = (new DataView(subValue.buffer, subValue.byteOffset, 4)).getUint32(0, false);
                    }
                });
            }
        });

        if ((applicationContextSeen == false) || (contextSeen == false) || (maxPduLength == null)
            || (accepted && (isLikelyUidText(acceptedTransferSyntaxUid) == false))) {
            throw new Exception("Incomplete DIMSE association acceptance.", GeneralErrorCodes.GeneralError);
        }
        return { accepted, maxPduLength, acceptedTransferSyntaxUid };

    }

    /**
     * Build one P-DATA-TF PDU with one PDV fragment.
     * @param {number} presentationContextId Presentation context id.
     * @param {Uint8Array} fragment Fragment bytes.
     * @param {boolean} isCommand True for command PDV.
     * @param {boolean} isLast True for last fragment.
     * @returns {Uint8Array} PDU bytes.
     */
    buildPDataPdu(presentationContextId, fragment, isCommand, isLast) {

        var messageHeader = 0x00;
        if (isCommand == true) {
            messageHeader |= 0x01;
        }
        if (isLast == true) {
            messageHeader |= 0x02;
        }

        var pdvBody = concatBytes([
            new Uint8Array([presentationContextId & 0xFF, messageHeader & 0xFF]),
            fragment
        ]);

        var pdv = concatBytes([
            toUint32BE(pdvBody.length),
            pdvBody
        ]);

        return makePdu(PDU_TYPES.P_DATA_TF, pdv);

    }

    /**
     * Receive C-STORE-RSP command from incoming P-DATA PDUs.
     * @param {object} queue PDU queue.
     * @param {object | null} expected Expected presentation context, message ID, and SOP UIDs.
     * @returns {{ status: number, messageIdRespondedTo: number }} Response info.
     */
    async receiveStoreResponse(queue, expected = null) {

        var commandChunks = [];
        var commandComplete = false;
        var commandLength = 0;
        var contextId = expected?.presentationContextId ?? 0x01;
        var maxCommandBytes = expected?.maxCommandBytes ?? 1048576;

        while (commandComplete == false) {
            var pdu = await queue.shift();
            if (pdu.type != PDU_TYPES.P_DATA_TF) {
                throw new Exception(pdu.type == PDU_TYPES.A_ABORT
                    ? "DIMSE association aborted by peer."
                    : "Unexpected PDU before C-STORE response.", GeneralErrorCodes.GeneralError);
            }

            var offset = 0;
            while (offset < pdu.payload.length) {
                if ((offset + 4) > pdu.payload.length) {
                    throw new Exception("Truncated DIMSE PDV header.", GeneralErrorCodes.GeneralError);
                }
                var pdvLength = (new DataView(pdu.payload.buffer, pdu.payload.byteOffset + offset, 4)).getUint32(0, false);
                offset += 4;
                if ((pdvLength < 2) || ((offset + pdvLength) > pdu.payload.length)) {
                    throw new Exception("Invalid DIMSE PDV length.", GeneralErrorCodes.GeneralError);
                }
                var pcid = pdu.payload[offset];
                var header = pdu.payload[offset + 1];
                var isCommand = ((header & 0x01) == 0x01);
                var isLast = ((header & 0x02) == 0x02);
                var data = pdu.payload.subarray(offset + 2, offset + pdvLength);
                offset += pdvLength;
                if ((pcid != contextId) || (isCommand == false) || commandComplete || ((data.length % 2) != 0)) {
                    throw new Exception("Unexpected C-STORE response presentation context or fragment.", GeneralErrorCodes.GeneralError);
                }
                commandLength += data.length;
                if (commandLength > maxCommandBytes) {
                    throw new Exception("DIMSE C-STORE response command exceeds the supported limit.", GeneralErrorCodes.GeneralError);
                }
                // Empty fragments carry only framing information. Keeping a
                // view for each one would bypass the command byte budget.
                if (data.length > 0) {
                    commandChunks.push(data);
                }
                commandComplete = isLast;
            }
        }

        var elements = parseCommandElements(concatBytes(commandChunks));
        var commandField = decodeCommandUS(elements, "00000100");
        var dataSetType = decodeCommandUS(elements, "00000800");
        var status = decodeCommandUS(elements, "00000900");
        var messageIdRespondedTo = decodeCommandUS(elements, "00000120");
        if ((commandField != 0x8001) || (dataSetType != 0x0101)
            || ((expected?.messageId != null) && (messageIdRespondedTo != expected.messageId))) {
            throw new Exception("C-STORE response does not match the request.", GeneralErrorCodes.GeneralError);
        }
        const optionalText = (tag) => elements.has(tag)
            ? (new TextDecoder()).decode(elements.get(tag)).replace(/\0/g, "").trim() : null;
        var sopClassUid = optionalText("00000002");
        var sopInstanceUid = optionalText("00001000");
        if (((sopClassUid != null) && (expected?.sopClassUid != null) && (sopClassUid != expected.sopClassUid))
            || ((sopInstanceUid != null) && (expected?.sopInstanceUid != null) && (sopInstanceUid != expected.sopInstanceUid))) {
            throw new Exception("C-STORE response SOP UIDs do not match the request.", GeneralErrorCodes.GeneralError);
        }
        return {
            status,
            messageIdRespondedTo,
            sopClassUid,
            sopInstanceUid,
            errorComment: optionalText("00000902")
        };

    }

    /**
     * Send C-STORE-RQ command and data-set over P-DATA-TF PDUs.
     * @param {object} socket Connected socket.
     * @param {number} maxPduLength Max PDU length.
     * @param {Uint8Array} commandBytes C-STORE command bytes.
     * @param {Uint8Array} dataSetBytes Data-set bytes.
     */
    async sendStoreRequest(socket, maxPduLength, commandBytes, dataSetBytes) {

        // The negotiated maximum applies to the PDU payload, excluding its
        // six-byte header. Each single-PDV payload has six bytes of overhead.
        var payloadLimit = Number(maxPduLength || 16384);
        var maxFragment = Math.floor((payloadLimit - 6) / 2) * 2;
        if ((Number.isInteger(payloadLimit) == false) || (maxFragment < 2)) {
            throw new Exception("Peer maximum PDU length cannot carry a DIMSE fragment.", GeneralErrorCodes.GeneralError);
        }
        if ((dataSetBytes == null) || (dataSetBytes.length == 0) || ((dataSetBytes.length % 2) != 0)) {
            throw new Exception("C-STORE requires a nonempty, even-length data set.", GeneralErrorCodes.InvalidParameter);
        }
        for (var part of [{ bytes: commandBytes, isCommand: true }, { bytes: dataSetBytes, isCommand: false }]) {
            for (var offset = 0; offset < part.bytes.length; offset += maxFragment) {
                var stop = Math.min(part.bytes.length, offset + maxFragment);
                await this.writePdu(socket, this.buildPDataPdu(0x01, part.bytes.subarray(offset, stop),
                    part.isCommand, stop >= part.bytes.length));
            }
        }

    }

    /**
     * Send A-RELEASE-RQ and wait for A-RELEASE-RP.
     * @param {object} socket Connected socket.
     * @param {object} queue PDU queue.
     */
    async releaseAssociation(socket, queue) {

        await this.writePdu(socket, makePdu(PDU_TYPES.A_RELEASE_RQ, new Uint8Array(4)));

        while (true) {
            var pdu = await queue.shift();
            if (pdu.type == PDU_TYPES.A_RELEASE_RP) {
                if (pdu.payload.length != 4) {
                    throw new Exception("Invalid DIMSE release response.", GeneralErrorCodes.GeneralError);
                }
                return;
            }
            if (pdu.type == PDU_TYPES.A_ABORT) {
                throw new Exception("DIMSE association aborted while waiting for release response.", GeneralErrorCodes.GeneralError);
            }
            if (pdu.type == PDU_TYPES.A_RELEASE_RQ) {
                // A simultaneous release request is valid. Acknowledge the
                // peer's request while still awaiting our release response.
                await this.writePdu(socket, makePdu(PDU_TYPES.A_RELEASE_RP, new Uint8Array(4)));
                continue;
            }
            throw new Exception("Unexpected DIMSE PDU while waiting for release response.", GeneralErrorCodes.GeneralError);
        }

    }

    /**
     * Write one payload using DIMSE C-STORE SCU.
     * @param {object | null} association DIMSE destination association options.
     * @param {Uint8Array | object} source Source payload.
     * @param {object | null} options Optional write options.
     * @returns {Promise<object>} Write result metadata.
     */
    async write(association, source, options = null) {

        if (options == null) {
            options = {};
        }

        this.validateAssociation(association);

        var sourceBytes = DimseTransportContract.toBytes(source);
        if (sourceBytes == null) {
            throw new Exception("C-STORE source must be byte payload.", GeneralErrorCodes.InvalidParameter);
        }

        var payload = this.resolveStorePayload(sourceBytes, options);
        var messageId = Number(options.messageId ?? this.resolveAssociationValue(association, "messageId", 1));
        var priority = Number(options.priority ?? this.resolveAssociationValue(association, "priority", 0));
        if ((Number.isInteger(messageId) == false) || (messageId < 0) || (messageId > 65535)) {
            throw new Exception("Invalid C-STORE message ID.", GeneralErrorCodes.InvalidParameter);
        }
        if ((Number.isInteger(priority) == false) || (priority < 0) || (priority > 2)) {
            throw new Exception("Invalid C-STORE priority.", GeneralErrorCodes.InvalidParameter);
        }
        if ((payload.dataSetBytes.length % 2) != 0) {
            throw new Exception("C-STORE requires an even-length data set.", GeneralErrorCodes.InvalidParameter);
        }
        var maxCommandBytes = Number(options.maxCommandBytes ?? this.resolveAssociationValue(association, "maxCommandBytes", 1048576));
        if ((Number.isSafeInteger(maxCommandBytes) == false) || (maxCommandBytes <= 0)) {
            throw new Exception("Invalid C-STORE maximum command byte limit.", GeneralErrorCodes.InvalidParameter);
        }
        var signal = options.signal ?? this.resolveAssociationValue(association, "signal", null);
        if ((signal != null) && ((typeof signal.addEventListener != "function")
            || (typeof signal.removeEventListener != "function"))) {
            throw new Exception("Invalid C-STORE AbortSignal.", GeneralErrorCodes.InvalidParameter);
        }
        if (signal?.aborted == true) {
            throw signal.reason instanceof Error ? signal.reason
                : new Exception("DIMSE C-STORE write aborted.", GeneralErrorCodes.GeneralError);
        }

        var socket = await this.connectSocket(association, signal);
        var scope = this.createPduReader(socket, Number(this.resolveAssociationValue(association, "maxPduLength", 16384)));
        const onAbort = () => socket.destroy(signal.reason instanceof Error ? signal.reason
            : new Exception("DIMSE C-STORE write aborted.", GeneralErrorCodes.GeneralError));
        signal?.addEventListener("abort", onAbort, { once: true });
        if (signal?.aborted == true) {
            onAbort();
        }

        try {

            const rqPdu = this.buildAssociateRqPdu(association, payload.sopClassUid, payload.transferSyntaxUid);
            await this.writePdu(socket, rqPdu);

            var ac = await scope.queue.shift();
            if (ac.type == PDU_TYPES.A_ASSOCIATE_RJ) {
                throw new Exception("DIMSE association rejected by peer.", GeneralErrorCodes.GeneralError);
            }
            if (ac.type != PDU_TYPES.A_ASSOCIATE_AC) {
                throw new Exception("Invalid DIMSE association response.", GeneralErrorCodes.GeneralError);
            }

            var acInfo = this.parseAssociateAc(ac.payload);
            if (acInfo.accepted != true) {
                throw new Exception("DIMSE presentation context rejected by peer.", GeneralErrorCodes.GeneralError);
            }
            if (acInfo.acceptedTransferSyntaxUid != payload.transferSyntaxUid) {
                throw new Exception("Peer selected a transfer syntax that was not offered; C-STORE does not transcode.", GeneralErrorCodes.GeneralError);
            }

            var commandBytes = encodeCStoreRqCommand(
                payload.sopClassUid,
                payload.sopInstanceUid,
                messageId,
                priority
            );

            await this.sendStoreRequest(socket, acInfo.maxPduLength, commandBytes, payload.dataSetBytes);
            var response = await this.receiveStoreResponse(scope.queue, {
                presentationContextId: 0x01, messageId, maxCommandBytes,
                sopClassUid: payload.sopClassUid,
                sopInstanceUid: payload.sopInstanceUid
            });
            await this.releaseAssociation(socket, scope.queue);

            return DimseTransportContract.createWriteResult({
                ok: (response.status == 0x0000) || ((response.status & 0xF000) == 0xB000),
                status: response.status,
                dimseStatus: response.status,
                bytesWritten: sourceBytes.length,
                association: association || null,
                metadata: {
                    sopClassUid: payload.sopClassUid,
                    sopInstanceUid: payload.sopInstanceUid,
                    transferSyntaxUid: payload.transferSyntaxUid,
                    acceptedTransferSyntaxUid: acInfo.acceptedTransferSyntaxUid,
                    sourceMetaSopClassUid: payload?.parsedMeta?.sopClassUid ?? null,
                    sourceMetaSopInstanceUid: payload?.parsedMeta?.sopInstanceUid ?? null,
                    messageIdRespondedTo: response.messageIdRespondedTo,
                    warning: ((response.status & 0xF000) == 0xB000),
                    errorComment: response.errorComment
                }
            });

        }
        finally {
            signal?.removeEventListener("abort", onAbort);
            scope.cleanup();
            if ((socket != null) && (typeof socket.destroy == "function")) {
                socket.destroy();
            }
        }

    }

    /**
     * Construct one Node DIMSE C-STORE SCU destination transport.
     * @param {object | null} defaultAssociation Optional default association options.
     * @param {object | null} options Optional transport defaults.
     */
    constructor(defaultAssociation = null, options = null) {
        super();
        this._defaultAssociation = defaultAssociation;
        this._options = options || {};
    }

}
