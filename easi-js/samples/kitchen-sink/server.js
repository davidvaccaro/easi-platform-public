import { createReadStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import Attribute from '../../src/dicom/Attribute.js';
import Utilities from '../../src/dicom/Utilities.js';
import NodeDimseQueryRetrieveSourceTransport from '../../src/transports/dimse/NodeDimseQueryRetrieveSourceTransport.js';
import NodeDimseCStoreScuTransport from '../../src/transports/dimse/NodeDimseCStoreScuTransport.js';
import DicomDataWriterHandler from '../../src/handlers/terminals/DicomDataWriterHandler.js';

function resolveKitchenSinkDirectory() {

    var candidates = [
        path.resolve(process.cwd(), 'samples/kitchen-sink'),
        path.resolve(process.cwd(), 'easi-js/samples/kitchen-sink')
    ];

    for (var i = 0; i < candidates.length; i++) {
        var candidate = candidates[i];
        if (existsSync(path.join(candidate, 'index.htm')) == true) {
            return candidate;
        }
    }

    if ((process?.argv != null) && (process.argv.length > 1) && (process.argv[1] != null)) {
        var scriptPath = path.resolve(process.argv[1]);
        var expectedSuffix = path.normalize(path.join('samples', 'kitchen-sink', 'server.js'));
        if (scriptPath.endsWith(expectedSuffix) == true) {
            return path.dirname(scriptPath);
        }
    }

    return path.resolve(process.cwd(), 'samples/kitchen-sink');

}

const kitchenSinkDirectory = resolveKitchenSinkDirectory();
const repositoryRoot = path.resolve(kitchenSinkDirectory, '../../..');
const defaultHost = process.env.HOST ?? '127.0.0.1';
const defaultPort = Number(process.env.PORT ?? 8080);

const defaultPagePath = '/easi-js/samples/kitchen-sink/index.htm';
const dimseCFindStudiesApiPath = '/easi-js/samples/kitchen-sink/api/dimse/cfind-studies';
const dimseCGetApiPath = '/easi-js/samples/kitchen-sink/api/dimse/cget-instance';
const dimseCMoveRelayApiPath = '/easi-js/samples/kitchen-sink/api/dimse/cmove-deidentify-relay';

const mimeTypes = {
    '.htm': 'text/html; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.wasm': 'application/wasm',
    '.xml': 'application/xml; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.dcm': 'application/dicom',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8'
};

function nowMs() {
    return Date.now();
}

function trimOrNull(value) {

    if (value == null)
        return null;

    var text = String(value).trim();
    return (text.length > 0) ? text : null;

}

function parsePortValue(value, fallback) {

    if (value == null)
        return fallback;

    var numeric = Number(value);
    if (Number.isFinite(numeric) == false)
        return fallback;

    var intValue = Math.trunc(numeric);
    if ((intValue <= 0) || (intValue > 65535))
        return fallback;

    return intValue;

}

function parseBooleanValue(value, fallback = false) {

    if (typeof value === 'boolean')
        return value;

    if (value == null)
        return fallback;

    var text = String(value).trim().toLowerCase();
    if ((text === 'true') || (text === '1') || (text === 'yes') || (text === 'on'))
        return true;

    if ((text === 'false') || (text === '0') || (text === 'no') || (text === 'off'))
        return false;

    return fallback;

}

function normalizeStringArray(value) {

    if (Array.isArray(value) == false)
        return [];

    var normalized = [];

    for (var i = 0; i < value.length; i++) {
        var text = trimOrNull(value[i]);
        if (text != null) {
            normalized.push(text);
        }
    }

    return normalized;

}

function buildMoveStorePolicy(rawPolicy) {

    if ((rawPolicy == null) || (typeof rawPolicy !== 'object'))
        return null;

    var policy = {};

    var allowedCallingAeTitles = normalizeStringArray(rawPolicy.allowedCallingAeTitles);
    if (allowedCallingAeTitles.length > 0) {
        policy.allowedCallingAeTitles = allowedCallingAeTitles;
    }

    var deniedCallingAeTitles = normalizeStringArray(rawPolicy.deniedCallingAeTitles);
    if (deniedCallingAeTitles.length > 0) {
        policy.deniedCallingAeTitles = deniedCallingAeTitles;
    }

    var allowedRemoteHosts = normalizeStringArray(rawPolicy.allowedRemoteHosts);
    if (allowedRemoteHosts.length > 0) {
        policy.allowedRemoteHosts = allowedRemoteHosts;
    }

    var deniedRemoteHosts = normalizeStringArray(rawPolicy.deniedRemoteHosts);
    if (deniedRemoteHosts.length > 0) {
        policy.deniedRemoteHosts = deniedRemoteHosts;
    }

    var maxActiveAssociations = Number(rawPolicy.maxActiveAssociations);
    if ((Number.isFinite(maxActiveAssociations) == true) && (maxActiveAssociations >= 0)) {
        policy.maxActiveAssociations = Math.trunc(maxActiveAssociations);
    }

    var associationTimeoutMs = Number(rawPolicy.associationTimeoutMs);
    if ((Number.isFinite(associationTimeoutMs) == true) && (associationTimeoutMs > 0)) {
        policy.associationTimeoutMs = Math.trunc(associationTimeoutMs);
    }

    if (rawPolicy.rejectWithAssociationRj != null) {
        policy.rejectWithAssociationRj = parseBooleanValue(rawPolicy.rejectWithAssociationRj, true);
    }

    return (Object.keys(policy).length > 0) ? policy : null;

}

function sendJson(response, statusCode, payload) {

    var json = JSON.stringify(payload, null, 2);
    response.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(json)
    });
    response.end(json);

}

function toHexStatus(status) {

    if (status == null)
        return null;

    var value = Number(status);
    if (Number.isFinite(value) == false)
        return null;

    var hex = (value >>> 0).toString(16).toUpperCase();
    return `0x${hex}`;

}

async function readJsonBody(request, maxBytes = (1024 * 1024)) {

    return await new Promise((resolve, reject) => {

        var bytesRead = 0;
        var chunks = [];

        request.on('data', (chunk) => {

            bytesRead += chunk.length;

            if (bytesRead > maxBytes) {
                reject(new Error(`Request body exceeds ${maxBytes} bytes.`));
                request.destroy();
                return;
            }

            chunks.push(chunk);

        });

        request.on('error', (error) => reject(error));

        request.on('end', () => {

            try {

                if (chunks.length === 0) {
                    resolve({});
                    return;
                }

                var bodyText = Buffer.concat(chunks).toString('utf-8');
                if (bodyText.trim().length === 0) {
                    resolve({});
                    return;
                }

                resolve(JSON.parse(bodyText));

            }
            catch (error) {
                reject(error);
            }

        });

    });

}

function createBasicAuthHeader(username, password) {

    var normalizedUsername = trimOrNull(username);
    var normalizedPassword = trimOrNull(password);

    if ((normalizedUsername == null) || (normalizedPassword == null))
        return null;

    return `Basic ${Buffer.from(`${normalizedUsername}:${normalizedPassword}`, 'utf-8').toString('base64')}`;

}

async function requestText(requestUrl, method = 'GET', headers = {}, timeoutMs = 30000) {

    return await new Promise((resolve, reject) => {

        var url = new URL(requestUrl);
        var isTls = (url.protocol === 'https:');
        var client = isTls ? https : http;

        var request = client.request({
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port || (isTls ? 443 : 80),
            method,
            path: `${url.pathname}${url.search}`,
            headers
        }, (response) => {

            var chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('error', (error) => reject(error));
            response.on('end', () => {
                resolve({
                    statusCode: response.statusCode ?? 0,
                    headers: response.headers ?? {},
                    bodyText: Buffer.concat(chunks).toString('utf-8')
                });
            });

        });

        request.on('error', (error) => reject(error));
        request.setTimeout(timeoutMs, () => request.destroy(new Error(`Request timed out after ${timeoutMs} ms.`)));
        request.end();

    });

}

async function orthancGetJson(orthancHttpUrl, routePath, username = null, password = null) {

    var headers = {
        Accept: 'application/json'
    };

    var authHeader = createBasicAuthHeader(username, password);
    if (authHeader != null)
        headers.Authorization = authHeader;

    var response = await requestText(`${orthancHttpUrl}${routePath}`, 'GET', headers);
    if ((response.statusCode < 200) || (response.statusCode >= 300)) {
        throw new Error(`Orthanc HTTP request failed (${response.statusCode}) for '${routePath}': ${response.bodyText}`);
    }

    try {
        return JSON.parse(response.bodyText);
    }
    catch (error) {
        throw new Error(`Orthanc HTTP response was not valid JSON for '${routePath}': ${error?.message ?? String(error)}`);
    }

}

async function discoverOrthancInstanceIdentifiers(orthancHttpUrl, username = null, password = null) {

    var studies = await orthancGetJson(orthancHttpUrl, '/studies', username, password);
    if (Array.isArray(studies) == false)
        return null;

    for (var studyIndex = 0; studyIndex < studies.length; studyIndex++) {

        var orthancStudyId = studies[studyIndex];
        var orthancStudy = await orthancGetJson(orthancHttpUrl, `/studies/${orthancStudyId}`, username, password);

        var studyInstanceUid = trimOrNull(orthancStudy?.MainDicomTags?.StudyInstanceUID);
        var seriesIds = Array.isArray(orthancStudy?.Series) ? orthancStudy.Series : [];

        for (var seriesIndex = 0; seriesIndex < seriesIds.length; seriesIndex++) {

            var orthancSeriesId = seriesIds[seriesIndex];
            var orthancSeries = await orthancGetJson(orthancHttpUrl, `/series/${orthancSeriesId}`, username, password);

            var seriesInstanceUid = trimOrNull(orthancSeries?.MainDicomTags?.SeriesInstanceUID);
            var instanceIds = Array.isArray(orthancSeries?.Instances) ? orthancSeries.Instances : [];

            if (instanceIds.length === 0)
                continue;

            var orthancInstance = await orthancGetJson(orthancHttpUrl, `/instances/${instanceIds[0]}`, username, password);
            var sopInstanceUid = trimOrNull(orthancInstance?.MainDicomTags?.SOPInstanceUID);

            if ((studyInstanceUid != null) && (seriesInstanceUid != null) && (sopInstanceUid != null)) {
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

function firstInstance(result) {
    return Array.isArray(result) ? (result[0] ?? null) : (result ?? null);
}

function firstResult(result) {
    return Array.isArray(result) ? (result[0] ?? null) : (result ?? null);
}

function normalizeResultList(result) {

    var pending = Array.isArray(result) ? result.slice() : [result];
    var normalized = [];

    while (pending.length > 0) {
        var current = pending.shift();
        if (current == null)
            continue;

        if (Array.isArray(current) == true) {
            for (var i = 0; i < current.length; i++) {
                pending.push(current[i]);
            }
            continue;
        }

        normalized.push(current);
    }

    return normalized;

}

function summarizeStudyFindInstance(instance) {

    var dataSet = instance?.dataSet ?? null;

    return {
        studyInstanceUid: dataSet?.value(Tag.StudyInstanceUID) ?? null,
        studyDate: dataSet?.value(Tag.StudyDate) ?? null,
        studyTime: dataSet?.value(Tag.StudyTime) ?? null,
        studyDescription: dataSet?.value(Tag.StudyDescription) ?? null,
        accessionNumber: dataSet?.value(Tag.AccessionNumber) ?? null,
        modalitiesInStudy: dataSet?.value(Tag.ModalitiesInStudy) ?? null,
        patientName: dataSet?.value(Tag.PatientName) ?? null,
        patientId: dataSet?.value(Tag.PatientID) ?? null,
        numberOfStudyRelatedSeries: dataSet?.value(Tag.NumberOfStudyRelatedSeries) ?? null,
        numberOfStudyRelatedInstances: dataSet?.value(Tag.NumberOfStudyRelatedInstances) ?? null
    };

}

function summarizeInstance(instance) {

    var dataSet = instance?.dataSet ?? null;
    var metaSet = instance?.metaSet ?? null;

    return {
        studyInstanceUid: dataSet?.value(Tag.StudyInstanceUID) ?? null,
        seriesInstanceUid: dataSet?.value(Tag.SeriesInstanceUID) ?? null,
        sopInstanceUid: dataSet?.value(Tag.SOPInstanceUID) ?? null,
        modality: dataSet?.value(Tag.Modality) ?? null,
        transferSyntaxUid: metaSet?.transferSyntaxUID?.ID ?? null,
        sopClassUid: dataSet?.value(Tag.SOPClassUID) ?? null,
        rows: dataSet?.value(Tag.Rows) ?? null,
        columns: dataSet?.value(Tag.Columns) ?? null,
        numberOfFrames: dataSet?.value(Tag.NumberOfFrames, 1) ?? 1,
        hasPixelData: dataSet?.has(Tag.PixelData) === true,
        metaAttributeCount: Array.isArray(metaSet?.attributes) ? metaSet.attributes.length : 0,
        dataAttributeCount: Array.isArray(dataSet?.attributes) ? dataSet.attributes.length : 0
    };

}

function summarizeFhirImagingStudy(resource) {

    if (resource == null)
        return null;

    var series = Array.isArray(resource?.series) ? resource.series : [];
    var modality = Array.isArray(resource?.modality) ? resource.modality : [];
    var endpoint = Array.isArray(resource?.endpoint) ? resource.endpoint : [];
    var identifiers = Array.isArray(resource?.identifier) ? resource.identifier : [];

    return {
        resourceType: resource?.resourceType ?? null,
        id: resource?.id ?? null,
        status: resource?.status ?? null,
        subjectReference: resource?.subject?.reference ?? null,
        identifierCount: identifiers.length,
        modalityCount: modality.length,
        endpointCount: endpoint.length,
        seriesCount: series.length
    };

}

function buildDefaultDimseAssociation(input, defaults) {

    return {
        host: trimOrNull(input?.host) ?? defaults.host,
        port: parsePortValue(input?.port, defaults.port),
        callingAeTitle: trimOrNull(input?.callingAeTitle) ?? defaults.callingAeTitle,
        calledAeTitle: trimOrNull(input?.calledAeTitle) ?? defaults.calledAeTitle
    };

}

function createRelayDeIdentificationMask(reassignUids = true) {

    var mask = new Map([
        [Tag.PatientName.ID, 'Z'],
        [Tag.PatientID.ID, 'Z'],
        [Tag.PatientBirthDate.ID, 'Z'],
        [Tag.PatientSex.ID, 'Z'],
        [Tag.OtherPatientIDs.ID, 'X'],
        [Tag.OtherPatientNames.ID, 'X'],
        [Tag.PatientAddress.ID, 'Z'],
        [Tag.PatientTelephoneNumbers.ID, 'Z'],
        [Tag.AccessionNumber.ID, 'Z'],
        [Tag.ReferringPhysicianName.ID, 'Z'],
        [Tag.OperatorsName.ID, 'Z']
    ]);

    if (reassignUids === true) {
        var uidRemap = new Map();
        var remapUid = (attribute) => {
            var originalValue = ((attribute?.value == null) ? '' : String(attribute.value));
            var replacementUid = uidRemap.get(originalValue);
            if (replacementUid == null) {
                replacementUid = Utilities.newUID();
                uidRemap.set(originalValue, replacementUid);
            }
            return replacementUid;
        };

        // Keep UIDs synchronized between corresponding data-set and meta-set attributes.
        mask.set(Tag.StudyInstanceUID.ID, remapUid);
        mask.set(Tag.SeriesInstanceUID.ID, remapUid);
        mask.set(Tag.SOPInstanceUID.ID, remapUid);
        mask.set(Tag.MediaStorageSOPInstanceUID.ID, remapUid);
    }

    return mask;

}

function createSynchronizedDicomWriterHandler(options = null) {

    var writer = new DicomDataWriterHandler(options);

    return new Proxy(writer, {
        get(target, property, receiver) {

            if (property === 'onEndInstance') {

                return async (context, instance) => {

                    var dataSet = instance?.dataSet ?? null;
                    var metaSet = instance?.metaSet ?? null;

                    var dataSetSopClassAttribute = dataSet?.find(Tag.SOPClassUID) ?? null;
                    var dataSetSopInstanceAttribute = dataSet?.find(Tag.SOPInstanceUID) ?? null;
                    var mediaStorageSopClassAttribute = metaSet?.find(Tag.MediaStorageSOPClassUID) ?? null;
                    var mediaStorageSopInstanceAttribute = metaSet?.find(Tag.MediaStorageSOPInstanceUID) ?? null;

                    var dataSetSopClassUid = dataSetSopClassAttribute?.value ?? null;
                    var dataSetSopInstanceUid = dataSetSopInstanceAttribute?.value ?? null;
                    var mediaStorageSopClassUid = mediaStorageSopClassAttribute?.value ?? null;
                    var mediaStorageSopInstanceUid = mediaStorageSopInstanceAttribute?.value ?? null;

                    var effectiveSopClassUid = (dataSetSopClassUid != null)
                        ? dataSetSopClassUid
                        : mediaStorageSopClassUid;
                    var effectiveSopInstanceUid = (dataSetSopInstanceUid != null)
                        ? dataSetSopInstanceUid
                        : mediaStorageSopInstanceUid;

                    if ((effectiveSopClassUid != null) && (dataSetSopClassAttribute == null) && (dataSet != null)) {
                        dataSetSopClassAttribute = new Attribute(Tag.SOPClassUID, 0, new Uint8Array(0), null);
                        dataSet.add(dataSetSopClassAttribute);
                    }

                    if ((effectiveSopClassUid != null) && (mediaStorageSopClassAttribute == null) && (metaSet != null)) {
                        mediaStorageSopClassAttribute = new Attribute(Tag.MediaStorageSOPClassUID, 0, new Uint8Array(0), null);
                        metaSet.add(mediaStorageSopClassAttribute);
                    }

                    if ((effectiveSopInstanceUid != null) && (dataSetSopInstanceAttribute == null) && (dataSet != null)) {
                        dataSetSopInstanceAttribute = new Attribute(Tag.SOPInstanceUID, 0, new Uint8Array(0), null);
                        dataSet.add(dataSetSopInstanceAttribute);
                    }

                    if ((effectiveSopInstanceUid != null) && (mediaStorageSopInstanceAttribute == null) && (metaSet != null)) {
                        mediaStorageSopInstanceAttribute = new Attribute(Tag.MediaStorageSOPInstanceUID, 0, new Uint8Array(0), null);
                        metaSet.add(mediaStorageSopInstanceAttribute);
                    }

                    if ((effectiveSopClassUid != null) && (dataSetSopClassAttribute != null)) {
                        dataSetSopClassAttribute.value = effectiveSopClassUid;
                    }
                    if ((effectiveSopClassUid != null) && (mediaStorageSopClassAttribute != null)) {
                        mediaStorageSopClassAttribute.value = effectiveSopClassUid;
                    }

                    if ((effectiveSopInstanceUid != null) && (dataSetSopInstanceAttribute != null)) {
                        dataSetSopInstanceAttribute.value = effectiveSopInstanceUid;
                    }
                    if ((effectiveSopInstanceUid != null) && (mediaStorageSopInstanceAttribute != null)) {
                        mediaStorageSopInstanceAttribute.value = effectiveSopInstanceUid;
                    }

                    var handler = Reflect.get(target, property, receiver);
                    if (typeof handler === 'function') {
                        return await handler.call(target, context, instance);
                    }

                    return null;

                };

            }

            var value = Reflect.get(target, property, receiver);
            if (typeof value === 'function')
                return value.bind(target);

            return value;

        }
    });

}

async function handleDimseCFindStudiesApi(request, response, dependencies = null) {

    if (request.method !== 'POST') {
        response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Method Not Allowed');
        return;
    }

    var totalStart = nowMs();

    try {

        var body = await readJsonBody(request);

        var dimseAssociation = {
            host: trimOrNull(body?.dimseAssociation?.host) ?? '127.0.0.1',
            port: parsePortValue(body?.dimseAssociation?.port, 4242),
            callingAeTitle: trimOrNull(body?.dimseAssociation?.callingAeTitle) ?? 'EASI_JS',
            calledAeTitle: trimOrNull(body?.dimseAssociation?.calledAeTitle) ?? 'ORTHANC'
        };

        var queryRetrieveModel = trimOrNull(body?.queryRetrieveModel) ?? 'study-root';
        var outputMode = trimOrNull(body?.outputMode) ?? 'instance';
        var modality = trimOrNull(body?.modality);

        if (modality != null) {
            modality = modality.toUpperCase();
        }

        if ((outputMode !== 'instance') && (outputMode !== 'fhir-imaging-study')) {
            throw new Error(`Invalid outputMode '${outputMode}'. Supported values are 'instance' and 'fhir-imaging-study'.`);
        }

        var queryKeys = {
            '0020000D': '',
            '00080020': '',
            '00080030': '',
            '00081030': '',
            '00080050': '',
            '00080061': '',
            '00100010': '',
            '00100020': '',
            '00201206': '',
            '00201208': ''
        };

        if (modality != null) {
            queryKeys['00080061'] = modality;
        }

        var queryKeyVrs = {
            '0020000D': 'UI',
            '00080020': 'DA',
            '00080030': 'TM',
            '00081030': 'LO',
            '00080050': 'SH',
            '00080061': 'CS',
            '00100010': 'PN',
            '00100020': 'LO',
            '00201206': 'IS',
            '00201208': 'IS'
        };

        var cfindStart = nowMs();
        var dimseConcerns = [];

        var easi = dependencies?.easi ?? EASI;
        var createSourceTransport = dependencies?.createSourceTransport ?? (() => (new NodeDimseQueryRetrieveSourceTransport()));
        var transport = createSourceTransport();
        var builder = easi.pipelineBuilder()
            .fromDimseAssociation(dimseAssociation, transport)
            .ofDicomData();

        if (outputMode === 'fhir-imaging-study') {
            builder = builder.toFHIRImagingStudy('study-summary');
        } else {
            builder = builder.toInstances();
        }

        var pipeline = builder.build();

        var result = null;
        var emitted = [];
        var onEmit = async (value) => {
            emitted.push(value);
        };
        try {
            result = await pipeline.process(null, {
                operation: 'c-find',
                performFind: false,
                queryRetrieveModel,
                queryRetrieveLevel: 'STUDY',
                keys: queryKeys,
                keyVrs: queryKeyVrs,
                onConcern: (concern) => {
                    dimseConcerns.push(concern);
                },
                onEmit
            });
        }
        catch (error) {
            var noMatchMessage = String(error?.message ?? '');
            if (noMatchMessage.includes('DIMSE C-FIND completed with no results returned.')) {
                result = [];
            }
            else {
                throw error;
            }
        }

        var cfindMs = (nowMs() - cfindStart);

        var resultList = (emitted.length > 0)
            ? emitted
            : normalizeResultList(result);

        if (outputMode === 'fhir-imaging-study') {

            var fhirImagingStudies = resultList
                .filter((resource) => (resource?.resourceType === 'ImagingStudy'));

            sendJson(response, 200, {
                success: true,
                operation: 'c-find',
                outputMode,
                association: dimseAssociation,
                request: {
                    queryRetrieveModel,
                    queryRetrieveLevel: 'STUDY',
                    modality
                },
                concernCount: dimseConcerns.length,
                concerns: dimseConcerns,
                resultCount: fhirImagingStudies.length,
                resultSummary: fhirImagingStudies.map((resource) => summarizeFhirImagingStudy(resource)),
                fhirImagingStudies,
                timingsMs: {
                    cfind: cfindMs,
                    total: (nowMs() - totalStart)
                }
            });

            return;

        }

        var instances = resultList
            .filter((instance) => (instance?.dataSet != null));
        var instanceSummaries = instances.map((instance) => summarizeStudyFindInstance(instance));

        sendJson(response, 200, {
            success: true,
            operation: 'c-find',
            outputMode,
            association: dimseAssociation,
            request: {
                queryRetrieveModel,
                queryRetrieveLevel: 'STUDY',
                modality
            },
            concernCount: dimseConcerns.length,
            concerns: dimseConcerns,
            resultCount: instanceSummaries.length,
            resultSummary: instanceSummaries,
            instanceSummaries,
            timingsMs: {
                cfind: cfindMs,
                total: (nowMs() - totalStart)
            }
        });

    }
    catch (error) {
        sendJson(response, 500, {
            success: false,
            message: error?.message ?? String(error),
            stack: error?.stack ?? null
        });
    }

}

async function handleDimseCGetInstanceApi(request, response, dependencies = null) {

    if (request.method !== 'POST') {
        response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Method Not Allowed');
        return;
    }

    var totalStart = nowMs();

    try {

        var body = await readJsonBody(request);

        var dimseAssociation = {
            host: trimOrNull(body?.dimseAssociation?.host) ?? '127.0.0.1',
            port: parsePortValue(body?.dimseAssociation?.port, 4242),
            callingAeTitle: trimOrNull(body?.dimseAssociation?.callingAeTitle) ?? 'EASI_JS',
            calledAeTitle: trimOrNull(body?.dimseAssociation?.calledAeTitle) ?? 'ORTHANC'
        };

        var queryRetrieveModel = trimOrNull(body?.queryRetrieveModel) ?? 'study-root';
        var outputMode = trimOrNull(body?.outputMode) ?? 'instance';

        var studyInstanceUid = trimOrNull(body?.studyInstanceUid);
        var seriesInstanceUid = trimOrNull(body?.seriesInstanceUid);
        var sopInstanceUid = trimOrNull(body?.sopInstanceUid);

        if ((outputMode !== 'instance') && (outputMode !== 'fhir-imaging-study')) {
            throw new Error(`Invalid outputMode '${outputMode}'. Supported values are 'instance' and 'fhir-imaging-study'.`);
        }

        var usedOrthancDiscovery = false;
        var discoveryMs = 0;

        if ((studyInstanceUid == null) || (seriesInstanceUid == null) || (sopInstanceUid == null)) {

            var orthancHttpUrl = trimOrNull(body?.orthancHttpUrl) ?? 'http://localhost:8042';
            var orthancHttpUsername = trimOrNull(body?.orthancHttpUsername);
            var orthancHttpPassword = trimOrNull(body?.orthancHttpPassword);

            var discoveryStart = nowMs();
            var discoverInstanceIdentifiers = dependencies?.discoverOrthancInstanceIdentifiers ?? discoverOrthancInstanceIdentifiers;
            var discovered = await discoverInstanceIdentifiers(orthancHttpUrl, orthancHttpUsername, orthancHttpPassword);
            discoveryMs = (nowMs() - discoveryStart);
            usedOrthancDiscovery = true;

            if (discovered == null) {
                throw new Error('No suitable Orthanc study/series/instance identifiers were discovered.');
            }

            studyInstanceUid = discovered.studyInstanceUid;
            seriesInstanceUid = discovered.seriesInstanceUid;
            sopInstanceUid = discovered.sopInstanceUid;

        }

        var cgetStart = nowMs();
        var dimseConcerns = [];

        var easi = dependencies?.easi ?? EASI;
        var createSourceTransport = dependencies?.createSourceTransport ?? (() => (new NodeDimseQueryRetrieveSourceTransport()));
        var transport = createSourceTransport();
        var builder = easi.pipelineBuilder()
            .fromDimseAssociation(dimseAssociation, transport)
            .ofDicomData();

        if (outputMode === 'fhir-imaging-study') {
            builder = builder.toFHIRImagingStudy();
        }
        else {
            builder = builder.toInstances();
        }

        var pipeline = builder.build();

        var result = await pipeline.process(null, {
            operation: 'c-get',
            performFind: false,
            queryRetrieveModel,
            queryRetrieveLevel: 'IMAGE',
            studyInstanceUid,
            seriesInstanceUid,
            sopInstanceUid,
            onConcern: (concern) => {
                dimseConcerns.push(concern);
            }
        });

        var cgetMs = (nowMs() - cgetStart);

        if (outputMode === 'fhir-imaging-study') {

            var imagingStudy = firstResult(result);
            if (imagingStudy == null) {
                throw new Error('DIMSE C-GET completed with no FHIR ImagingStudy result.');
            }

            sendJson(response, 200, {
                success: true,
                operation: 'c-get',
                outputMode,
                usedOrthancDiscovery,
                association: dimseAssociation,
                request: {
                    queryRetrieveModel,
                    queryRetrieveLevel: 'IMAGE',
                    studyInstanceUid,
                    seriesInstanceUid,
                    sopInstanceUid
                },
                concernCount: dimseConcerns.length,
                concerns: dimseConcerns,
                resultSummary: summarizeFhirImagingStudy(imagingStudy),
                fhirImagingStudy: imagingStudy,
                timingsMs: {
                    discovery: discoveryMs,
                    cget: cgetMs,
                    total: (nowMs() - totalStart)
                }
            });

            return;

        }

        var instance = firstInstance(result);
        if (instance == null) {
            throw new Error('DIMSE C-GET completed with no instance returned.');
        }

        sendJson(response, 200, {
            success: true,
            operation: 'c-get',
            outputMode,
            usedOrthancDiscovery,
            association: dimseAssociation,
            request: {
                queryRetrieveModel,
                queryRetrieveLevel: 'IMAGE',
                studyInstanceUid,
                seriesInstanceUid,
                sopInstanceUid
            },
            concernCount: dimseConcerns.length,
            concerns: dimseConcerns,
            resultSummary: summarizeInstance(instance),
            timingsMs: {
                discovery: discoveryMs,
                cget: cgetMs,
                total: (nowMs() - totalStart)
            }
        });

    }
    catch (error) {
        sendJson(response, 500, {
            success: false,
            message: error?.message ?? String(error),
            stack: error?.stack ?? null
        });
    }

}

async function handleDimseCMoveDeIdentifyRelayApi(request, response, dependencies = null) {

    if (request.method !== 'POST') {
        response.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Method Not Allowed');
        return;
    }

    var totalStart = nowMs();

    try {

        var body = await readJsonBody(request);

        var sourceAssociation = buildDefaultDimseAssociation(body?.sourceAssociation ?? body?.dimseAssociation, {
            host: '127.0.0.1',
            port: 4242,
            callingAeTitle: 'EASI_JS',
            calledAeTitle: 'ORTHANC'
        });

        var destinationAssociation = buildDefaultDimseAssociation(body?.destinationAssociation, {
            host: '127.0.0.1',
            port: 4242,
            callingAeTitle: 'EASI_JS',
            calledAeTitle: 'ORTHANC'
        });

        var moveDestinationAeTitle = trimOrNull(body?.moveDestinationAeTitle) ?? 'EASI_MOVE_DEST';
        var moveStoreHost = trimOrNull(body?.moveStoreHost) ?? '127.0.0.1';
        var moveStorePort = parsePortValue(body?.moveStorePort, 4104);
        var moveStoreCalledAeTitle = trimOrNull(body?.moveStoreCalledAeTitle) ?? moveDestinationAeTitle;
        var moveStorePolicy = buildMoveStorePolicy(body?.moveStorePolicy);

        var queryRetrieveModel = trimOrNull(body?.queryRetrieveModel) ?? 'study-root';
        var reassignUids = parseBooleanValue(body?.reassignUids, true);

        var studyInstanceUid = trimOrNull(body?.studyInstanceUid);
        var seriesInstanceUid = trimOrNull(body?.seriesInstanceUid);
        var sopInstanceUid = trimOrNull(body?.sopInstanceUid);

        var usedOrthancDiscovery = false;
        var discoveryMs = 0;

        if ((studyInstanceUid == null) || (seriesInstanceUid == null) || (sopInstanceUid == null)) {

            var orthancHttpUrl = trimOrNull(body?.orthancHttpUrl) ?? 'http://localhost:8042';
            var orthancHttpUsername = trimOrNull(body?.orthancHttpUsername);
            var orthancHttpPassword = trimOrNull(body?.orthancHttpPassword);

            var discoveryStart = nowMs();
            var discoverInstanceIdentifiers = dependencies?.discoverOrthancInstanceIdentifiers ?? discoverOrthancInstanceIdentifiers;
            var discovered = await discoverInstanceIdentifiers(orthancHttpUrl, orthancHttpUsername, orthancHttpPassword);
            discoveryMs = (nowMs() - discoveryStart);
            usedOrthancDiscovery = true;

            if (discovered == null) {
                throw new Error('No suitable Orthanc study/series/instance identifiers were discovered.');
            }

            studyInstanceUid = discovered.studyInstanceUid;
            seriesInstanceUid = discovered.seriesInstanceUid;
            sopInstanceUid = discovered.sopInstanceUid;

        }

        var relayStart = nowMs();
        var dimseConcerns = [];

        var easi = dependencies?.easi ?? EASI;
        var createSourceTransport = dependencies?.createSourceTransport ?? (() => (new NodeDimseQueryRetrieveSourceTransport()));
        var createDestinationTransport = dependencies?.createDestinationTransport ?? (() => (new NodeDimseCStoreScuTransport()));
        var createDicomWriterHandler = dependencies?.createSynchronizedDicomWriterHandler ?? createSynchronizedDicomWriterHandler;

        var sourceTransport = createSourceTransport();
        var destinationTransport = createDestinationTransport();

        var deIdMask = createRelayDeIdentificationMask(reassignUids);

        var pipeline = easi.pipelineBuilder()
            .fromDimseAssociation(sourceAssociation, sourceTransport)
            .ofDicomData()
            .withDeIdentification(deIdMask)
            .withHandler(createDicomWriterHandler())
            .intoDimseAssociation(destinationAssociation, {
                transport: destinationTransport
            })
            .build();

        var writeResult = await pipeline.process(null, {
            operation: 'c-move',
            performFind: false,
            queryRetrieveModel,
            queryRetrieveLevel: 'IMAGE',
            studyInstanceUid,
            seriesInstanceUid,
            sopInstanceUid,
            moveDestinationAeTitle,
            moveStoreHost,
            moveStorePort,
            moveStoreCalledAeTitle,
            moveStorePolicy,
            onConcern: (concern) => {
                dimseConcerns.push(concern);
            }
        });

        var relayMs = (nowMs() - relayStart);

        if (writeResult?.ok !== true) {
            var statusHex = toHexStatus(writeResult?.dimseStatus);
            var failedPart = null;
            var partResults = writeResult?.metadata?.results;
            if (Array.isArray(partResults) == true) {
                failedPart = partResults.find((item) => (item?.ok !== true)) ?? null;
            }
            var failureDetails = (failedPart != null)
                ? (` (failed part status: ${toHexStatus(failedPart?.dimseStatus) ?? 'UNKNOWN'}, ` +
                    `sopClassUid: ${failedPart?.metadata?.sopClassUid ?? 'NULL'}, ` +
                    `sopInstanceUid: ${failedPart?.metadata?.sopInstanceUid ?? 'NULL'}, ` +
                    `sourceMetaSopInstanceUid: ${failedPart?.metadata?.sourceMetaSopInstanceUid ?? 'NULL'}, ` +
                    `transferSyntaxUid: ${failedPart?.metadata?.transferSyntaxUid ?? 'NULL'}, ` +
                    `acceptedTransferSyntaxUid: ${failedPart?.metadata?.acceptedTransferSyntaxUid ?? 'NULL'})`)
                : '';
            throw new Error(`DIMSE C-STORE relay failed with status ${statusHex ?? 'UNKNOWN'}${failureDetails}.`);
        }

        sendJson(response, 200, {
            success: true,
            operation: 'c-move',
            mode: 'deidentify-relay',
            usedOrthancDiscovery,
            sourceAssociation,
            destinationAssociation,
            request: {
                queryRetrieveModel,
                queryRetrieveLevel: 'IMAGE',
                studyInstanceUid,
                seriesInstanceUid,
                sopInstanceUid,
                moveDestinationAeTitle,
                moveStoreHost,
                moveStorePort,
                moveStoreCalledAeTitle,
                moveStorePolicy
            },
            deIdentification: {
                reassignUids
            },
            concernCount: dimseConcerns.length,
            concerns: dimseConcerns,
            relayResult: {
                ok: (writeResult?.ok === true),
                dimseStatus: writeResult?.dimseStatus ?? null,
                dimseStatusHex: toHexStatus(writeResult?.dimseStatus),
                bytesWritten: writeResult?.bytesWritten ?? null,
                sourceSopInstanceUid: sopInstanceUid,
                destinationSopInstanceUid: writeResult?.metadata?.sopInstanceUid ?? null,
                metadata: writeResult?.metadata ?? null
            },
            timingsMs: {
                discovery: discoveryMs,
                relay: relayMs,
                total: (nowMs() - totalStart)
            }
        });

    }
    catch (error) {
        sendJson(response, 500, {
            success: false,
            message: error?.message ?? String(error),
            stack: error?.stack ?? null
        });
    }

}

function normalizeRequestPath(requestUrl, runtime = null) {

    const host = trimOrNull(runtime?.host) ?? defaultHost;
    const port = parsePortValue(runtime?.port, defaultPort);

    const url = new URL(requestUrl, `http://${host}:${port}`);
    let pathname = decodeURIComponent(url.pathname);

    if (
        (pathname === '/')
        || (pathname === '/easi-js')
        || (pathname === '/easi-js/')
        || (pathname === '/easi-js/samples')
        || (pathname === '/easi-js/samples/')
        || (pathname === '/easi-js/samples/kitchen-sink')
        || (pathname === '/easi-js/samples/kitchen-sink/')
    ) {
        pathname = defaultPagePath;
    }

    return pathname;

}

function resolveFilePath(pathname) {

    const localPath = path.normalize(path.join(repositoryRoot, pathname));
    if (localPath.startsWith(repositoryRoot) === false)
        return null;

    return localPath;

}

async function serveRequest(request, response, runtime = null) {

    try {

        const pathname = normalizeRequestPath(request.url ?? '/', runtime);

        if (pathname === dimseCFindStudiesApiPath) {
            await handleDimseCFindStudiesApi(request, response, runtime?.dependencies ?? null);
            return;
        }

        if (pathname === dimseCGetApiPath) {
            await handleDimseCGetInstanceApi(request, response, runtime?.dependencies ?? null);
            return;
        }

        if (pathname === dimseCMoveRelayApiPath) {
            await handleDimseCMoveDeIdentifyRelayApi(request, response, runtime?.dependencies ?? null);
            return;
        }

        let filePath = resolveFilePath(pathname);

        if (filePath == null) {
            response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('Forbidden');
            return;
        }

        let stat = null;

        try {
            stat = await fs.stat(filePath);
        }
        catch {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('Not Found');
            return;
        }

        if (stat.isDirectory()) {
            filePath = path.join(filePath, 'index.htm');
            try {
                stat = await fs.stat(filePath);
            }
            catch {
                response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                response.end('Not Found');
                return;
            }
        }

        const extension = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[extension] ?? 'application/octet-stream';

        response.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stat.size
        });

        createReadStream(filePath).pipe(response);

    }
    catch (error) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(`Server Error: ${error?.message ?? 'Unknown error'}`);
    }

}

export function createKitchenSinkServer(options = null) {

    var runtime = {
        host: trimOrNull(options?.host) ?? defaultHost,
        port: parsePortValue(options?.port, defaultPort),
        dependencies: options?.dependencies ?? null
    };

    var server = http.createServer((request, response) => {
        void serveRequest(request, response, runtime);
    });

    server.__easiKitchenSinkRuntime = runtime;
    return server;

}

export function startKitchenSinkServer(options = null) {

    var server = createKitchenSinkServer(options);
    var runtime = server.__easiKitchenSinkRuntime;

    server.listen(runtime.port, runtime.host, () => {
        console.log(`Kitchen sink server listening on http://${runtime.host}:${runtime.port}${defaultPagePath}`);
    });

    return server;

}

function isMainModule() {

    if ((process?.argv == null) || (process.argv.length < 2))
        return false;

    try {
        var scriptPath = path.resolve(process.argv[1]);
        var expectedSuffix = path.normalize(path.join('samples', 'kitchen-sink', 'server.js'));
        return scriptPath.endsWith(expectedSuffix);
    }
    catch {
        return false;
    }

}

if (isMainModule() == true) {
    startKitchenSinkServer();
}
