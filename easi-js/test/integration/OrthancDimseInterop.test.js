import EASI from "../../src/EASI.js";
import Tag from "../../src/dicom/Tag.js";
import NodeDimseCStoreScuTransport from "../../src/transports/dimse/NodeDimseCStoreScuTransport.js";
import NodeDimseCStoreScpSourceTransport from "../../src/transports/dimse/NodeDimseCStoreScpSourceTransport.js";
import NodeDimseQueryRetrieveSourceTransport from "../../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";
import { createFhirR4Validator } from "../validation/fhir-r4/validate.js";
import {
    createSyntheticDicom, createSyntheticStudy, SECONDARY_CAPTURE_SOP_CLASS_UID,
    EXPLICIT_VR_LITTLE_ENDIAN, IMPLICIT_VR_LITTLE_ENDIAN
} from "../fixtures/dimse/SyntheticDicom.js";

const SHOULD_RUN_ORTHANC_DIMSE = process.env.RUN_ORTHANC_DIMSE === "true";
const SHOULD_RUN_ORTHANC_DIMSE_MOVE = process.env.RUN_ORTHANC_DIMSE_MOVE === "true";
const ORTHANC_HTTP_URL = process.env.ORTHANC_HTTP_URL || "http://127.0.0.1:8042";
const ORTHANC_HTTP_USERNAME = process.env.ORTHANC_HTTP_USERNAME || null;
const ORTHANC_HTTP_PASSWORD = process.env.ORTHANC_HTTP_PASSWORD || null;
const ORTHANC_MOVE_DEST_AE = process.env.ORTHANC_MOVE_DEST_AE || "EASI_MOVE_DEST";
const ORTHANC_MOVE_STORE_PORT = Number(process.env.ORTHANC_MOVE_STORE_PORT || 4104);

const association = {
    host: process.env.ORTHANC_DIMSE_HOST || "127.0.0.1",
    port: Number(process.env.ORTHANC_DIMSE_PORT || 4242),
    calledAeTitle: process.env.ORTHANC_DIMSE_CALLED_AE || "ORTHANC",
    callingAeTitle: process.env.ORTHANC_DIMSE_CALLING_AE || "EASI_JS",
    timeoutMs: 10000
};

async function orthancRequest(path, method = "GET", body = null) {
    var headers = { Accept: "application/json" };
    if (ORTHANC_HTTP_USERNAME != null && ORTHANC_HTTP_PASSWORD != null) {
        headers.Authorization = `Basic ${Buffer.from(`${ORTHANC_HTTP_USERNAME}:${ORTHANC_HTTP_PASSWORD}`, "utf8").toString("base64")}`;
    }
    if (body != null) {
        headers["Content-Type"] = "application/json";
    }
    var response = await fetch(`${ORTHANC_HTTP_URL}${path}`, {
        method, headers, body: body == null ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
    });
    if (response.ok != true) {
        throw new Error(`Orthanc ${method} '${path}' failed (${response.status}): ${await response.text()}`);
    }
    return await response.json();
}

async function findFixtureStudies(studyInstanceUid) {
    return await orthancRequest("/tools/find", "POST", {
        Level: "Study", Query: { StudyInstanceUID: studyInstanceUid }
    });
}

function buildPipeline() {
    return EASI.pipelineBuilder().
        fromDimseAssociation(association, new NodeDimseQueryRetrieveSourceTransport()).
        ofDicomData().toInstances().build();
}

function queryOptions(identifiers, extra = {}) {
    return Object.assign({
        performFind: false,
        queryRetrieveModel: process.env.ORTHANC_DIMSE_QR_MODEL || "study-root",
        queryRetrieveLevel: "STUDY",
        studyInstanceUid: identifiers.studyInstanceUid,
        storageSopClassUids: [SECONDARY_CAPTURE_SOP_CLASS_UID]
    }, extra);
}

function assertStoredInstances(result, identifiers) {
    var instances = result.toArray();
    expect(instances).toHaveLength(identifiers.length);
    expect(instances.map((instance) => instance.dataSet.value(Tag.SOPInstanceUID)).sort()).
        toEqual(identifiers.map((item) => item.sopInstanceUid).sort());
    for (var instance of instances) {
        var expected = identifiers.find((item) => item.sopInstanceUid == instance.dataSet.value(Tag.SOPInstanceUID));
        expect(instance.dataSet.value(Tag.StudyInstanceUID)).toBe(expected.studyInstanceUid);
        expect(instance.dataSet.value(Tag.SeriesInstanceUID)).toBe(expected.seriesInstanceUid);
        expect(instance.dataSet.value(Tag.SOPClassUID)).toBe(SECONDARY_CAPTURE_SOP_CLASS_UID);
        expect(instance.dataSet.value(Tag.PatientID)).toBe(expected.patientId);
        expect(instance.dataSet.value(Tag.Rows)).toBe(1);
        expect(instance.dataSet.value(Tag.Columns)).toBe(1);
        expect(Array.from(instance.dataSet.value(Tag.PixelData))).toEqual([expected.seriesNumber, 0]);
    }
}

function assertSuccessfulRetrieve(pipeline, count) {
    var response = pipeline.reader.lastMetadata.dimse.finalResponse;
    expect(response).toMatchObject({ status: 0, completed: count, failed: 0, warning: 0 });
    if (response.remaining != null) {
        expect(response.remaining).toBe(0);
    }
}

const interopDescribe = SHOULD_RUN_ORTHANC_DIMSE || SHOULD_RUN_ORTHANC_DIMSE_MOVE ? describe : describe.skip;
const orthancDimseTest = SHOULD_RUN_ORTHANC_DIMSE ? test : test.skip;
const orthancDimseMoveTest = SHOULD_RUN_ORTHANC_DIMSE_MOVE ? test : test.skip;

interopDescribe("Orthanc independent DIMSE peer with synthetic data", () => {

    var identifiers = createSyntheticStudy();
    var storeResults = [];

    beforeAll(async () => {
        var system = await orthancRequest("/system");
        expect(typeof system.Version).toBe("string");
        var store = new NodeDimseCStoreScuTransport();
        for (var index = 0; index < identifiers.length; index++) {
            var transferSyntaxUid = index == 0 ? EXPLICIT_VR_LITTLE_ENDIAN : IMPLICIT_VR_LITTLE_ENDIAN;
            storeResults.push(await store.write(association, createSyntheticDicom(identifiers[index], transferSyntaxUid)));
        }
        expect(storeResults.map((result) => result.status)).toEqual([0, 0]);
    }, 60000);

    afterAll(async () => {
        // The random fixture UID isolates cleanup from any existing server data.
        for (var studyId of await findFixtureStudies(identifiers[0].studyInstanceUid)) {
            await orthancRequest(`/studies/${studyId}`, "DELETE");
        }
    }, 20000);

    orthancDimseTest("C-ECHO receives a successful Verification response", async () => {
        var result = await new NodeDimseQueryRetrieveSourceTransport().echo(association);
        expect(result.ok).toBe(true);
        expect(result.status).toBe(0);
        expect(result.dimse.messageIdBeingRespondedTo).toBe(result.dimse.messageId);
    }, 30000);

    orthancDimseTest("C-STORE sends explicit and implicit VR little endian objects visible to Orthanc", async () => {
        expect(storeResults.every((result) => result.ok == true)).toBe(true);
        var studyIds = await findFixtureStudies(identifiers[0].studyInstanceUid);
        expect(studyIds).toHaveLength(1);
        var study = await orthancRequest(`/studies/${studyIds[0]}`);
        expect(study.MainDicomTags.StudyInstanceUID).toBe(identifiers[0].studyInstanceUid);
        expect(study.Series).toHaveLength(2);
        for (var seriesId of study.Series) {
            var series = await orthancRequest(`/series/${seriesId}`);
            expect(series.Instances).toHaveLength(1);
            var tags = await orthancRequest(`/instances/${series.Instances[0]}/simplified-tags`);
            expect(identifiers.map((item) => item.sopInstanceUid)).toContain(tags.SOPInstanceUID);
            expect(tags.PatientID).toBe(identifiers[0].patientId);
        }
    }, 30000);

    orthancDimseTest("C-FIND returns the matching study and requested study count", async () => {
        var pipeline = buildPipeline();
        var result = await pipeline.process(null, null, { sourceOptions: queryOptions(identifiers[0], {
            operation: "c-find", returnKeys: ["StudyInstanceUID", "NumberOfStudyRelatedInstances", "StudyDescription"]
        }) });
        expect(result.count).toBe(1);
        expect(result.first().dataSet.value(Tag.StudyInstanceUID)).toBe(identifiers[0].studyInstanceUid);
        expect(Number(result.first().dataSet.value(Tag.NumberOfStudyRelatedInstances))).toBe(2);
        expect(pipeline.reader.lastMetadata.dimse.finalResponse.status).toBe(0);

        var summaries = EASI.pipelineBuilder().fromDimseAssociation(association,
            new NodeDimseQueryRetrieveSourceTransport()).ofDicomData().toFHIRImagingStudy("study-summary").build();
        var mapped = await summaries.process({ sourceOptions: queryOptions(identifiers[0], {
            operation: "c-find", returnKeys: ["StudyInstanceUID", "PatientID", "PatientName", "StudyDate",
                "StudyTime", "ModalitiesInStudy", "NumberOfStudyRelatedSeries", "NumberOfStudyRelatedInstances"]
        }) });
        expect(mapped.count).toBe(1);
        var resource = mapped.first().toJSON();
        expect(resource.numberOfSeries).toBe(2);
        expect(resource.numberOfInstances).toBe(2);
        expect(resource.identifier).toContainEqual({ system: "urn:dicom:uid", value: `urn:oid:${identifiers[0].studyInstanceUid}` });
        expect(resource.contained[0].identifier[0].value).toBe(identifiers[0].patientId);
        var validate = createFhirR4Validator("test/validation/fhir-r4/fhir.schema.json");
        expect(validate(resource)).toEqual({ valid: true, schemaErrors: [], semanticErrors: [] });
    }, 30000);

    orthancDimseTest("C-FIND returns an empty collection for an unmatched study", async () => {
        var pipeline = buildPipeline();
        var result = await pipeline.process(null, null, { sourceOptions: queryOptions(identifiers[0], {
            operation: "c-find", studyInstanceUid: `${identifiers[0].studyInstanceUid}.999`
        }) });
        expect(result.count).toBe(0);
        expect(pipeline.reader.lastMetadata.dimse.finalResponse.status).toBe(0);
    }, 30000);

    orthancDimseTest("C-GET retrieves both series and preserves pixel bytes", async () => {
        var pipeline = buildPipeline();
        var result = await pipeline.process(null, null, { sourceOptions: queryOptions(identifiers[0]) });
        assertStoredInstances(result, identifiers);
        assertSuccessfulRetrieve(pipeline, identifiers.length);
    }, 30000);

    orthancDimseTest("C-GET preserves Orthanc's failure status for an unknown study", async () => {
        var pipeline = buildPipeline();
        await expect(pipeline.process(null, null, { sourceOptions: queryOptions(identifiers[0], {
            studyInstanceUid: `${identifiers[0].studyInstanceUid}.999`
        }) })).rejects.toMatchObject({ dimse: { status: 0xC000 } });
        expect(pipeline.reader.lastMetadata).toBeNull();
    }, 30000);

    orthancDimseMoveTest("the EASI storage listener accepts Orthanc C-ECHO and C-STORE", async () => {
        var receiver = new NodeDimseCStoreScpSourceTransport();
        var listenerAssociation = {
            host: process.env.ORTHANC_MOVE_STORE_HOST || "127.0.0.1",
            port: ORTHANC_MOVE_STORE_PORT,
            calledAeTitle: process.env.ORTHANC_MOVE_STORE_CALLED_AE || ORTHANC_MOVE_DEST_AE
        };
        try {
            await receiver.start(listenerAssociation, {
                storageSopClassUids: [SECONDARY_CAPTURE_SOP_CLASS_UID],
                storageTransferSyntaxUids: [EXPLICIT_VR_LITTLE_ENDIAN, IMPLICIT_VR_LITTLE_ENDIAN]
            });
            await orthancRequest(`/modalities/${ORTHANC_MOVE_DEST_AE}/echo`, "POST", {});
            var studyIds = await findFixtureStudies(identifiers[0].studyInstanceUid);
            expect(studyIds).toHaveLength(1);
            var stored = await orthancRequest(`/modalities/${ORTHANC_MOVE_DEST_AE}/store`, "POST", {
                Resources: studyIds, Synchronous: true
            });
            expect(stored.FailedInstancesCount).toBe(0);
            expect(stored.InstancesCount).toBe(identifiers.length);
            var pipeline = EASI.pipelineBuilder().fromDimseAssociation(listenerAssociation, receiver).
                ofDicomData().toInstances().build();
            var result = await pipeline.process(null, null, { sourceOptions: {
                waitForFirstInstanceMs: 1000, batchIdleGraceMs: 50
            } });
            assertStoredInstances(result, identifiers);
        }
        finally {
            await receiver.close();
        }
    }, 30000);

    orthancDimseMoveTest("C-MOVE retrieves both series through the local C-STORE SCP", async () => {
        var pipeline = buildPipeline();
        var result = await pipeline.process(null, null, { sourceOptions: queryOptions(identifiers[0], {
            operation: "c-move",
            moveDestinationAeTitle: ORTHANC_MOVE_DEST_AE,
            moveStoreHost: process.env.ORTHANC_MOVE_STORE_HOST || "127.0.0.1",
            moveStorePort: ORTHANC_MOVE_STORE_PORT,
            moveStoreCalledAeTitle: process.env.ORTHANC_MOVE_STORE_CALLED_AE || ORTHANC_MOVE_DEST_AE
        }) });
        assertStoredInstances(result, identifiers);
        assertSuccessfulRetrieve(pipeline, identifiers.length);
    }, 30000);

});
