import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";

import PartStreamReader from "../../../src/readers/PartStreamReader.js";
import DicomDataParser from "../../../src/parsers/DicomDataParser.js";
import DicomInstanceHandler from "../../../src/handlers/terminals/DicomInstanceHandler.js";
import NodeDimseCStoreScuTransport from "../../../src/transports/dimse/NodeDimseCStoreScuTransport.js";
import NodeDimseCStoreScpSourceTransport from "../../../src/transports/dimse/NodeDimseCStoreScpSourceTransport.js";
import Exception, { GeneralErrorCodes } from "../../../src/environment/Exception.js";
import { dimseSocketTest } from "./DimseSocketTestGate.js";

const sampleDicomPath = path.resolve(process.cwd(), "../data/dicoms/0002.dcm");

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
