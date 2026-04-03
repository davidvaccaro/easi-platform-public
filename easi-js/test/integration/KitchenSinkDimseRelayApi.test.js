import { createKitchenSinkServer } from "../../samples/kitchen-sink/server.js";
import Tag from "../../src/dicom/Tag.js";
import { dimseSocketTest } from "../transports/dimse/DimseSocketTestGate.js";

function createMockEasi(processImplementation, capture) {

    return {
        pipelineBuilder() {

            var builder = {
                fromDimseAssociation(association, transport) {
                    capture.sourceAssociation = association;
                    capture.sourceTransport = transport;
                    return builder;
                },
                ofDicomData() {
                    capture.ofDicomData = true;
                    return builder;
                },
                toInstances() {
                    capture.toInstances = true;
                    return builder;
                },
                toFHIRImagingStudy(profile) {
                    capture.toFHIRImagingStudy = profile ?? true;
                    return builder;
                },
                toMapping(mapping) {
                    capture.toMapping = mapping;
                    return builder;
                },
                withDeIdentification(deIdentificationMask) {
                    capture.deIdentificationMask = deIdentificationMask;
                    return builder;
                },
                withHandler(handler) {
                    capture.handler = handler;
                    return builder;
                },
                intoDimseAssociation(association, options) {
                    capture.destinationAssociation = association;
                    capture.destinationOptions = options;
                    return builder;
                },
                build() {
                    capture.buildCalled = true;
                    return {
                        process: async (source, options) => {
                            capture.processSource = source;
                            capture.processOptions = options;
                            return await processImplementation(source, options);
                        }
                    };
                }
            };

            return builder;

        }
    };

}

async function listen(server) {
    await new Promise((resolve, reject) => {
        server.listen(0, "127.0.0.1", () => resolve());
        server.once("error", reject);
    });
}

async function close(server) {
    await new Promise((resolve) => {
        server.close(() => resolve());
    });
}

function relayRequestBody() {
    return {
        studyInstanceUid: "1.2.840.113711.2964254.1.9032.770727829.26.2116281012.1353110",
        seriesInstanceUid: "1.2.840.113619.2.416.274526644159878389490005373725162966144",
        sopInstanceUid: "1.2.840.113619.2.416.112733676467352283670809522901727305191",
        queryRetrieveModel: "study-root",
        reassignUids: true
    };
}

function createMockInstanceSummary(values = {}) {

    return {
        dataSet: {
            value(tag) {
                return values[tag?.ID] ?? null;
            }
        }
    };

}

function cfindRequestBody(overrides = null) {

    return Object.assign({
        queryRetrieveModel: "study-root",
        outputMode: "instance",
        modality: "MR",
        dimseAssociation: {
            host: "127.0.0.1",
            port: 4242,
            callingAeTitle: "EASI_JS",
            calledAeTitle: "ORTHANC"
        }
    }, overrides || {});

}

function cgetRequestBody(overrides = null) {

    return Object.assign({
        queryRetrieveModel: "study-root",
        outputMode: "instance",
        orthancHttpUrl: "http://localhost:8042",
        dimseAssociation: {
            host: "127.0.0.1",
            port: 4242,
            callingAeTitle: "EASI_JS",
            calledAeTitle: "ORTHANC"
        }
    }, overrides || {});

}

dimseSocketTest("Test: Kitchen sink DIMSE C-MOVE relay API returns success and wires pipeline options", async () => {

    var capture = {};
    var sourceTransport = { kind: "mock-source-transport" };
    var destinationTransport = { kind: "mock-destination-transport" };
    var writerHandler = { kind: "mock-writer-handler" };

    var mockEasi = createMockEasi(async (_source, options) => {

        await options.onConcern({
            severity: "warning",
            code: "UnitTestConcern",
            message: "unit test concern"
        });

        return {
            ok: true,
            dimseStatus: 0x0000,
            bytesWritten: 1024,
            metadata: {
                results: [{
                    ok: true,
                    dimseStatus: 0x0000,
                    metadata: {
                        sopClassUid: "1.2.840.10008.5.1.4.1.1.7",
                        sopInstanceUid: "2.25.1000"
                    }
                }]
            }
        };

    }, capture);

    var server = createKitchenSinkServer({
        dependencies: {
            easi: mockEasi,
            createSourceTransport: () => sourceTransport,
            createDestinationTransport: () => destinationTransport,
            createSynchronizedDicomWriterHandler: () => writerHandler
        }
    });

    try {

        await listen(server);
        var address = server.address();
        var url = `http://127.0.0.1:${address.port}/easi-js/samples/kitchen-sink/api/dimse/cmove-deidentify-relay`;

        var response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(relayRequestBody())
        });

        expect(response.status).toBe(200);
        var payload = await response.json();

        expect(payload.success).toBe(true);
        expect(payload.operation).toBe("c-move");
        expect(payload.mode).toBe("deidentify-relay");
        expect(payload.relayResult.ok).toBe(true);
        expect(payload.relayResult.dimseStatusHex).toBe("0x0");
        expect(payload.concernCount).toBe(1);
        expect(Array.isArray(payload.concerns)).toBe(true);
        expect(payload.concerns[0].code).toBe("UnitTestConcern");

        expect(capture.ofDicomData).toBe(true);
        expect(capture.buildCalled).toBe(true);
        expect(capture.sourceTransport).toBe(sourceTransport);
        expect(capture.destinationOptions.transport).toBe(destinationTransport);
        expect(capture.handler).toBe(writerHandler);
        expect(capture.deIdentificationMask instanceof Map).toBe(true);
        expect(capture.deIdentificationMask.has(Tag.SOPInstanceUID.ID)).toBe(true);
        expect(capture.processSource).toBeNull();
        expect(capture.processOptions.operation).toBe("c-move");
        expect(capture.processOptions.queryRetrieveLevel).toBe("IMAGE");
        expect(capture.processOptions.sopInstanceUid).toBe(relayRequestBody().sopInstanceUid);
        expect(typeof capture.processOptions.onConcern).toBe("function");

    }
    finally {
        await close(server);
    }

}, 20000);

dimseSocketTest("Test: Kitchen sink DIMSE C-MOVE relay API surfaces failed part metadata on C-STORE failure", async () => {

    var capture = {};
    var mockEasi = createMockEasi(async () => ({
        ok: false,
        dimseStatus: 0xA900,
        bytesWritten: 0,
        metadata: {
            results: [{
                ok: false,
                dimseStatus: 0xA900,
                metadata: {
                    sopClassUid: "1.2.840.10008.5.1.4.1.1.7",
                    sopInstanceUid: "1.2.3.4.5",
                    sourceMetaSopInstanceUid: "9.8.7.6.5",
                    transferSyntaxUid: "1.2.840.10008.1.2.1",
                    acceptedTransferSyntaxUid: "1.2.840.10008.1.2.1"
                }
            }]
        }
    }), capture);

    var server = createKitchenSinkServer({
        dependencies: {
            easi: mockEasi,
            createSourceTransport: () => ({ kind: "mock-source-transport" }),
            createDestinationTransport: () => ({ kind: "mock-destination-transport" }),
            createSynchronizedDicomWriterHandler: () => ({ kind: "mock-writer-handler" })
        }
    });

    try {

        await listen(server);
        var address = server.address();
        var url = `http://127.0.0.1:${address.port}/easi-js/samples/kitchen-sink/api/dimse/cmove-deidentify-relay`;

        var response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(relayRequestBody())
        });

        expect(response.status).toBe(500);
        var payload = await response.json();

        expect(payload.success).toBe(false);
        expect(payload.message).toContain("DIMSE C-STORE relay failed with status 0xA900");
        expect(payload.message).toContain("failed part status: 0xA900");
        expect(payload.message).toContain("sopClassUid: 1.2.840.10008.5.1.4.1.1.7");
        expect(payload.message).toContain("sopInstanceUid: 1.2.3.4.5");
        expect(payload.message).toContain("sourceMetaSopInstanceUid: 9.8.7.6.5");
        expect(payload.message).toContain("transferSyntaxUid: 1.2.840.10008.1.2.1");
        expect(payload.message).toContain("acceptedTransferSyntaxUid: 1.2.840.10008.1.2.1");
        expect(capture.processOptions.operation).toBe("c-move");

    }
    finally {
        await close(server);
    }

}, 20000);

dimseSocketTest("Test: Kitchen sink DIMSE C-MOVE relay API forwards moveStorePolicy", async () => {

    var capture = {};
    var mockEasi = createMockEasi(async () => ({
        ok: true,
        dimseStatus: 0x0000,
        bytesWritten: 1,
        metadata: {
            results: [{
                ok: true,
                dimseStatus: 0x0000,
                metadata: {
                    sopClassUid: "1.2.840.10008.5.1.4.1.1.7",
                    sopInstanceUid: "2.25.1000"
                }
            }]
        }
    }), capture);

    var server = createKitchenSinkServer({
        dependencies: {
            easi: mockEasi,
            createSourceTransport: () => ({ kind: "mock-source-transport" }),
            createDestinationTransport: () => ({ kind: "mock-destination-transport" }),
            createSynchronizedDicomWriterHandler: () => ({ kind: "mock-writer-handler" })
        }
    });

    try {

        await listen(server);
        var address = server.address();
        var url = `http://127.0.0.1:${address.port}/easi-js/samples/kitchen-sink/api/dimse/cmove-deidentify-relay`;

        var requestBody = relayRequestBody();
        requestBody.moveStorePolicy = {
            allowedCallingAeTitles: ["ORTHANC"],
            deniedRemoteHosts: ["10.1.2.3"],
            maxActiveAssociations: 4,
            associationTimeoutMs: 9000,
            rejectWithAssociationRj: true
        };

        var response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        expect(response.status).toBe(200);
        var payload = await response.json();

        expect(payload.success).toBe(true);
        expect(payload.request?.moveStorePolicy).toBeDefined();
        expect(payload.request.moveStorePolicy.allowedCallingAeTitles).toEqual(["ORTHANC"]);
        expect(payload.request.moveStorePolicy.deniedRemoteHosts).toEqual(["10.1.2.3"]);
        expect(payload.request.moveStorePolicy.maxActiveAssociations).toBe(4);
        expect(payload.request.moveStorePolicy.associationTimeoutMs).toBe(9000);
        expect(payload.request.moveStorePolicy.rejectWithAssociationRj).toBe(true);

        expect(capture.processOptions?.moveStorePolicy).toBeDefined();
        expect(capture.processOptions.moveStorePolicy.allowedCallingAeTitles).toEqual(["ORTHANC"]);
        expect(capture.processOptions.moveStorePolicy.deniedRemoteHosts).toEqual(["10.1.2.3"]);
        expect(capture.processOptions.moveStorePolicy.maxActiveAssociations).toBe(4);
        expect(capture.processOptions.moveStorePolicy.associationTimeoutMs).toBe(9000);
        expect(capture.processOptions.moveStorePolicy.rejectWithAssociationRj).toBe(true);

    }
    finally {
        await close(server);
    }

}, 20000);

dimseSocketTest("Test: Kitchen sink DIMSE C-FIND studies API returns instance summaries for modality query", async () => {

    var capture = {};
    var sourceTransport = { kind: "mock-source-transport" };

    var firstStudyUid = "1.2.3.4.5.1";
    var secondStudyUid = "1.2.3.4.5.2";
    var firstSopInstanceUid = "1.2.3.4.5.1.100";
    var secondSopInstanceUid = "1.2.3.4.5.2.200";

    var mockResult = [
        createMockInstanceSummary({
            [Tag.StudyInstanceUID.ID]: firstStudyUid,
            [Tag.SeriesInstanceUID.ID]: "1.2.3.4.5.1.1",
            [Tag.SOPInstanceUID.ID]: firstSopInstanceUid,
            [Tag.Modality.ID]: "MR",
            [Tag.StudyDate.ID]: "20260101",
            [Tag.ModalitiesInStudy.ID]: "MR"
        }),
        createMockInstanceSummary({
            [Tag.StudyInstanceUID.ID]: secondStudyUid,
            [Tag.SeriesInstanceUID.ID]: "1.2.3.4.5.2.2",
            [Tag.SOPInstanceUID.ID]: secondSopInstanceUid,
            [Tag.Modality.ID]: "MR",
            [Tag.StudyDate.ID]: "20260102",
            [Tag.ModalitiesInStudy.ID]: "MR"
        })
    ];

    var mockEasi = createMockEasi(async () => mockResult, capture);

    var server = createKitchenSinkServer({
        dependencies: {
            easi: mockEasi,
            createSourceTransport: () => sourceTransport
        }
    });

    try {

        await listen(server);
        var address = server.address();
        var url = `http://127.0.0.1:${address.port}/easi-js/samples/kitchen-sink/api/dimse/cfind-studies`;

        var response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cfindRequestBody())
        });

        expect(response.status).toBe(200);
        var payload = await response.json();

        expect(payload.success).toBe(true);
        expect(payload.operation).toBe("c-find");
        expect(payload.outputMode).toBe("instance");
        expect(payload.resultCount).toBe(2);
        expect(payload.concernCount).toBe(0);
        expect(Array.isArray(payload.instanceSummaries)).toBe(true);
        expect(payload.instanceSummaries[0].studyInstanceUid).toBe(firstStudyUid);
        expect(payload.instanceSummaries[1].studyInstanceUid).toBe(secondStudyUid);
        expect(payload.instanceSummaries[0].sopInstanceUid).toBe(firstSopInstanceUid);
        expect(payload.instanceSummaries[1].sopInstanceUid).toBe(secondSopInstanceUid);

        expect(capture.ofDicomData).toBe(true);
        expect(capture.buildCalled).toBe(true);
        expect(capture.sourceTransport).toBe(sourceTransport);
        expect(capture.toInstances).toBe(true);
        expect(capture.processOptions.operation).toBe("c-find");
        expect(capture.processOptions.queryRetrieveLevel).toBe("IMAGE");
        expect(capture.processOptions.keys["00080060"]).toBe("MR");
        expect(capture.processOptions.keyVrs["00080060"]).toBe("CS");
        expect(typeof capture.processOptions.onConcern).toBe("function");

    }
    finally {
        await close(server);
    }

}, 20000);

dimseSocketTest("Test: Kitchen sink DIMSE C-GET API auto-discovers identifiers and forwards storage contexts", async () => {

    var capture = {};
    var sourceTransport = { kind: "mock-source-transport" };
    var discovered = {
        studyInstanceUid: "1.2.826.0.1.3680043.2.1125.100",
        seriesInstanceUid: "1.2.826.0.1.3680043.2.1125.100.1",
        sopInstanceUid: "1.2.826.0.1.3680043.2.1125.100.1.1",
        sopClassUid: "1.2.840.10008.5.1.4.1.1.2",
        transferSyntaxUid: "1.2.840.10008.1.2.4.90"
    };

    var mockResultValues = {
        [Tag.StudyInstanceUID.ID]: discovered.studyInstanceUid,
        [Tag.SeriesInstanceUID.ID]: discovered.seriesInstanceUid,
        [Tag.SOPInstanceUID.ID]: discovered.sopInstanceUid,
        [Tag.SOPClassUID.ID]: discovered.sopClassUid,
        [Tag.Modality.ID]: "CT"
    };
    var mockResult = {
        dataSet: {
            value(tag) {
                return mockResultValues[tag?.ID] ?? null;
            },
            has() {
                return false;
            },
            attributes: []
        },
        metaSet: {
            transferSyntaxUID: { ID: discovered.transferSyntaxUid },
            attributes: []
        }
    };

    var mockEasi = createMockEasi(async () => mockResult, capture);

    var server = createKitchenSinkServer({
        dependencies: {
            easi: mockEasi,
            createSourceTransport: () => sourceTransport,
            discoverOrthancInstanceIdentifiers: async () => discovered
        }
    });

    try {

        await listen(server);
        var address = server.address();
        var url = `http://127.0.0.1:${address.port}/easi-js/samples/kitchen-sink/api/dimse/cget-instance`;

        var response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cgetRequestBody())
        });

        expect(response.status).toBe(200);
        var payload = await response.json();

        expect(payload.success).toBe(true);
        expect(payload.operation).toBe("c-get");
        expect(payload.outputMode).toBe("instance");
        expect(payload.usedOrthancDiscovery).toBe(true);
        expect(payload.request.studyInstanceUid).toBe(discovered.studyInstanceUid);
        expect(payload.request.seriesInstanceUid).toBe(discovered.seriesInstanceUid);
        expect(payload.request.sopInstanceUid).toBe(discovered.sopInstanceUid);

        expect(capture.ofDicomData).toBe(true);
        expect(capture.buildCalled).toBe(true);
        expect(capture.sourceTransport).toBe(sourceTransport);
        expect(capture.toInstances).toBe(true);
        expect(capture.processOptions.operation).toBe("c-get");
        expect(capture.processOptions.queryRetrieveLevel).toBe("IMAGE");
        expect(capture.processOptions.studyInstanceUid).toBe(discovered.studyInstanceUid);
        expect(capture.processOptions.seriesInstanceUid).toBe(discovered.seriesInstanceUid);
        expect(capture.processOptions.sopInstanceUid).toBe(discovered.sopInstanceUid);
        expect(Array.isArray(capture.processOptions.storageSopClassUids)).toBe(true);
        expect(capture.processOptions.storageSopClassUids).toContain(discovered.sopClassUid);
        expect(Array.isArray(capture.processOptions.storageTransferSyntaxUids)).toBe(true);
        expect(capture.processOptions.storageTransferSyntaxUids).toContain("1.2.840.10008.1.2.1");
        expect(capture.processOptions.storageTransferSyntaxUids).toContain(discovered.transferSyntaxUid);
        expect(typeof capture.processOptions.onConcern).toBe("function");

    }
    finally {
        await close(server);
    }

}, 20000);

dimseSocketTest("Test: Kitchen sink DIMSE C-FIND studies API returns FHIR ImagingStudy list", async () => {

    var capture = {};
    var sourceTransport = { kind: "mock-source-transport" };

    var studyUid = "1.2.840.113711.2964254.1.9032.770727829.26.2116281012.1353110";
    var fhirStudy = {
        resourceType: "ImagingStudy",
        status: "available",
        identifier: [{ system: "urn:dicom:uid", value: `urn:oid:${studyUid}` }],
        description: "CT CHEST",
        modality: [{ system: "http://dicom.nema.org/resources/ontology/DCM", code: "CT" }],
        numberOfSeries: 4,
        numberOfInstances: 228,
        series: []
    };
    var nonCtStudy = {
        resourceType: "ImagingStudy",
        status: "available",
        identifier: [{ system: "urn:dicom:uid", value: "urn:oid:9.8.7.6.5.4.3.2.1" }],
        description: "MR BRAIN",
        modality: [{ system: "http://dicom.nema.org/resources/ontology/DCM", code: "MR" }],
        numberOfSeries: 2,
        numberOfInstances: 56,
        series: []
    };
    var mockEasi = createMockEasi(async (_source, options) => {

        if (options?.queryRetrieveLevel === "IMAGE") {
            if (options?.keys?.["00080060"] === "CT")
                return [fhirStudy];

            return [fhirStudy, nonCtStudy];
        }

        if (options?.queryRetrieveLevel === "STUDY")
            return [fhirStudy, nonCtStudy];

        return [fhirStudy];

    }, capture);

    var server = createKitchenSinkServer({
        dependencies: {
            easi: mockEasi,
            createSourceTransport: () => sourceTransport
        }
    });

    try {

        await listen(server);
        var address = server.address();
        var url = `http://127.0.0.1:${address.port}/easi-js/samples/kitchen-sink/api/dimse/cfind-studies`;

        var response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cfindRequestBody({
                outputMode: "fhir-imaging-study",
                modality: "CT"
            }))
        });

        expect(response.status).toBe(200);
        var payload = await response.json();

        expect(payload.success).toBe(true);
        expect(payload.operation).toBe("c-find");
        expect(payload.outputMode).toBe("fhir-imaging-study");
        expect(payload.resultCount).toBe(1);
        expect(payload.concernCount).toBe(0);
        expect(Array.isArray(payload.fhirImagingStudies)).toBe(true);
        expect(payload.fhirImagingStudies[0].resourceType).toBe("ImagingStudy");
        expect(payload.fhirImagingStudies[0].identifier[0].value).toBe(`urn:oid:${studyUid}`);
        expect(payload.fhirImagingStudies[0].description).toBe("CT CHEST");
        expect(payload.fhirImagingStudies[0].modality[0].code).toBe("CT");
        expect(payload.fhirImagingStudies[0].numberOfSeries).toBe(4);
        expect(payload.fhirImagingStudies[0].numberOfInstances).toBe(228);

        expect(capture.ofDicomData).toBe(true);
        expect(capture.buildCalled).toBe(true);
        expect(capture.sourceTransport).toBe(sourceTransport);
        expect(capture.toFHIRImagingStudy).toBe("study-summary");
        expect(capture.toInstances).not.toBe(true);
        expect(capture.toMapping).toBeUndefined();
        expect(capture.processOptions.operation).toBe("c-find");
        expect(capture.processOptions.queryRetrieveLevel).toBe("IMAGE");
        expect(capture.processOptions.keys["00080060"]).toBe("CT");
        expect(capture.processOptions.keyVrs["00080060"]).toBe("CS");
        expect(typeof capture.processOptions.onEmit).toBe("function");
        expect(typeof capture.processOptions.onConcern).toBe("function");

    }
    finally {
        await close(server);
    }

}, 20000);

dimseSocketTest("Test: Kitchen sink DIMSE C-FIND studies API collects multipart emissions instead of only final result", async () => {

    var capture = {};
    var sourceTransport = { kind: "mock-source-transport" };

    var firstStudyUid = "1.2.3.4.10.1";
    var secondStudyUid = "1.2.3.4.10.2";
    var firstStudy = {
        resourceType: "ImagingStudy",
        status: "available",
        identifier: [{ system: "urn:dicom:uid", value: `urn:oid:${firstStudyUid}` }],
        modality: [{ system: "http://dicom.nema.org/resources/ontology/DCM", code: "CT" }],
        series: []
    };
    var secondStudy = {
        resourceType: "ImagingStudy",
        status: "available",
        identifier: [{ system: "urn:dicom:uid", value: `urn:oid:${secondStudyUid}` }],
        modality: [{ system: "http://dicom.nema.org/resources/ontology/DCM", code: "CT" }],
        series: []
    };

    var mockEasi = createMockEasi(async (_source, options) => {

        // Simulate multipart behavior where process() returns only final part
        // unless the caller captures per-part emissions.
        await options.onConcern({
            severity: "warning",
            code: "MultipartConcern",
            message: "multi concern"
        });
        await options.onEmit(firstStudy);
        await options.onEmit(secondStudy);
        return secondStudy;

    }, capture);

    var server = createKitchenSinkServer({
        dependencies: {
            easi: mockEasi,
            createSourceTransport: () => sourceTransport
        }
    });

    try {

        await listen(server);
        var address = server.address();
        var url = `http://127.0.0.1:${address.port}/easi-js/samples/kitchen-sink/api/dimse/cfind-studies`;

        var response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cfindRequestBody({
                outputMode: "fhir-imaging-study",
                modality: "CT"
            }))
        });

        expect(response.status).toBe(200);
        var payload = await response.json();

        expect(payload.success).toBe(true);
        expect(payload.outputMode).toBe("fhir-imaging-study");
        expect(payload.resultCount).toBe(2);
        expect(payload.concernCount).toBe(1);
        expect(payload.concerns[0].code).toBe("MultipartConcern");
        expect(payload.fhirImagingStudies[0].identifier[0].value).toBe(`urn:oid:${firstStudyUid}`);
        expect(payload.fhirImagingStudies[1].identifier[0].value).toBe(`urn:oid:${secondStudyUid}`);
        expect(typeof capture.processOptions.onEmit).toBe("function");
        expect(typeof capture.processOptions.onConcern).toBe("function");

    }
    finally {
        await close(server);
    }

}, 20000);
