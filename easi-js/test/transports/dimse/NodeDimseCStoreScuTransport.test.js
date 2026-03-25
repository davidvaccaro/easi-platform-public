import net from "node:net";

import EASI from "../../../src/EASI.js";
import Exception, { GeneralErrorCodes } from "../../../src/environment/Exception.js";
import NodeDimseCStoreScuTransport from "../../../src/transports/dimse/NodeDimseCStoreScuTransport.js";

const fs = require("fs");
const path = require("path");

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

function encodeCommandUS(group, element, value) {
    return encodeCommandElement(group, element, toUint16LE(value));
}

function encodeCommandUI(group, element, value) {
    return encodeCommandElement(group, element, padEven(toTextBytes(value), 0x00));
}

function encodeCommandUL(group, element, value) {
    return encodeCommandElement(group, element, toUint32LE(value));
}

function encodeCStoreRspCommand(sopClassUid, sopInstanceUid, messageIdBeingRespondedTo, status = 0x0000) {

    var body = concatBytes([
        encodeCommandUI(0x0000, 0x0002, sopClassUid),
        encodeCommandUS(0x0000, 0x0100, 0x8001), // C-STORE-RSP
        encodeCommandUS(0x0000, 0x0120, messageIdBeingRespondedTo),
        encodeCommandUS(0x0000, 0x0800, 0x0101), // no data-set
        encodeCommandUS(0x0000, 0x0900, status),
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
        var group = (new DataView(bytes.buffer, bytes.byteOffset + offset, 2)).getUint16(0, true);
        var element = (new DataView(bytes.buffer, bytes.byteOffset + offset + 2, 2)).getUint16(0, true);
        var length = (new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4)).getUint32(0, true);
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

function decodeCommandUI(elements, tag, defaultValue = "") {
    var value = elements.get(tag);
    if (value == null) {
        return defaultValue;
    }
    return (new TextDecoder()).decode(value).replace(/\0/g, "").trim();
}

function parseAssociateRq(payload) {

    var details = {
        calledAeTitle: (new TextDecoder()).decode(payload.subarray(4, 20)).trim(),
        callingAeTitle: (new TextDecoder()).decode(payload.subarray(20, 36)).trim(),
        sopClassUid: null,
        transferSyntaxUid: null
    };

    var offset = 68;
    while ((offset + 4) <= payload.length) {
        var itemType = payload[offset];
        var itemLength = (new DataView(payload.buffer, payload.byteOffset + offset + 2, 2)).getUint16(0, false);
        var itemStart = offset + 4;
        var itemStop = itemStart + itemLength;
        if (itemStop > payload.length) {
            break;
        }

        if (itemType == 0x20) {
            var sub = itemStart + 4;
            while ((sub + 4) <= itemStop) {
                var subType = payload[sub];
                var subLength = (new DataView(payload.buffer, payload.byteOffset + sub + 2, 2)).getUint16(0, false);
                var subStart = sub + 4;
                var subStop = subStart + subLength;
                if (subStop > itemStop) {
                    break;
                }
                if (subType == 0x30) {
                    details.sopClassUid = (new TextDecoder()).decode(payload.subarray(subStart, subStop));
                }
                else if (subType == 0x40) {
                    details.transferSyntaxUid = (new TextDecoder()).decode(payload.subarray(subStart, subStop));
                }
                sub = subStop;
            }
        }

        offset = itemStop;
    }

    return details;

}

function buildAssociateAcPdu(requestDetails) {

    var applicationContextItem = makeItem(0x10, toTextBytes("1.2.840.10008.3.1.1.1"));
    var transferSyntaxItem = makeItem(0x40, toTextBytes(requestDetails.transferSyntaxUid));
    var presentationContextAc = makeItem(0x21, concatBytes([
        new Uint8Array([0x01, 0x00, 0x00, 0x00]), // PCID=1, result=accept
        transferSyntaxItem
    ]));
    var maxLengthItem = makeItem(0x51, toUint32BE(16384));
    var userInfoItem = makeItem(0x50, maxLengthItem);

    var fixed = concatBytes([
        toUint16BE(0x0001),
        new Uint8Array([0x00, 0x00]),
        toTextBytes(requestDetails.calledAeTitle.padEnd(16, " ").slice(0, 16)),
        toTextBytes(requestDetails.callingAeTitle.padEnd(16, " ").slice(0, 16)),
        new Uint8Array(32)
    ]);

    return makePdu(0x02, concatBytes([
        fixed,
        applicationContextItem,
        presentationContextAc,
        userInfoItem
    ]));

}

function buildPDataCommandPdu(commandBytes) {
    var pdvBody = concatBytes([
        new Uint8Array([0x01, 0x03]), // PCID=1, command + last
        commandBytes
    ]);
    var pdv = concatBytes([toUint32BE(pdvBody.length), pdvBody]);
    return makePdu(0x04, pdv);
}

function parsePdusFromBuffer(buffer) {

    var pdus = [];
    var offset = 0;

    while ((offset + 6) <= buffer.length) {
        var type = buffer[offset];
        var length = (new DataView(buffer.buffer, buffer.byteOffset + offset + 2, 4)).getUint32(0, false);
        var total = 6 + length;
        if ((offset + total) > buffer.length) {
            break;
        }
        pdus.push({
            type,
            payload: buffer.subarray(offset + 6, offset + total)
        });
        offset += total;
    }

    return {
        consumed: offset,
        pdus
    };

}

function resolveEasiJsRoot() {

    var marker = `${path.sep}easi-js`;
    var cwd = process.cwd();
    var markerIndex = cwd.lastIndexOf(marker);

    if (markerIndex > -1) {
        return cwd.substring(0, markerIndex + marker.length);
    }

    return cwd;

}

function readDicomBytes(fileName) {
    const easiJsRoot = resolveEasiJsRoot();
    const filePath = path.join(easiJsRoot, "..", "data", "dicoms", fileName);
    return new Uint8Array(fs.readFileSync(filePath));
}

function createMockDimseStoreScp() {

    var requestDetails = null;
    var receivedCommandChunks = [];
    var receivedDataSetChunks = [];
    var commandComplete = false;
    var dataSetComplete = false;
    var releaseReceived = false;

    const server = net.createServer((socket) => {
        var buffer = new Uint8Array(0);

        const append = (left, right) => {
            var result = new Uint8Array(left.length + right.length);
            result.set(left, 0);
            result.set(right, left.length);
            return result;
        };

        socket.on("data", (chunk) => {
            buffer = append(buffer, new Uint8Array(chunk));
            var parsed = parsePdusFromBuffer(buffer);
            buffer = buffer.subarray(parsed.consumed);

            for (var i = 0; i < parsed.pdus.length; i++) {
                var pdu = parsed.pdus[i];

                if (pdu.type == 0x01) {
                    requestDetails = parseAssociateRq(pdu.payload);
                    socket.write(Buffer.from(buildAssociateAcPdu(requestDetails)));
                    continue;
                }

                if (pdu.type == 0x04) {
                    var offset = 0;
                    while ((offset + 4) <= pdu.payload.length) {
                        var pdvLength = (new DataView(pdu.payload.buffer, pdu.payload.byteOffset + offset, 4)).getUint32(0, false);
                        offset += 4;
                        if ((offset + pdvLength) > pdu.payload.length) {
                            break;
                        }
                        var header = pdu.payload[offset + 1];
                        var isCommand = ((header & 0x01) == 0x01);
                        var isLast = ((header & 0x02) == 0x02);
                        var data = pdu.payload.subarray(offset + 2, offset + pdvLength);
                        offset += pdvLength;

                        if (isCommand == true) {
                            receivedCommandChunks.push(data);
                            if (isLast == true) {
                                commandComplete = true;
                            }
                        }
                        else {
                            receivedDataSetChunks.push(data);
                            if (isLast == true) {
                                dataSetComplete = true;
                            }
                        }
                    }

                    if ((commandComplete == true) && (dataSetComplete == true)) {
                        var commandBytes = concatBytes(receivedCommandChunks);
                        var commandElements = parseCommandElements(commandBytes);
                        var messageId = decodeCommandUS(commandElements, "00000110", 1);
                        var sopClassUid = decodeCommandUI(commandElements, "00000002", requestDetails?.sopClassUid || "");
                        var sopInstanceUid = decodeCommandUI(commandElements, "00001000", "1.2.3.4.5");
                        var responseCommand = encodeCStoreRspCommand(sopClassUid, sopInstanceUid, messageId, 0x0000);
                        socket.write(Buffer.from(buildPDataCommandPdu(responseCommand)));
                    }

                    continue;
                }

                if (pdu.type == 0x05) {
                    releaseReceived = true;
                    socket.write(Buffer.from(makePdu(0x06, new Uint8Array(4))));
                    socket.end();
                }
            }
        });
    });

    return {
        server,
        getState() {
            return {
                requestDetails,
                commandBytes: concatBytes(receivedCommandChunks),
                dataSetBytes: concatBytes(receivedDataSetChunks),
                commandComplete,
                dataSetComplete,
                releaseReceived
            };
        }
    };

}

test("Test: NodeDimseCStoreScuTransport sends C-STORE to mock SCP and receives success response", async () => {

    var mock = createMockDimseStoreScp();
    await new Promise((resolve, reject) => {
        mock.server.listen(0, "127.0.0.1", () => resolve());
        mock.server.once("error", reject);
    });

    var address = mock.server.address();
    var port = address.port;

    try {

        const transport = new NodeDimseCStoreScuTransport();
        const sourceBytes = readDicomBytes("0002.DCM");

        const pipeline = EASI.pipelineBuilder()
            .fromByteStream()
            .ofDicomData()
            .toDicomData()
            .intoDimseAssociation({
                host: "127.0.0.1",
                port,
                callingAeTitle: "EASI_SCU",
                calledAeTitle: "MOCK_SCP",
                associationTimeoutMs: 5000
            }, {
                transport
            })
            .build();

        var result = await pipeline.process(sourceBytes);
        expect(result.ok).toBe(true);
        expect(result.dimseStatus).toBe(0x0000);
        expect(result.bytesWritten).toBe(sourceBytes.length);

        var state = mock.getState();
        expect(state.requestDetails).not.toBeNull();
        expect(state.requestDetails.calledAeTitle).toBe("MOCK_SCP");
        expect(state.requestDetails.callingAeTitle).toBe("EASI_SCU");
        expect(state.commandComplete).toBe(true);
        expect(state.dataSetComplete).toBe(true);
        expect(state.releaseReceived).toBe(true);
        expect(state.dataSetBytes.length).toBeGreaterThan(0);
        // Expect native data-set bytes (without Part-10 preamble/prefix).
        expect(state.dataSetBytes[0]).toBe(0x08);
        expect(state.dataSetBytes[1]).toBe(0x00);

    }
    finally {
        await new Promise((resolve) => {
            mock.server.close(() => resolve());
        });
    }

}, 20000);

test("Test: NodeDimseCStoreScuTransport validates required association fields", async () => {
    const transport = new NodeDimseCStoreScuTransport();

    try {
        await transport.write({
            host: "",
            port: 104,
            callingAeTitle: "EASI_SCU",
            calledAeTitle: "MOCK_SCP"
        }, new Uint8Array([0x00]));
    }
    catch (error) {
        expect(error instanceof Exception).toBe(true);
        expect(error.code).toBe(GeneralErrorCodes.InvalidParameter);
        return;
    }

    throw new Error("Expected association validation to fail.");
});
