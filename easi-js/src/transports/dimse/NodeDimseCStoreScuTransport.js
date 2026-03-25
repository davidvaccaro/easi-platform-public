//
// NodeDimseCStoreScuTransport.js - 1.0.0
//
// Node DIMSE C-STORE SCU Destination Transport Class
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

    while ((offset + 8) <= bytes.length) {

        var view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
        var group = view.getUint16(0, true);
        var element = view.getUint16(2, true);
        var length = view.getUint32(4, true);
        offset += 8;

        if ((offset + length) > bytes.length) {
            break;
        }

        var tag = group.toString(16).padStart(4, "0").toUpperCase()
            + element.toString(16).padStart(4, "0").toUpperCase();
        elements.set(tag, bytes.subarray(offset, offset + length));
        offset += length;

    }

    return elements;

}

function decodeCommandUS(elements, tag, defaultValue = 0) {
    var value = elements.get(tag);
    if ((value == null) || (value.length < 2)) {
        return defaultValue;
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
        || (vr == "OW") || (vr == "SQ") || (vr == "UC") || (vr == "UR") || (vr == "UT") || (vr == "UN");

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

        var header = readMetaElementHeader(bytes, offset);
        if (header == null) {
            break;
        }

        if (header.group != 0x0002) {
            meta.dataSetOffset = offset;
            return meta;
        }

        var valueStart = offset + header.headerLength;
        var valueStop = valueStart + header.length;
        if (valueStop > bytes.length) {
            break;
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

function createPromiseQueue() {

    var values = [];
    var waiters = [];

    return {
        push(value) {
            if (waiters.length > 0) {
                waiters.shift().resolve(value);
                return;
            }
            values.push(value);
        },
        fail(error) {
            while (waiters.length > 0) {
                waiters.shift().reject(error);
            }
        },
        async shift() {
            if (values.length > 0) {
                return values.shift();
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

        if ((Number.isFinite(Number(port)) == false) || (Number(port) <= 0)) {
            throw new Exception("Invalid DIMSE association port.", GeneralErrorCodes.InvalidParameter);
        }

        if ((typeof callingAeTitle !== "string") || (callingAeTitle.length == 0)) {
            throw new Exception("Invalid DIMSE calling AE Title.", GeneralErrorCodes.InvalidParameter);
        }

        if ((typeof calledAeTitle !== "string") || (calledAeTitle.length == 0)) {
            throw new Exception("Invalid DIMSE called AE Title.", GeneralErrorCodes.InvalidParameter);
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

        var sopClassUid = options.sopClassUid
            ?? parsedMeta?.sopClassUid
            ?? null;
        var sopInstanceUid = options.sopInstanceUid
            ?? parsedMeta?.sopInstanceUid
            ?? null;
        var transferSyntaxUid = options.transferSyntaxUid
            ?? parsedMeta?.transferSyntaxUid
            ?? "1.2.840.10008.1.2.1";

        if ((typeof sopClassUid !== "string") || (sopClassUid.length == 0)) {
            throw new Exception("Unable to resolve SOP Class UID for C-STORE request.", GeneralErrorCodes.InvalidParameter);
        }

        if ((typeof sopInstanceUid !== "string") || (sopInstanceUid.length == 0)) {
            throw new Exception("Unable to resolve SOP Instance UID for C-STORE request.", GeneralErrorCodes.InvalidParameter);
        }

        if ((typeof transferSyntaxUid !== "string") || (transferSyntaxUid.length == 0)) {
            throw new Exception("Unable to resolve Transfer Syntax UID for C-STORE request.", GeneralErrorCodes.InvalidParameter);
        }

        var dataSetOffset = options.dataSetOffset;
        if (dataSetOffset == null) {
            dataSetOffset = parsedMeta?.dataSetOffset ?? 0;
        }
        if ((Number.isFinite(Number(dataSetOffset)) == false) || (Number(dataSetOffset) < 0) || (Number(dataSetOffset) > sourceBytes.length)) {
            throw new Exception("Invalid C-STORE data-set offset.", GeneralErrorCodes.InvalidParameter);
        }

        return {
            sopClassUid,
            sopInstanceUid,
            transferSyntaxUid,
            dataSetBytes: sourceBytes.subarray(Number(dataSetOffset)),
            parsedMeta
        };

    }

    /**
     * Create one socket for the specified association.
     * @param {object | null} association Association options.
     * @returns {Promise<object>} Connected socket.
     */
    async connectSocket(association) {

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
                reject(error);
            };

            const onConnect = () => {
                if (completed == true) {
                    return;
                }
                completed = true;
                resolve(socket);
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

        });

    }

    /**
     * Create one PDU reader queue for a socket.
     * @param {object} socket Socket instance.
     * @returns {{ queue: object, cleanup: Function }} Queue and cleanup callback.
     */
    createPduReader(socket) {

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
            buffer = append(buffer, incoming);
            parse();
        };

        const onError = (error) => {
            queue.fail(error || new Exception("DIMSE socket failure.", GeneralErrorCodes.GeneralError));
        };

        const onClose = () => {
            queue.fail(new Exception("DIMSE socket closed.", GeneralErrorCodes.GeneralError));
        };

        socket.on("data", onData);
        socket.once("error", onError);
        socket.once("close", onClose);

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

        var offset = 68; // fixed fields
        var accepted = false;
        var maxPduLength = 16384;
        var acceptedTransferSyntaxUid = null;

        while ((offset + 4) <= payload.length) {
            var type = payload[offset];
            var length = (new DataView(payload.buffer, payload.byteOffset + offset + 2, 2)).getUint16(0, false);
            var start = offset + 4;
            var stop = start + length;
            if (stop > payload.length) {
                break;
            }

            var value = payload.subarray(start, stop);

            if (type == 0x21) { // Presentation Context AC
                var resultReason = value[2];
                if (resultReason == 0x00) {
                    accepted = true;
                    // Sub-items
                    var subOffset = 4;
                    while ((subOffset + 4) <= value.length) {
                        var subType = value[subOffset];
                        var subLength = (new DataView(value.buffer, value.byteOffset + subOffset + 2, 2)).getUint16(0, false);
                        var subStart = subOffset + 4;
                        var subStop = subStart + subLength;
                        if (subStop > value.length) {
                            break;
                        }
                        if (subType == 0x40) {
                            acceptedTransferSyntaxUid = (new TextDecoder()).decode(value.subarray(subStart, subStop));
                        }
                        subOffset = subStop;
                    }
                }
            }
            else if (type == 0x50) { // User Information
                var sub = 0;
                while ((sub + 4) <= value.length) {
                    var subType = value[sub];
                    var subLength = (new DataView(value.buffer, value.byteOffset + sub + 2, 2)).getUint16(0, false);
                    var subStart = sub + 4;
                    var subStop = subStart + subLength;
                    if (subStop > value.length) {
                        break;
                    }
                    if ((subType == 0x51) && (subLength >= 4)) {
                        maxPduLength = (new DataView(value.buffer, value.byteOffset + subStart, 4)).getUint32(0, false);
                    }
                    sub = subStop;
                }
            }

            offset = stop;
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
     * @returns {{ status: number, messageIdRespondedTo: number }} Response info.
     */
    async receiveStoreResponse(queue) {

        var commandChunks = [];
        var commandComplete = false;

        while (commandComplete == false) {
            var pdu = await queue.shift();

            if (pdu.type == PDU_TYPES.P_DATA_TF) {
                var offset = 0;
                while ((offset + 4) <= pdu.payload.length) {
                    var pdvLength = (new DataView(pdu.payload.buffer, pdu.payload.byteOffset + offset, 4)).getUint32(0, false);
                    offset += 4;
                    if ((offset + pdvLength) > pdu.payload.length) {
                        break;
                    }

                    var pcid = pdu.payload[offset];
                    var header = pdu.payload[offset + 1];
                    var isCommand = ((header & 0x01) == 0x01);
                    var isLast = ((header & 0x02) == 0x02);
                    var data = pdu.payload.subarray(offset + 2, offset + pdvLength);
                    offset += pdvLength;

                    if (isCommand == true) {
                        commandChunks.push(data);
                        if (isLast == true) {
                            commandComplete = true;
                        }
                    }
                }
            }
            else if (pdu.type == PDU_TYPES.A_ABORT) {
                throw new Exception("DIMSE association aborted by peer.", GeneralErrorCodes.GeneralError);
            }
            else if (pdu.type == PDU_TYPES.A_RELEASE_RQ) {
                throw new Exception("Unexpected A-RELEASE-RQ before C-STORE response.", GeneralErrorCodes.GeneralError);
            }
        }

        var commandBytes = concatBytes(commandChunks);
        var elements = parseCommandElements(commandBytes);
        return {
            status: decodeCommandUS(elements, "00000900", 0xFFFF),
            messageIdRespondedTo: decodeCommandUS(elements, "00000120", 0)
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

        var maxFragment = Math.max(1024, Number(maxPduLength || 16384) - 12);

        await this.writePdu(socket, this.buildPDataPdu(0x01, commandBytes, true, true));

        if ((dataSetBytes == null) || (dataSetBytes.length == 0)) {
            return;
        }

        for (var offset = 0; offset < dataSetBytes.length; offset += maxFragment) {
            var stop = Math.min(dataSetBytes.length, offset + maxFragment);
            var chunk = dataSetBytes.subarray(offset, stop);
            var isLast = (stop >= dataSetBytes.length);
            await this.writePdu(socket, this.buildPDataPdu(0x01, chunk, false, isLast));
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
                return;
            }
            if (pdu.type == PDU_TYPES.A_ABORT) {
                throw new Exception("DIMSE association aborted while waiting for release response.", GeneralErrorCodes.GeneralError);
            }
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

        var socket = await this.connectSocket(association);
        var scope = this.createPduReader(socket);

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

            var commandBytes = encodeCStoreRqCommand(
                payload.sopClassUid,
                payload.sopInstanceUid,
                messageId,
                priority
            );

            await this.sendStoreRequest(socket, acInfo.maxPduLength, commandBytes, payload.dataSetBytes);
            var response = await this.receiveStoreResponse(scope.queue);
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
                    acceptedTransferSyntaxUid: acInfo.acceptedTransferSyntaxUid
                }
            });

        }
        finally {
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
