import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";

import PartStreamReader from "../../../src/readers/PartStreamReader.js";
import DicomDataParser from "../../../src/parsers/DicomDataParser.js";
import DicomInstanceHandler from "../../../src/handlers/terminals/DicomInstanceHandler.js";
import NodeDimseCStoreScuTransport from "../../../src/transports/dimse/NodeDimseCStoreScuTransport.js";
import NodeDimseCStoreScpSourceTransport from "../../../src/transports/dimse/NodeDimseCStoreScpSourceTransport.js";
import NodeDimseQueryRetrieveSourceTransport from "../../../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";
import Exception, { GeneralErrorCodes } from "../../../src/environment/Exception.js";
import { dimseSocketTest } from "./DimseSocketTestGate.js";

const sampleDicomPath = path.resolve(process.cwd(), "../data/dicoms/0002.DCM");

async function parseEnvelopeToInstances(envelope) {

    var reader = new PartStreamReader();
    var parser = new DicomDataParser();
    parser.handler = new DicomInstanceHandler();
    reader.parser = parser;

    var instances = [];
    await reader.read(
        (envelope.source != null) ? envelope.source : ((envelope.stream != null) ? envelope.stream : envelope.data),
        {
            contentType: envelope.contentType,
            contentLength: envelope.contentLength,
            onEmit: (instance) => {
                instances.push(instance);
            }
        }
    );

    if ((instances.length == 0) && (parser.result != null)) {
        instances.push(parser.result);
    }

    return instances;

}

dimseSocketTest("Test: NodeDimseCStoreScpSourceTransport reads one incoming C-STORE instance batch", async () => {

    var sourceTransport = new NodeDimseCStoreScpSourceTransport();
    var listenerAssociation = {
        host: "127.0.0.1",
        port: 0,
        calledAeTitle: "EASI_JS"
    };

    var listener = null;
    try {

        listener = await sourceTransport.start(listenerAssociation, {
            waitForFirstInstanceMs: 5000,
            batchIdleGraceMs: 75
        });

        var part10Bytes = new Uint8Array(await fs.readFile(sampleDicomPath));

        var cstoreScu = new NodeDimseCStoreScuTransport();
        var cstoreResult = await cstoreScu.write({
            host: listener.host,
            port: listener.port,
            callingAeTitle: "ORTHANC",
            calledAeTitle: listener.calledAeTitle
        }, part10Bytes);

        expect(cstoreResult.ok).toBe(true);
        expect(cstoreResult.dimseStatus).toBe(0x0000);

        var envelope = await sourceTransport.read(listenerAssociation, {
            waitForFirstInstanceMs: 1000,
            batchIdleGraceMs: 75
        });

        expect(envelope).toBeDefined();
        expect(typeof envelope.contentType).toBe("string");
        expect(envelope?.metadata?.dimse?.operation).toBe("c-store-scp");
        expect(Number.isFinite(envelope?.metadata?.dimse?.durationMs)).toBe(true);

        var instances = await parseEnvelopeToInstances(envelope);
        expect(instances.length).toBe(1);
        expect(instances[0]?.dataSet != null).toBe(true);
        expect(instances[0]?.dataSet?.attributes?.length > 0).toBe(true);

    }
    finally {
        await sourceTransport.close();
    }

}, 20000);

test("Test: NodeDimseCStoreScpSourceTransport validates onConcern callback type", () => {

    var sourceTransport = new NodeDimseCStoreScpSourceTransport();

    try {
        sourceTransport.resolveSettings({
            host: "127.0.0.1",
            port: 0,
            calledAeTitle: "EASI_JS"
        }, {
            onConcern: "not-a-function"
        });
    }
    catch (error) {
        expect(error instanceof Exception).toBe(true);
        expect(error.code).toBe(GeneralErrorCodes.InvalidParameter);
        return;
    }

    throw new Error("Expected invalid onConcern callback to throw.");

});

dimseSocketTest("Test: NodeDimseCStoreScpSourceTransport batches multiple incoming C-STORE instances", async () => {

    var sourceTransport = new NodeDimseCStoreScpSourceTransport();
    var listenerAssociation = {
        host: "127.0.0.1",
        port: 0,
        calledAeTitle: "EASI_JS"
    };

    var listener = null;
    try {

        listener = await sourceTransport.start(listenerAssociation, {
            waitForFirstInstanceMs: 5000,
            batchIdleGraceMs: 75
        });

        var part10Bytes = new Uint8Array(await fs.readFile(sampleDicomPath));
        var cstoreScu = new NodeDimseCStoreScuTransport();

        var first = await cstoreScu.write({
            host: listener.host,
            port: listener.port,
            callingAeTitle: "ORTHANC",
            calledAeTitle: listener.calledAeTitle
        }, part10Bytes);

        var second = await cstoreScu.write({
            host: listener.host,
            port: listener.port,
            callingAeTitle: "ORTHANC",
            calledAeTitle: listener.calledAeTitle
        }, part10Bytes);

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);

        var envelope = await sourceTransport.read(listenerAssociation, {
            waitForFirstInstanceMs: 1000,
            batchIdleGraceMs: 75
        });

        expect(String(envelope.contentType || "")).toContain("multipart/related");

        var instances = await parseEnvelopeToInstances(envelope);
        expect(instances.length).toBe(2);

    }
    finally {
        await sourceTransport.close();
    }

}, 20000);

dimseSocketTest("Test: NodeDimseCStoreScpSourceTransport enforces allowedCallingAeTitles policy", async () => {

    var sourceTransport = new NodeDimseCStoreScpSourceTransport();
    var listenerAssociation = {
        host: "127.0.0.1",
        port: 0,
        calledAeTitle: "EASI_JS",
        allowedCallingAeTitles: ["ORTHANC_ALLOWED"]
    };

    try {

        var listener = await sourceTransport.start(listenerAssociation, {
            waitForFirstInstanceMs: 5000,
            batchIdleGraceMs: 75
        });

        var part10Bytes = new Uint8Array(await fs.readFile(sampleDicomPath));
        var cstoreScu = new NodeDimseCStoreScuTransport();

        await expect(cstoreScu.write({
            host: listener.host,
            port: listener.port,
            callingAeTitle: "ORTHANC_BLOCKED",
            calledAeTitle: listener.calledAeTitle
        }, part10Bytes)).rejects.toBeInstanceOf(Error);

        var accepted = await cstoreScu.write({
            host: listener.host,
            port: listener.port,
            callingAeTitle: "ORTHANC_ALLOWED",
            calledAeTitle: listener.calledAeTitle
        }, part10Bytes);

        expect(accepted.ok).toBe(true);

        var envelope = await sourceTransport.read(listenerAssociation, {
            waitForFirstInstanceMs: 1000,
            batchIdleGraceMs: 75
        });
        var instances = await parseEnvelopeToInstances(envelope);
        expect(instances.length).toBe(1);

    }
    finally {
        await sourceTransport.close();
    }

}, 20000);

dimseSocketTest("Test: NodeDimseCStoreScpSourceTransport enforces maxActiveAssociations policy", async () => {

    var sourceTransport = new NodeDimseCStoreScpSourceTransport();
    var listenerAssociation = {
        host: "127.0.0.1",
        port: 0,
        calledAeTitle: "EASI_JS",
        maxActiveAssociations: 1
    };

    var holdSocket = null;

    try {

        var listener = await sourceTransport.start(listenerAssociation, {
            waitForFirstInstanceMs: 5000,
            batchIdleGraceMs: 75,
            associationTimeoutMs: 1000
        });

        holdSocket = net.createConnection({ host: listener.host, port: listener.port });
        await new Promise((resolve, reject) => {
            holdSocket.once("connect", resolve);
            holdSocket.once("error", reject);
        });

        var part10Bytes = new Uint8Array(await fs.readFile(sampleDicomPath));
        var cstoreScu = new NodeDimseCStoreScuTransport();

        await expect(cstoreScu.write({
            host: listener.host,
            port: listener.port,
            callingAeTitle: "ORTHANC",
            calledAeTitle: listener.calledAeTitle
        }, part10Bytes)).rejects.toBeInstanceOf(Error);

    }
    finally {

        if (holdSocket != null) {
            try {
                holdSocket.destroy();
            }
            catch (_error) {
            }
        }

        await sourceTransport.close();

    }

}, 20000);

dimseSocketTest("Test: NodeDimseCStoreScpSourceTransport enforces deniedRemoteHosts policy", async () => {

    var sourceTransport = new NodeDimseCStoreScpSourceTransport();
    var concerns = [];
    var listenerAssociation = {
        host: "127.0.0.1",
        port: 0,
        calledAeTitle: "EASI_JS",
        deniedRemoteHosts: ["127.0.0.1"],
        onConcern: (concern) => concerns.push(concern)
    };

    try {

        var listener = await sourceTransport.start(listenerAssociation, {
            waitForFirstInstanceMs: 5000,
            batchIdleGraceMs: 75
        });

        var part10Bytes = new Uint8Array(await fs.readFile(sampleDicomPath));
        var cstoreScu = new NodeDimseCStoreScuTransport();

        await expect(cstoreScu.write({
            host: listener.host,
            port: listener.port,
            callingAeTitle: "ORTHANC",
            calledAeTitle: listener.calledAeTitle
        }, part10Bytes)).rejects.toBeInstanceOf(Error);

        expect(Array.isArray(sourceTransport?._moveStore?.state?.policyRejections)).toBe(true);
        expect(sourceTransport._moveStore.state.policyRejections.length > 0).toBe(true);
        expect(sourceTransport._moveStore.state.policyRejections[0]?.reason).toBe("remote-host-denied");
        expect(concerns.length).toBeGreaterThan(0);
        expect(concerns[0]?.code).toBe("MoveStoreAssociationRejected");
        expect(concerns[0]?.category).toBe("Security");

    }
    finally {
        await sourceTransport.close();
    }

}, 20000);

dimseSocketTest("Test: NodeDimseCStoreScpSourceTransport enforces allowedRemoteHosts policy", async () => {

    var sourceTransport = new NodeDimseCStoreScpSourceTransport();
    var listenerAssociation = {
        host: "127.0.0.1",
        port: 0,
        calledAeTitle: "EASI_JS",
        allowedRemoteHosts: ["10.0.0.1"]
    };

    try {

        var listener = await sourceTransport.start(listenerAssociation, {
            waitForFirstInstanceMs: 5000,
            batchIdleGraceMs: 75,
            rejectWithAssociationRj: false
        });

        var part10Bytes = new Uint8Array(await fs.readFile(sampleDicomPath));
        var cstoreScu = new NodeDimseCStoreScuTransport();

        await expect(cstoreScu.write({
            host: listener.host,
            port: listener.port,
            callingAeTitle: "ORTHANC",
            calledAeTitle: listener.calledAeTitle
        }, part10Bytes)).rejects.toBeInstanceOf(Error);

        expect(Array.isArray(sourceTransport?._moveStore?.state?.policyRejections)).toBe(true);
        expect(sourceTransport._moveStore.state.policyRejections.length > 0).toBe(true);
        expect(sourceTransport._moveStore.state.policyRejections[0]?.reason).toBe("remote-host-not-allowed");

    }
    finally {
        await sourceTransport.close();
    }

}, 20000);

function listenerAssociation() {
    return { host: "127.0.0.1", port: 0, calledAeTitle: "EASI_JS" };
}

function fakeStoreServer(instances = []) {
    return {
        host: "127.0.0.1", port: 11112, closed: false,
        state: { instances, lastReceivedAt: Date.now() - 100, lastError: null, activeConnections: new Set() },
        close: jest.fn().mockImplementation(async function () { this.closed = true; })
    };
}

test.each([
    ["fractional port", { port: 11112.5 }], ["large port", { port: 65536 }],
    ["blank AE title", { calledAeTitle: " " }], ["long AE title", { calledAeTitle: "X".repeat(17) }],
    ["non-ASCII AE title", { calledAeTitle: "é" }], ["fractional batch", { maxBatchInstances: 1.5 }],
    ["fractional compaction", { compactThreshold: 1.5 }], ["small maximum", { maxPduLength: 7 }],
    ["invalid timeout", { associationTimeoutMs: -1 }], ["fractional association count", { maxActiveAssociations: 1.5 }],
    ["non-array SOP list", { storageSopClassUids: "1.2.3" }], ["invalid transfer syntax", { storageTransferSyntaxUids: ["invalid"] }]
])("C-STORE SCP rejects %s before opening a listener", (_label, overrides) => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    expect(() => transport.resolveSettings({ ...listenerAssociation(), ...overrides })).toThrow();
});

test("C-STORE SCP retains started listener TLS, storage syntax, and policy settings for reads", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    const store = fakeStoreServer([new Uint8Array([0, 0])]);
    transport._helper.startMoveStoreServer = jest.fn().mockResolvedValue(store);
    transport._helper.buildReadEnvelope = jest.fn().mockReturnValue({ source: new Uint8Array([0, 0]) });
    const tls = { key: "test-only-key", cert: "test-only-cert" };
    await transport.start(listenerAssociation(), {
        tls, maxPduLength: 1024, storageTransferSyntaxUids: ["1.2.840.10008.1.2.1"],
        allowedCallingAeTitles: ["TRUSTED"], batchIdleGraceMs: 0
    });
    await transport.read(listenerAssociation(), { batchIdleGraceMs: 0 });
    expect(transport._helper.startMoveStoreServer).toHaveBeenCalledTimes(1);
    expect(transport._listenerSettings.moveStoreTls).toBe(tls);
    expect(transport._listenerSettings.policy.allowedCallingAeTitles).toEqual(["TRUSTED"]);
    await transport.close();
});

test("C-STORE SCP restarts when explicitly requested storage capabilities change", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    const first = fakeStoreServer();
    const second = fakeStoreServer();
    transport._helper.startMoveStoreServer = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await transport.start(listenerAssociation(), { storageTransferSyntaxUids: ["1.2.840.10008.1.2.1"] });
    await transport.start(listenerAssociation(), { storageTransferSyntaxUids: ["1.2.840.10008.1.2"] });
    expect(first.close).toHaveBeenCalledTimes(1);
    expect(transport._helper.startMoveStoreServer).toHaveBeenCalledTimes(2);
    await transport.close();
});

test("C-STORE SCP serializes concurrent listener starts", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    transport._helper.startMoveStoreServer = jest.fn().mockResolvedValue(fakeStoreServer());
    const endpoints = await Promise.all([transport.start(listenerAssociation()), transport.start(listenerAssociation()), transport.start(listenerAssociation())]);
    expect(endpoints[0]).toEqual(endpoints[1]);
    expect(endpoints[1]).toEqual(endpoints[2]);
    expect(transport._helper.startMoveStoreServer).toHaveBeenCalledTimes(1);
    await transport.close();
});

test("C-STORE SCP fails a waiting read when its listener is closed", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    const store = fakeStoreServer();
    transport._helper.startMoveStoreServer = jest.fn().mockResolvedValue(store);
    await transport.start(listenerAssociation());
    const read = transport.read(listenerAssociation(), { waitForFirstInstanceMs: 1000 });
    const rejection = expect(read).rejects.toThrow(/closed/);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await transport.close();
    await rejection;
    expect(transport.listener).toBeNull();
});

test("C-STORE SCP aborts waiting without consuming a later batch", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    const store = fakeStoreServer();
    transport._helper.startMoveStoreServer = jest.fn().mockResolvedValue(store);
    transport._helper.buildReadEnvelope = jest.fn().mockReturnValue({ source: new Uint8Array([0, 0]) });
    await transport.start(listenerAssociation());
    const controller = new AbortController();
    const read = transport.read(listenerAssociation(), { signal: controller.signal, waitForFirstInstanceMs: 1000 });
    const rejection = expect(read).rejects.toThrow("stop waiting");
    controller.abort(new Error("stop waiting"));
    await rejection;
    expect(transport.listener).not.toBeNull();
    store.state.instances.push(new Uint8Array([0, 0]));
    await transport.read(listenerAssociation(), { batchIdleGraceMs: 0 });
    expect(transport._helper.buildReadEnvelope.mock.calls[0][0]).toHaveLength(1);
    await transport.close();
});

test("C-STORE SCP refuses concurrent reads so batches cannot be consumed twice", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    transport._helper.startMoveStoreServer = jest.fn().mockResolvedValue(fakeStoreServer());
    await transport.start(listenerAssociation());
    const controller = new AbortController();
    const read = transport.read(listenerAssociation(), { signal: controller.signal });
    const rejection = expect(read).rejects.toThrow();
    await expect(transport.read(listenerAssociation())).rejects.toThrow(/Concurrent reads/);
    controller.abort();
    await rejection;
    await transport.close();
});

test("C-STORE SCP compacts consumed batches while preserving queued instances", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    const store = fakeStoreServer([new Uint8Array([1, 1]), new Uint8Array([2, 2]), new Uint8Array([3, 3])]);
    transport._moveStore = store;
    const settings = transport.resolveSettings(listenerAssociation(), { maxBatchInstances: 2, compactThreshold: 2, batchIdleGraceMs: 0 });
    expect(await transport.waitForBatch(settings)).toEqual([new Uint8Array([1, 1]), new Uint8Array([2, 2])]);
    expect(store.state.instances).toEqual([new Uint8Array([3, 3])]);
    expect(await transport.waitForBatch(settings)).toEqual([new Uint8Array([3, 3])]);
});

test("C-STORE SCP reports one malformed association without poisoning all later reads", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    const store = fakeStoreServer();
    store.state.lastError = new Error("malformed peer request");
    transport._moveStore = store;
    const settings = transport.resolveSettings(listenerAssociation(), { batchIdleGraceMs: 0 });
    await expect(transport.waitForBatch(settings)).rejects.toThrow("malformed peer request");
    store.state.instances.push(new Uint8Array([0, 0]));
    await expect(transport.waitForBatch(settings)).resolves.toHaveLength(1);
});

test("C-STORE SCP closes a listener that finishes starting after an explicit close", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    const store = fakeStoreServer();
    let completeStart;
    transport._helper.startMoveStoreServer = jest.fn().mockReturnValue(new Promise((resolve) => { completeStart = resolve; }));
    const start = transport.start(listenerAssociation());
    const rejection = expect(start).rejects.toThrow(/closed during startup/);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await transport.close();
    completeStart(store);
    await rejection;
    expect(store.close).toHaveBeenCalledTimes(1);
    expect(transport.listener).toBeNull();
});

test("C-STORE SCP cancels startup when closed before the queued startup runs", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    transport._helper.startMoveStoreServer = jest.fn().mockResolvedValue(fakeStoreServer());
    const start = transport.start(listenerAssociation());
    const rejection = expect(start).rejects.toThrow(/closed during startup/);
    await transport.close();
    await rejection;
    expect(transport._helper.startMoveStoreServer).not.toHaveBeenCalled();
});

dimseSocketTest("C-STORE SCP close destroys an idle connected peer and rejects a waiting read", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    let socket;
    try {
        const listener = await transport.start(listenerAssociation());
        socket = net.createConnection({ host: listener.host, port: listener.port });
        socket.on("error", () => {});
        await new Promise((resolve, reject) => { socket.once("connect", resolve); socket.once("error", reject); });
        const read = transport.read(listenerAssociation(), { waitForFirstInstanceMs: 5000 });
        const rejection = expect(read).rejects.toThrow(/closed/);
        await transport.close();
        await rejection;
        expect(transport.listener).toBeNull();
    } finally {
        socket?.destroy();
        await transport.close();
    }
});

test("C-STORE SCP forwards command, individual dataset, and queued dataset limits", async () => {
    const transport = new NodeDimseCStoreScpSourceTransport();
    const first = fakeStoreServer();
    const second = fakeStoreServer();
    transport._helper.startMoveStoreServer = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await transport.start(listenerAssociation(), { maxCommandBytes: 1024, maxDataSetBytes: 4096, maxTotalDataSetBytes: 8192 });
    expect(transport._helper.startMoveStoreServer.mock.calls[0][1]).toMatchObject({
        maxCommandBytes: 1024, maxDataSetBytes: 4096, maxTotalDataSetBytes: 8192
    });
    await transport.start(listenerAssociation(), { maxTotalDataSetBytes: 16384 });
    expect(first.close).toHaveBeenCalledTimes(1);
    expect(transport._helper.startMoveStoreServer.mock.calls[1][1]).toMatchObject({
        maxCommandBytes: 1024, maxDataSetBytes: 4096, maxTotalDataSetBytes: 16384
    });
    await transport.close();
});

test.each([{ maxCommandBytes: 0 }, { maxDataSetBytes: -1 }, { maxTotalDataSetBytes: 0.5 }])("C-STORE SCP rejects invalid byte limits %j", (options) => {
    expect(() => new NodeDimseCStoreScpSourceTransport().resolveSettings(listenerAssociation(), options)).toThrow(/byte limit/);
});

dimseSocketTest("C-STORE SCP answers C-ECHO without creating an image, then accepts storage", async () => {
    const sourceTransport = new NodeDimseCStoreScpSourceTransport();
    try {
        const listener = await sourceTransport.start(listenerAssociation());
        const association = { host: listener.host, port: listener.port, callingAeTitle: "EASI_PROBE", calledAeTitle: listener.calledAeTitle };
        const echo = await new NodeDimseQueryRetrieveSourceTransport().echo(association, { messageId: 7 });
        expect(echo).toMatchObject({ ok: true, status: 0, dimse: { messageIdBeingRespondedTo: 7 } });
        expect(sourceTransport._moveStore.state.instances).toHaveLength(0);
        const part10Bytes = new Uint8Array(await fs.readFile(sampleDicomPath));
        expect(await new NodeDimseCStoreScuTransport().write(association, part10Bytes)).toMatchObject({ ok: true, dimseStatus: 0 });
        const envelope = await sourceTransport.read(listenerAssociation(), { batchIdleGraceMs: 0 });
        expect(await parseEnvelopeToInstances(envelope)).toHaveLength(1);
        expect(sourceTransport._moveStore.state.instances).toHaveLength(0);
    } finally {
        await sourceTransport.close();
    }
});
