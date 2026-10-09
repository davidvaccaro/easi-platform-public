import { EventEmitter } from "node:events";
import net from "node:net";
import NodeDimseQueryRetrieveSourceTransport from "../../../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";
import { dimseSocketTest } from "./DimseSocketTestGate.js";

const FIND = "1.2.840.10008.5.1.4.1.2.2.1";
const GET = "1.2.840.10008.5.1.4.1.2.2.3";
const MOVE = "1.2.840.10008.5.1.4.1.2.2.2";
const ECHO = "1.2.840.10008.1.1";
const STORE = "1.2.840.10008.5.1.4.1.1.7";
const EXPLICIT = "1.2.840.10008.1.2.1";
const IMPLICIT = "1.2.840.10008.1.2";
const association = { host: "127.0.0.1", port: 4242, callingAeTitle: "EASI_JS", calledAeTitle: "TEST_SCP" };
const encoder = new TextEncoder();

function concat(parts) {
    var bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    var offset = 0;
    for (var part of parts) {
        bytes.set(part, offset);
        offset += part.length;
    }
    return bytes;
}

function number(value, length = 2, little = true) {
    var bytes = new Uint8Array(length);
    if (length == 2) new DataView(bytes.buffer).setUint16(0, value, little);
    else new DataView(bytes.buffer).setUint32(0, value, little);
    return bytes;
}

function text(value) {
    var bytes = encoder.encode(value);
    return bytes.length % 2 ? concat([bytes, new Uint8Array(1)]) : bytes;
}

function element(tag, value) {
    return concat([number(0), number(tag), number(value.length, 4), value]);
}

function command(field, id = 7, status = 0, uid = ECHO, hasDataSet = false, counts = null) {
    var parts = [element(2, text(uid)), element(0x0100, number(field)),
        element(field & 0x8000 ? 0x0120 : 0x0110, number(id)), element(0x0800, number(hasDataSet ? 0 : 0x0101))];
    if (field & 0x8000) parts.push(element(0x0900, number(status)));
    if (field == 1) parts.push(element(0x0700, number(0)), element(0x1000, text("1.2.3.4")));
    if (counts != null) {
        for (var [name, tag] of [["remaining", 0x1020], ["completed", 0x1021], ["failed", 0x1022], ["warning", 0x1023]]) {
            if (counts[name] != null) parts.push(element(tag, number(counts[name])));
        }
    }
    var body = concat(parts);
    return concat([element(0, number(body.length, 4)), body]);
}

function event(bytes, contextId = 1, isCommand = true) {
    return { type: "pdv", contextId, isCommand, bytes };
}

function state(events = [], options = {}) {
    return Object.assign({ fragments: new Map(), events }, options);
}

const noMorePdus = { async shift() { throw new Error("Unexpected extra PDU read"); } };

function item(type, bytes) {
    return concat([new Uint8Array([type, 0]), number(bytes.length, 2, false), bytes]);
}

function acPayload(contextId = 1, transferSyntax = IMPLICIT, role = null) {
    var fixed = new Uint8Array(68);
    new DataView(fixed.buffer).setUint16(0, 1, false);
    var user = [item(0x51, number(16384, 4, false))];
    if (role != null) {
        var uid = encoder.encode(STORE);
        user.push(item(0x54, concat([number(uid.length, 2, false), uid, new Uint8Array([0, role ? 1 : 0])])));
    }
    return concat([fixed, item(0x10, encoder.encode("1.2.840.10008.3.1.1.1")),
        item(0x21, concat([new Uint8Array([contextId, 0, 0, 0]), item(0x40, encoder.encode(transferSyntax))])), item(0x50, concat(user))]);
}

class FakeSocket extends EventEmitter {
    constructor() { super(); this.destroyed = false; }
    destroy() { this.destroyed = true; this.emit("close"); }
}

test.each([
    ["wrong message ID", command(0x8030, 8), 1, "message ID"],
    ["wrong presentation context", command(0x8030), 3, "presentation context"],
    ["wrong response command", command(0x8020), 1, "command"],
    ["wrong SOP class", command(0x8030, 7, 0, FIND), 1, "SOP class"],
    ["unexpected dataset", command(0x8030, 7, 0, ECHO, true), 1, "dataset"],
    ["truncated command", command(0x8030).subarray(0, 20), 1, "truncated"],
    ["unsupported echo warning", command(0x8030, 7, 0xB000), 1, "0xB000"]
])("C-ECHO rejects %s", async (_name, bytes, contextId, message) => {
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    await expect(transport.receiveEchoResponse(noMorePdus, state([event(bytes, contextId)]), 1, { messageId: 7 })).rejects.toThrow(new RegExp(message, "i"));
});

test("association acceptance rejects unknown context IDs and unoffered transfer syntaxes", () => {
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    var requested = [{ id: 1, kind: "echo", abstractSyntaxUid: ECHO, transferSyntaxUids: [IMPLICIT] }];
    expect(() => transport.parseAssociateAc(acPayload(3), requested)).toThrow("invalid context");
    expect(() => transport.parseAssociateAc(acPayload(1, EXPLICIT), requested)).toThrow("unoffered transfer syntax");
    expect(() => transport.parseAssociateAc(acPayload().subarray(0, 80), requested)).toThrow("Truncated");
});

test("C-GET storage SCP role is explicit and cannot be inferred from accepted contexts", () => {
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    var requested = [{ id: 1, kind: "store", abstractSyntaxUid: STORE, transferSyntaxUids: [IMPLICIT], scuRole: false, scpRole: true }];
    expect(transport.parseAssociateAc(acPayload(), requested).contexts.get(1).scpRole).toBe(false);
    expect(transport.parseAssociateAc(acPayload(1, IMPLICIT, false), requested).contexts.get(1).scpRole).toBe(false);
    expect(transport.parseAssociateAc(acPayload(1, IMPLICIT, true), requested).contexts.get(1).scpRole).toBe(true);
});

test("preliminary C-FIND consumes every pending identifier before final response", async () => {
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    var input = state([event(command(0x8020, 7, 0xFF00, FIND, true)), event(new Uint8Array([8, 0]), 1, false), event(command(0x8020, 7, 0, FIND))]);
    await expect(transport.receiveFindResponses(noMorePdus, input, 1, { messageId: 7, sopClassUid: FIND })).resolves.toEqual([]);
    expect(input.events).toEqual([]);
    expect(input.finalResponse).toMatchObject({ status: 0, messageIdBeingRespondedTo: 7, count: 1 });
});

test.each([
    ["missing pending dataset", [event(command(0x8020, 7, 0xFF00, FIND))], "missing"],
    ["next command before pending dataset", [event(command(0x8020, 7, 0xFF00, FIND, true)), event(command(0x8020, 7, 0, FIND))], "Expected"],
    ["wrong identifier context", [event(command(0x8020, 7, 0xFF00, FIND, true)), event(new Uint8Array([8, 0]), 3, false)], "context"],
    ["final identifier", [event(command(0x8020, 7, 0, FIND, true))], "Final"]
])("C-FIND rejects %s", async (_name, events, message) => {
    await expect(new NodeDimseQueryRetrieveSourceTransport().receiveFindResponses(noMorePdus, state(events), 1, { messageId: 7, sopClassUid: FIND })).rejects.toThrow(message);
});

function getContexts(scpRole = true) {
    return new Map([[1, { accepted: true, transferSyntaxUid: EXPLICIT, context: { id: 1, kind: "get", abstractSyntaxUid: GET } }],
        [3, { accepted: true, scpRole, transferSyntaxUid: IMPLICIT, context: { id: 3, kind: "store", abstractSyntaxUid: STORE } }]]);
}

test("C-GET preserves accepted storage syntax and acknowledges only complete datasets", async () => {
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    transport.sendDimseRequest = jest.fn(async () => {});
    var input = state([event(command(1, 19, 0, STORE, true), 3), event(new Uint8Array([8, 0]), 3, false),
        event(command(0x8010, 7, 0, GET, false, { completed: 1, failed: 0, warning: 0 }))]);
    var results = await transport.receiveGetResponses({}, noMorePdus, input, getContexts(), 16384, 1, { messageId: 7 });
    expect(results).toHaveLength(1);
    expect(new TextDecoder().decode(results[0])).toContain(IMPLICIT);
    expect(results[0].subarray(-2)).toEqual(new Uint8Array([8, 0]));
    expect(transport.sendDimseRequest).toHaveBeenCalledTimes(1);
    expect(transport.sendDimseRequest.mock.calls[0][1]).toBe(3);
    expect(input.finalResponse).toMatchObject({ completed: 1, failed: 0, warning: 0 });
});

test.each([
    ["missing negotiated storage role", [event(command(1, 19, 0, STORE, true), 3)], false, "role"],
    ["mismatched storage SOP class", [event(command(1, 19, 0, GET, true), 3)], true, "context"],
    ["store without a dataset", [event(command(1, 19, 0, STORE, false), 3)], true, "missing dataset"],
    ["orphaned store data", [event(new Uint8Array([8, 0]), 3, false)], true, "Unexpected"],
    ["final response before store completes", [event(command(1, 19, 0, STORE, true), 3), event(command(0x8010, 7, 0, GET))], true, "fully received"],
    ["false completed count", [event(command(0x8010, 7, 0, GET, false, { completed: 1, warning: 0 }))], true, "count"]
])("C-GET rejects %s", async (_name, events, scpRole, message) => {
    await expect(new NodeDimseQueryRetrieveSourceTransport().receiveGetResponses({}, noMorePdus, state(events), getContexts(scpRole), 16384, 1, { messageId: 7 })).rejects.toThrow(message);
});

test("C-GET warning exposes failed SOP UIDs and preserves partial outcome", async () => {
    var uidBytes = text("1.2.3.8\\1.2.3.9");
    var failedIdentifier = concat([number(8), number(0x0058), encoder.encode("UI"), number(uidBytes.length), uidBytes]);
    var input = state([event(command(0x8010, 7, 0xB000, GET, true, { completed: 0, failed: 2, warning: 0 })), event(failedIdentifier, 1, false)]);
    await expect(new NodeDimseQueryRetrieveSourceTransport().receiveGetResponses({}, noMorePdus, input, getContexts(), 16384, 1, { messageId: 7 })).resolves.toEqual([]);
    expect(input.finalResponse).toMatchObject({ status: 0xB000, failed: 2, failedSopInstanceUids: ["1.2.3.8", "1.2.3.9"] });
});

test("peer C-MOVE failure retains status details on the exception", async () => {
    var error;
    try {
        await new NodeDimseQueryRetrieveSourceTransport().receiveMoveResponses(noMorePdus,
            state([event(command(0x8021, 7, 0xA801, MOVE, false, { failed: 1 }))]), 1, { messageId: 7, sopClassUid: MOVE });
    }
    catch (caught) { error = caught; }
    expect(error.message).toContain("0xA801");
    expect(error.dimse).toMatchObject({ status: 0xA801, failed: 1, completed: null });
});

test.each(["c-find", "c-get", "c-move"])("successful empty %s returns an explicit empty envelope", (operation) => {
    var result = new NodeDimseQueryRetrieveSourceTransport().buildReadEnvelope([], { operation }, association, { finalResponse: { status: 0 } });
    expect(result.empty).toBe(true);
    expect(result.contentLength).toBe(0);
    expect(result.metadata.count).toBe(0);
    expect(result.source).toHaveLength(0);
});

test("negotiated small PDUs fragment both command and dataset within the peer limit", async () => {
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    var pdus = [];
    transport.writePdu = async (_socket, bytes) => pdus.push(bytes);
    var commandBytes = command(0x0030);
    var data = new Uint8Array(40);
    await transport.sendDimseRequest({}, 1, 32, commandBytes, data);
    expect(pdus.length).toBeGreaterThan(3);
    for (var pdu of pdus) expect(new DataView(pdu.buffer).getUint32(2, false)).toBeLessThanOrEqual(32);
    var input = state();
    for (var pdu of pdus) transport.pushPDataEvents(input, pdu.subarray(6));
    expect(input.events).toEqual([event(commandBytes), event(data, 1, false)]);
    expect(input.fragments.size).toBe(0);
});

test.each([
    new Uint8Array([0, 0, 0, 1, 1]),
    new Uint8Array([0, 0, 0, 4, 1, 3]),
    new Uint8Array([0, 0, 0, 2, 2, 3]),
    new Uint8Array([0])
])("malformed PDV framing fails immediately", (payload) => {
    expect(() => new NodeDimseQueryRetrieveSourceTransport().pushPDataEvents(state(), payload)).toThrow();
});

test("fragment limits apply across multiple PDUs", () => {
    var transport = new NodeDimseQueryRetrieveSourceTransport(null, { maxCommandBytes: 4 });
    var input = state();
    transport.pushPDataEvents(input, transport.buildPDataPdu(1, new Uint8Array(4), true, false).subarray(6));
    expect(() => transport.pushPDataEvents(input, transport.buildPDataPdu(1, new Uint8Array(2), true, true).subarray(6))).toThrow("maxCommandBytes");
});

test("reserved PDV control bits are ignored while command and final bits are respected", () => {
    var input = state();
    new NodeDimseQueryRetrieveSourceTransport().pushPDataEvents(input, new Uint8Array([0, 0, 0, 2, 1, 0x83]));
    expect(input.events).toEqual([event(new Uint8Array(0))]);
});

test("empty intermediate fragments do not retain fragment objects", () => {
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    var input = state();
    for (var index = 0; index < 1000; index++) {
        transport.pushPDataEvents(input, transport.buildPDataPdu(1, new Uint8Array(0), true, false).subarray(6));
    }
    expect(input.fragments.size).toBe(0);
    expect(input.fragmentBytes.size).toBe(0);
});

test("aggregate outstanding fragment bytes are bounded across presentation contexts", () => {
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    var input = state([], { maxDataSetBytes: 8, maxTotalDataSetBytes: 6 });
    transport.pushPDataEvents(input, transport.buildPDataPdu(1, new Uint8Array(4), false, false).subarray(6));
    expect(() => transport.pushPDataEvents(input, transport.buildPDataPdu(3, new Uint8Array(4), false, false).subarray(6))).toThrow("maxTotalDataSetBytes");
});

class ConnectingSocket extends EventEmitter {
    setNoDelay() {}
    setTimeout() {}
    destroy(error) { this.destroyed = true; if (error != null) this.emit("error", error); this.emit("close"); }
}

test("AbortSignal interrupts a pending socket connection before association setup", async () => {
    var socket = new ConnectingSocket();
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    transport.resolveNodeSocketModules = async () => ({ net: { createConnection: () => socket }, tls: {} });
    var controller = new AbortController();
    var pending = transport.connectSocket(association, { signal: controller.signal });
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(socket.destroyed).toBe(true);
});

test("operation deadline also bounds a pending TCP connection", async () => {
    var socket = new ConnectingSocket();
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    transport.resolveNodeSocketModules = async () => ({ net: { createConnection: () => socket }, tls: {} });
    await expect(transport.connectSocket(association, { operationTimeoutMs: 15, startedAtMs: Date.now() })).rejects.toThrow("operation timed out");
    expect(socket.destroyed).toBe(true);
});

test("aggregate retrieve bytes are bounded before acknowledging the next store", async () => {
    var transport = new NodeDimseQueryRetrieveSourceTransport();
    transport.sendDimseRequest = jest.fn(async () => {});
    var input = state([event(command(1, 19, 0, STORE, true), 3), event(new Uint8Array(4), 3, false),
        event(command(1, 20, 0, STORE, true), 3), event(new Uint8Array(4), 3, false)], { maxTotalDataSetBytes: 6 });
    await expect(transport.receiveGetResponses({}, noMorePdus, input, getContexts(), 16384, 1, { messageId: 7 })).rejects.toThrow("maxTotalDataSetBytes");
    expect(transport.sendDimseRequest).toHaveBeenCalledTimes(1);
});

test("oversized incoming PDU fails the queue permanently before payload allocation", async () => {
    var socket = new FakeSocket();
    var scope = new NodeDimseQueryRetrieveSourceTransport().createPduReader(socket, { maxIncomingPduLength: 64 });
    socket.emit("data", concat([new Uint8Array([4, 0]), number(0xFFFFFFFF, 4, false)]));
    await expect(scope.queue.shift()).rejects.toThrow("oversized");
    await expect(scope.queue.shift()).rejects.toThrow("oversized");
    expect(socket.destroyed).toBe(true);
    scope.cleanup();
    expect(socket.listenerCount("data")).toBe(0);
});

test("abort signals reject pending and future PDU reads and release listeners", async () => {
    var socket = new FakeSocket();
    var controller = new AbortController();
    var scope = new NodeDimseQueryRetrieveSourceTransport().createPduReader(socket, { signal: controller.signal });
    var pending = scope.queue.shift();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await expect(scope.queue.shift()).rejects.toThrow("aborted");
    expect(socket.destroyed).toBe(true);
    scope.cleanup();
    expect(socket.listenerCount("close")).toBe(0);
});

test.each([{ messageIdStart: 65536 }, { priority: 3 }, { queryRetrieveModel: "bad" }, { operation: "bad" }, { maxDataSetBytes: -1 },
    { maxIncomingPduLength: 0 }, { maxCommandBytes: NaN }, { maxTotalDataSetBytes: Infinity }, { signal: {} }])("invalid query options fail before connection", (options) => {
    expect(() => new NodeDimseQueryRetrieveSourceTransport().resolveQueryOptions(association, options)).toThrow();
});

test("invalid constructor limits and echo signals fail before opening a socket", async () => {
    var transport = new NodeDimseQueryRetrieveSourceTransport(null, { maxDataSetBytes: Infinity });
    transport.connectSocket = jest.fn();
    await expect(transport.echo(association)).rejects.toThrow("maxDataSetBytes");
    expect(transport.connectSocket).not.toHaveBeenCalled();
    await expect(new NodeDimseQueryRetrieveSourceTransport().echo(association, { signal: {} })).rejects.toThrow("AbortSignal");
    await expect(transport.startMoveStoreServer(association, {})).rejects.toThrow("maxDataSetBytes");
});

class CapturingFindTransport extends NodeDimseQueryRetrieveSourceTransport {
    async connectSocket() { return { destroy() {} }; }
    createPduReader() { return { queue: { async shift() { return { type: 2, payload: new Uint8Array(0) }; } }, cleanup() {} }; }
    parseAssociateAc(_payload, contexts) { return { maxPduLength: 16384, contexts: new Map([[1, { accepted: true, transferSyntaxUid: EXPLICIT, context: contexts[0] }]]) }; }
    async writePdu() {}
    async sendDimseRequest(_socket, _context, _max, _command, dataSet) { this.identifier = dataSet; }
    async receiveFindResponses(_queue, input) { input.finalResponse = { status: 0, count: 0 }; return []; }
    async releaseAssociation() {}
}

test("query identifiers encode keyword return keys, proper VRs, UTF-8 and matching values", async () => {
    var transport = new CapturingFindTransport();
    await transport.read(association, { operation: "cfind", queryRetrieveLevel: "study", keys: { PatientName: "Müller^Ada", StudyInstanceUID: "1.2.3" },
        returnKeys: ["StudyInstanceUID", "NumberOfStudyRelatedInstances", "StudyDescription"] });
    var result = new Map();
    for (var offset = 0; offset < transport.identifier.length;) {
        var bytes = transport.identifier;
        var view = new DataView(bytes.buffer, bytes.byteOffset + offset);
        var tag = view.getUint16(0, true).toString(16).padStart(4, "0") + view.getUint16(2, true).toString(16).padStart(4, "0");
        var length = view.getUint16(6, true);
        result.set(tag.toUpperCase(), { vr: new TextDecoder().decode(bytes.subarray(offset + 4, offset + 6)), value: new TextDecoder().decode(bytes.subarray(offset + 8, offset + 8 + length)).replace(/\0/g, "").trim() });
        offset += 8 + length;
    }
    expect(result.get("0020000D")).toEqual({ vr: "UI", value: "1.2.3" });
    expect(result.get("00201208")).toEqual({ vr: "IS", value: "" });
    expect(result.get("00081030")).toEqual({ vr: "LO", value: "" });
    expect(result.get("00100010")).toEqual({ vr: "PN", value: "Müller^Ada" });
    expect(result.get("00080005").value).toBe("ISO_IR 192");
});

test.each([{ returnKeys: ["bogus"] }, { keys: { nonsense: "value" } }, { queryRetrieveLevel: "PATIENT" }, { queryRetrieveLevel: "INVALID" }])("invalid identifier fails before opening socket", async (options) => {
    var transport = new CapturingFindTransport();
    transport.connectSocket = jest.fn();
    await expect(transport.read(association, Object.assign({ operation: "c-find" }, options))).rejects.toThrow();
    expect(transport.connectSocket).not.toHaveBeenCalled();
});

dimseSocketTest("real socket operation deadline interrupts a peer trickling an incomplete accept", async () => {
    var connections = new Set();
    var server = net.createServer((socket) => {
        connections.add(socket);
        socket.on("data", () => {});
        socket.write(Buffer.from([2, 0, 0, 0, 0, 68]));
        var interval = setInterval(() => socket.write(Buffer.from([0, 0])), 10);
        socket.once("close", () => { clearInterval(interval); connections.delete(socket); });
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
        await expect(new NodeDimseQueryRetrieveSourceTransport().echo(Object.assign({}, association, { port: server.address().port, associationTimeoutMs: 1000 }),
            { operationTimeoutMs: 60 })).rejects.toThrow("operation timed out");
    }
    finally {
        for (var socket of connections) socket.destroy();
        await new Promise((resolve) => server.close(resolve));
    }
});
