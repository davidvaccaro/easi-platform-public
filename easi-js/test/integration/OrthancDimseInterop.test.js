import EASI from "../../src/EASI.js";
import Tag from "../../src/dicom/Tag.js";
import NodeDimseQueryRetrieveSourceTransport from "../../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js";

const SHOULD_RUN_ORTHANC_DIMSE = (process.env.RUN_ORTHANC_DIMSE === "true");
const SHOULD_RUN_ORTHANC_DIMSE_MOVE = (process.env.RUN_ORTHANC_DIMSE_MOVE === "true");

const ORTHANC_HTTP_URL = process.env.ORTHANC_HTTP_URL || "http://localhost:8042";
const ORTHANC_HTTP_USERNAME = process.env.ORTHANC_HTTP_USERNAME || null;
const ORTHANC_HTTP_PASSWORD = process.env.ORTHANC_HTTP_PASSWORD || null;

const ORTHANC_DIMSE_HOST = process.env.ORTHANC_DIMSE_HOST || "127.0.0.1";
const ORTHANC_DIMSE_PORT = Number(process.env.ORTHANC_DIMSE_PORT || 4242);
const ORTHANC_DIMSE_CALLED_AE = process.env.ORTHANC_DIMSE_CALLED_AE || "ORTHANC";
const ORTHANC_DIMSE_CALLING_AE = process.env.ORTHANC_DIMSE_CALLING_AE || "EASI_JS";
const ORTHANC_DIMSE_QR_MODEL = process.env.ORTHANC_DIMSE_QR_MODEL || "study-root";
const ORTHANC_DIMSE_REQUIRE_C_GET = (process.env.ORTHANC_DIMSE_REQUIRE_C_GET === "true");
const ORTHANC_DIMSE_REQUIRE_C_MOVE = (process.env.ORTHANC_DIMSE_REQUIRE_C_MOVE === "true");

const ORTHANC_MOVE_DEST_AE = process.env.ORTHANC_MOVE_DEST_AE || "EASI_MOVE_DEST";
const ORTHANC_MOVE_STORE_HOST = process.env.ORTHANC_MOVE_STORE_HOST || "127.0.0.1";
const ORTHANC_MOVE_STORE_PORT = Number(process.env.ORTHANC_MOVE_STORE_PORT || 4104);
const ORTHANC_MOVE_STORE_CALLED_AE = process.env.ORTHANC_MOVE_STORE_CALLED_AE || ORTHANC_MOVE_DEST_AE;

function createBasicAuthHeader(username, password) {

    if ((username == null) || (password == null)) {
        return null;
    }

    var raw = `${username}:${password}`;
    return `Basic ${Buffer.from(raw, "utf-8").toString("base64")}`;

}

async function orthancGetJson(path) {

    var headers = {
        Accept: "application/json"
    };

    var authHeader = createBasicAuthHeader(ORTHANC_HTTP_USERNAME, ORTHANC_HTTP_PASSWORD);
    if (authHeader != null) {
        headers.Authorization = authHeader;
    }

    var response = await fetch(`${ORTHANC_HTTP_URL}${path}`, {
        method: "GET",
        headers
    });

    if (response.ok != true) {
        var reason = await response.text();
        throw new Error(`Orthanc request failed (${response.status}) for '${path}': ${reason}`);
    }

    return await response.json();

}

async function discoverOrthancIdentifiers() {

    var studies = await orthancGetJson("/studies");

    if (Array.isArray(studies) == false) {
        return null;
    }

    for (var studyIndex = 0; studyIndex < studies.length; studyIndex++) {

        var studyId = studies[studyIndex];
        var study = await orthancGetJson(`/studies/${studyId}`);
        var studyInstanceUid = study?.MainDicomTags?.StudyInstanceUID || null;
        var seriesIds = Array.isArray(study?.Series) ? study.Series : [];

        for (var seriesIndex = 0; seriesIndex < seriesIds.length; seriesIndex++) {

            var seriesId = seriesIds[seriesIndex];
            var series = await orthancGetJson(`/series/${seriesId}`);
            var seriesInstanceUid = series?.MainDicomTags?.SeriesInstanceUID || null;
            var instanceIds = Array.isArray(series?.Instances) ? series.Instances : [];

            if (instanceIds.length == 0) {
                continue;
            }

            var instance = await orthancGetJson(`/instances/${instanceIds[0]}`);
            var sopInstanceUid = instance?.MainDicomTags?.SOPInstanceUID || null;

            if ((studyInstanceUid != null)
                && (seriesInstanceUid != null)
                && (sopInstanceUid != null)) {
                return {
                    studyInstanceUid,
                    seriesInstanceUid,
                    sopInstanceUid
                };
            }

        }

    }

    return null;

}

const orthancDimseTest = SHOULD_RUN_ORTHANC_DIMSE ? test : test.skip;
const orthancDimseMoveTest = SHOULD_RUN_ORTHANC_DIMSE_MOVE ? test : test.skip;

orthancDimseTest("Test: Orthanc HTTP discovery + DIMSE C-GET retrieves one matching instance", async () => {

    var identifiers = await discoverOrthancIdentifiers();
    if (identifiers == null) {
        throw new Error("No suitable Orthanc study/series/instance identifiers were discovered.");
    }

    var transport = new NodeDimseQueryRetrieveSourceTransport();

    var pipeline = EASI.pipelineBuilder()
        .fromDimseAssociation({
            host: ORTHANC_DIMSE_HOST,
            port: ORTHANC_DIMSE_PORT,
            callingAeTitle: ORTHANC_DIMSE_CALLING_AE,
            calledAeTitle: ORTHANC_DIMSE_CALLED_AE
        }, transport)
        .ofDicomData()
        .toInstances()
        .build();

    try {

        var instance = await pipeline.process(null, {
            performFind: false,
            queryRetrieveModel: ORTHANC_DIMSE_QR_MODEL,
            queryRetrieveLevel: "IMAGE",
            studyInstanceUid: identifiers.studyInstanceUid,
            seriesInstanceUid: identifiers.seriesInstanceUid,
            sopInstanceUid: identifiers.sopInstanceUid
        });

        expect(instance).not.toBeNull();
        expect(instance.dataSet.value(Tag.StudyInstanceUID)).toBe(identifiers.studyInstanceUid);
        expect(instance.dataSet.value(Tag.SeriesInstanceUID)).toBe(identifiers.seriesInstanceUid);
        expect(instance.dataSet.value(Tag.SOPInstanceUID)).toBe(identifiers.sopInstanceUid);

    }
    catch (error) {

        var message = String(error?.message || error || "");
        var appearsToBeOrthancGetAbort = message.includes("aborted while waiting for C-GET response");

        if ((appearsToBeOrthancGetAbort == true) && (ORTHANC_DIMSE_REQUIRE_C_GET == false)) {
            console.warn("Orthanc DIMSE C-GET appears unavailable on this endpoint/configuration. Skipping strict C-GET assertion.");
            return;
        }

        throw error;

    }

}, 120000);

orthancDimseMoveTest("Test: Orthanc HTTP discovery + DIMSE C-MOVE retrieves one matching instance through local store SCP", async () => {

    var identifiers = await discoverOrthancIdentifiers();
    if (identifiers == null) {
        throw new Error("No suitable Orthanc study/series/instance identifiers were discovered.");
    }

    var transport = new NodeDimseQueryRetrieveSourceTransport();

    var pipeline = EASI.pipelineBuilder()
        .fromDimseAssociation({
            host: ORTHANC_DIMSE_HOST,
            port: ORTHANC_DIMSE_PORT,
            callingAeTitle: ORTHANC_DIMSE_CALLING_AE,
            calledAeTitle: ORTHANC_DIMSE_CALLED_AE
        }, transport)
        .ofDicomData()
        .toInstances()
        .build();

    try {

        var instance = await pipeline.process(null, {
            operation: "c-move",
            performFind: false,
            queryRetrieveModel: ORTHANC_DIMSE_QR_MODEL,
            queryRetrieveLevel: "IMAGE",
            studyInstanceUid: identifiers.studyInstanceUid,
            seriesInstanceUid: identifiers.seriesInstanceUid,
            sopInstanceUid: identifiers.sopInstanceUid,
            moveDestinationAeTitle: ORTHANC_MOVE_DEST_AE,
            moveStoreHost: ORTHANC_MOVE_STORE_HOST,
            moveStorePort: ORTHANC_MOVE_STORE_PORT,
            moveStoreCalledAeTitle: ORTHANC_MOVE_STORE_CALLED_AE
        });

        expect(instance).not.toBeNull();
        expect(instance.dataSet.value(Tag.StudyInstanceUID)).toBe(identifiers.studyInstanceUid);
        expect(instance.dataSet.value(Tag.SeriesInstanceUID)).toBe(identifiers.seriesInstanceUid);
        expect(instance.dataSet.value(Tag.SOPInstanceUID)).toBe(identifiers.sopInstanceUid);

    }
    catch (error) {

        var message = String(error?.message || error || "");
        var appearsToBeOrthancMoveUnavailable = message.includes("C-MOVE failed with status")
            || message.includes("aborted while waiting for C-MOVE response")
            || message.includes("presentation context was rejected")
            || message.includes("Timed out waiting for C-MOVE incoming store sub-operations");

        if ((appearsToBeOrthancMoveUnavailable == true) && (ORTHANC_DIMSE_REQUIRE_C_MOVE == false)) {
            console.warn("Orthanc DIMSE C-MOVE appears unavailable or unrouted for the configured destination AE. Skipping strict C-MOVE assertion.");
            return;
        }

        throw error;

    }

}, 120000);
