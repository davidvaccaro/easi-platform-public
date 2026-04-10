import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// EASI entry-point and core extension types used by this PoC:
// - EASI builder APIs wire DIMSE source -> DICOM parser -> asset callbacks.
// - DicomMapping maps selected tags into compact JSON metadata.
import EASI from '../../../src/EASI.js';
import Tag from '../../../src/dicom/Tag.js';
import Configuration from '../../../src/environment/Configuration.js';
import DicomMapping from '../../../src/handlers/mappings/DicomMapping.js';
import NodeDimseCStoreScpSourceTransport from '../../../src/transports/dimse/NodeDimseCStoreScpSourceTransport.js';

var resolvedFetch = null;

async function resolveFetchFunction() {

    if (typeof resolvedFetch === 'function')
        return resolvedFetch;

    if (typeof globalThis.fetch === 'function') {
        resolvedFetch = globalThis.fetch.bind(globalThis);
        return resolvedFetch;
    }

    var fetchModule = await import('node-fetch');
    resolvedFetch = fetchModule.default;
    return resolvedFetch;

}

function normalizeString(value, fallback = null) {

    if (value == null)
        return fallback;

    var text = String(value).trim();
    if (text.length == 0)
        return fallback;

    return text;

}

function normalizeBoolean(value, fallback = false) {

    if (value == null)
        return fallback;

    if (typeof value === 'boolean')
        return value;

    var normalized = String(value).trim().toLowerCase();
    if ((normalized == '1') || (normalized == 'true') || (normalized == 'yes') || (normalized == 'on'))
        return true;
    if ((normalized == '0') || (normalized == 'false') || (normalized == 'no') || (normalized == 'off'))
        return false;

    return fallback;

}

function normalizeInteger(value, fallback, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {

    var numeric = Number(value);
    if (Number.isFinite(numeric) == false)
        return fallback;

    var integer = Math.trunc(numeric);
    if (integer < min)
        return fallback;
    if (integer > max)
        return fallback;

    return integer;

}

function normalizeFloat(value, fallback, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {

    var numeric = Number(value);
    if (Number.isFinite(numeric) == false)
        return fallback;

    if (numeric < min)
        return fallback;
    if (numeric > max)
        return fallback;

    return numeric;

}

function parseCsv(value) {

    if (value == null)
        return [];

    var parts = String(value)
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

    var deduped = [];
    var seen = new Set();

    for (var i = 0; i < parts.length; i++) {
        var key = parts[i];
        if (seen.has(key) == true)
            continue;
        seen.add(key);
        deduped.push(key);
    }

    return deduped;

}

function sanitizePathPart(value, fallback = 'unknown') {

    var normalized = String(value ?? fallback)
        .replace(/[\\/]/g, '_')
        .replace(/\s+/g, '_')
        .trim();

    if (normalized.length == 0)
        return fallback;

    return normalized;

}

function padNumber(value, width = 4) {
    return String(value).padStart(width, '0');
}

function toBase64(bytes) {
    return Buffer.from(bytes).toString('base64');
}

function normalizeResultList(result) {

    if (result == null)
        return [];

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

function isTimedOutWaitingForInstances(error) {

    var message = String(error?.message ?? error ?? '');
    return message.includes('Timed out waiting for incoming DIMSE C-STORE instances.');

}

function readTagValue(attributeSet, tag, fallback = null) {

    if ((attributeSet == null) || (tag == null))
        return fallback;

    if (typeof attributeSet.value === 'function') {
        var value = attributeSet.value(tag, fallback);
        return (value != null) ? value : fallback;
    }

    if (typeof attributeSet.find === 'function') {
        var attribute = attributeSet.find(tag);
        if ((attribute != null) && (attribute.value != null))
            return attribute.value;
    }

    return fallback;

}

function normalizeDicomValue(value) {

    if (Array.isArray(value) == true) {

        if (value.length == 0)
            return null;

        if (value.length == 1)
            return normalizeDicomValue(value[0]);

        var normalizedItems = [];
        for (var index = 0; index < value.length; index++) {
            normalizedItems.push(normalizeDicomValue(value[index]));
        }

        return normalizedItems;

    }

    if (value == null)
        return null;

    if ((typeof value === 'string') || (typeof value === 'number') || (typeof value === 'boolean'))
        return value;

    if (typeof value === 'bigint')
        return value.toString();

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime()) == true)
            return null;
        return value.toISOString();
    }

    if (typeof value === 'object') {
        try {
            return JSON.parse(JSON.stringify(value));
        }
        catch (_error) {
            return String(value);
        }
    }

    return String(value);

}

function summarizeFramePayload(frame) {

    return {
        index: frame.index,
        encoding: frame.encoding,
        mimeType: frame.mimeType,
        width: frame.width,
        height: frame.height,
        sizeBytes: frame.bytes?.length ?? 0
    };

}

function resolveFileExtension(frame) {

    var mimeType = String(frame?.mimeType ?? '').toLowerCase();
    if (mimeType.includes('png') == true)
        return 'png';
    if (mimeType.includes('tiff') == true)
        return 'tiff';
    if ((mimeType.includes('jpeg') == true) || (mimeType.includes('jpg') == true))
        return 'jpg';

    var encoding = String(frame?.encoding ?? '').toLowerCase();
    if (encoding == 'png')
        return 'png';
    if (encoding == 'tiff')
        return 'tiff';
    if ((encoding == 'jpeg') || (encoding == 'jpg'))
        return 'jpg';

    return 'bin';

}

export class ImageBridgeMetadataMapping extends DicomMapping {

    addMappedTag(tag, property) {
        // Reuse EASI mapping transforms so tag values are normalized once at parse time.
        this.addTag(tag, property, {
            transform: (value) => normalizeDicomValue(value)
        });
        return this;
    }

    start(context) {
        return super.start(context);
    }

    buildMetadataOutput(context) {

        return {
            patientId: context?.patientId ?? null,
            patientName: context?.patientName ?? null,
            patientBirthDate: context?.patientBirthDate ?? null,
            patientSex: context?.patientSex ?? null,
            studyInstanceUid: context?.studyInstanceUid ?? null,
            seriesInstanceUid: context?.seriesInstanceUid ?? null,
            sopInstanceUid: context?.sopInstanceUid ?? null,
            sopClassUid: context?.sopClassUid ?? null,
            modality: context?.modality ?? null,
            studyDate: context?.studyDate ?? null,
            studyTime: context?.studyTime ?? null,
            accessionNumber: context?.accessionNumber ?? null,
            seriesDescription: context?.seriesDescription ?? null,
            studyDescription: context?.studyDescription ?? null,
            instanceNumber: context?.instanceNumber ?? null,
            imageType: context?.imageType ?? null,
            bodyPartExamined: context?.bodyPartExamined ?? null,
            rows: context?.rows ?? null,
            columns: context?.columns ?? null,
            numberOfFrames: context?.numberOfFrames ?? null,
            transferSyntaxUid: context?.transferSyntaxUid ?? null,
            mediaStorageSopClassUid: context?.mediaStorageSopClassUid ?? null,
            mediaStorageSopInstanceUid: context?.mediaStorageSopInstanceUid ?? null
        };

    }

    end(context) {
        super.end(context);
        return this.buildMetadataOutput(context);
    }

    constructor() {

        super();
        this.templatePolicy = 'blank';

        this
            .addMappedTag(Tag.PatientID, 'patientId')
            .addMappedTag(Tag.PatientName, 'patientName')
            .addMappedTag(Tag.PatientBirthDate, 'patientBirthDate')
            .addMappedTag(Tag.PatientSex, 'patientSex')
            .addMappedTag(Tag.StudyInstanceUID, 'studyInstanceUid')
            .addMappedTag(Tag.SeriesInstanceUID, 'seriesInstanceUid')
            .addMappedTag(Tag.SOPInstanceUID, 'sopInstanceUid')
            .addMappedTag(Tag.SOPClassUID, 'sopClassUid')
            .addMappedTag(Tag.Modality, 'modality')
            .addMappedTag(Tag.StudyDate, 'studyDate')
            .addMappedTag(Tag.StudyTime, 'studyTime')
            .addMappedTag(Tag.AccessionNumber, 'accessionNumber')
            .addMappedTag(Tag.SeriesDescription, 'seriesDescription')
            .addMappedTag(Tag.StudyDescription, 'studyDescription')
            .addMappedTag(Tag.InstanceNumber, 'instanceNumber')
            .addMappedTag(Tag.ImageType, 'imageType')
            .addMappedTag(Tag.BodyPartExamined, 'bodyPartExamined')
            .addMappedTag(Tag.Rows, 'rows')
            .addMappedTag(Tag.Columns, 'columns')
            .addMappedTag(Tag.NumberOfFrames, 'numberOfFrames')
            .addMappedTag(Tag.TransferSyntaxUID, 'transferSyntaxUid')
            .addMappedTag(Tag.MediaStorageSOPClassUID, 'mediaStorageSopClassUid')
            .addMappedTag(Tag.MediaStorageSOPInstanceUID, 'mediaStorageSopInstanceUid');

    }

}

export class KeyFrameHeuristic {

    computeFrameSignature(rgbaBytes) {

        var byteLength = Number(rgbaBytes?.length ?? 0);
        if (byteLength < 4) {
            return {
                meanLuma: 0,
                stdLuma: 0,
                sampleCount: 0
            };
        }

        var pixelCount = Math.floor(byteLength / 4);
        var step = Math.max(1, Math.floor(pixelCount / this.maxSignatureSamples));
        var sampleCount = 0;
        var lumaSum = 0;
        var lumaSquaredSum = 0;

        for (var pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += step) {

            var offset = (pixelIndex * 4);
            var r = rgbaBytes[offset];
            var g = rgbaBytes[offset + 1];
            var b = rgbaBytes[offset + 2];

            var luma = (0.299 * r) + (0.587 * g) + (0.114 * b);
            lumaSum += luma;
            lumaSquaredSum += (luma * luma);
            sampleCount += 1;

        }

        if (sampleCount <= 0) {
            return {
                meanLuma: 0,
                stdLuma: 0,
                sampleCount: 0
            };
        }

        var meanLuma = (lumaSum / sampleCount);
        var variance = Math.max(0, ((lumaSquaredSum / sampleCount) - (meanLuma * meanLuma)));

        return {
            meanLuma,
            stdLuma: Math.sqrt(variance),
            sampleCount
        };

    }

    selectFrame(options) {

        var frameIndex = Number(options?.frameIndex ?? 0);
        var totalFrames = Math.max(1, Number(options?.totalFrames ?? 1));
        var selectedCount = Math.max(0, Number(options?.selectedCount ?? 0));

        var currentSignature = options?.currentSignature ?? {
            meanLuma: 0,
            stdLuma: 0,
            sampleCount: 0
        };

        var previousSignature = options?.previousSignature ?? null;

        var isFirst = (frameIndex <= 0);
        var isLast = (frameIndex >= (totalFrames - 1));
        var cadence = Math.max(1, Math.floor(totalFrames / Math.max(1, this.maxFramesPerInstance)));
        var cadenceHit = ((frameIndex % cadence) == 0);

        var motionScore = 0;
        if (previousSignature != null) {
            motionScore = Math.abs(currentSignature.meanLuma - previousSignature.meanLuma)
                + (0.5 * Math.abs(currentSignature.stdLuma - previousSignature.stdLuma));
        }

        var motionHit = (motionScore >= this.motionThreshold);
        var withinBudget = (selectedCount < this.maxFramesPerInstance);

        var shouldSelect = false;
        var reason = 'discarded';

        if (isFirst == true) {
            shouldSelect = true;
            reason = 'first';
        }
        else if (isLast == true) {
            shouldSelect = true;
            reason = 'last';
        }
        else if ((withinBudget == true) && (motionHit == true)) {
            shouldSelect = true;
            reason = 'motion';
        }
        else if ((withinBudget == true) && (cadenceHit == true)) {
            shouldSelect = true;
            reason = 'cadence';
        }

        return {
            selected: shouldSelect,
            reason,
            motionScore,
            cadence,
            signature: currentSignature
        };

    }

    constructor(options = null) {
        this.maxFramesPerInstance = Math.max(1, Number(options?.maxFramesPerInstance ?? 6));
        this.motionThreshold = Math.max(0, Number(options?.motionThreshold ?? 12));
        this.maxSignatureSamples = Math.max(32, Number(options?.maxSignatureSamples ?? 1024));
    }

}

export class ImageBridgeService {

    buildAssociation(settings) {

        // EASI association builder provides the DIMSE listener contract
        // (host/port/AE) consumed by the C-STORE SCP source transport.
        var builder = EASI
            .dimseAssociationBuilder()
            .withHost(settings.host)
            .withPort(settings.port)
            .withCalledAeTitle(settings.calledAeTitle);

        var association = builder.build();
        association.maxPduLength = settings.maxPduLength;

        // The C-STORE SCP transport resolves policy from top-level association fields.
        if (settings.policy != null) {
            association.policy = Object.assign({}, settings.policy);
        }

        return association;

    }

    buildPipeline() {

        // Core EASI pipeline for this bridge:
        // 1) fromDimseAssociation(...) receives inbound C-STORE instances.
        // 2) ofDicomData() parses stream bytes into DICOM objects.
        // 3) toAssets(...) emits metadata and decoded frame payload callbacks.
        // 4) onMetadata/onFrame bridge DICOM content to cloud/local non-DICOM assets.
        return EASI.pipelineBuilder()
            .fromDimseAssociation(this.association, this.transport)
            .ofDicomData()
            .withBulkDataPolicy({
                mode: 'materialize',
                knownLengthThreshold: this.config.bulkData.knownLengthThreshold,
                hardSafetyCap: this.config.bulkData.hardSafetyCap
            })
            .toAssets({
                metadata: {
                    mapping: this.metadataMapping,
                    collect: false,
                    onMetadata: async (metadata, scope) => {
                        await this.onMetadata(metadata, scope);
                    }
                },
                payload: {
                    mode: 'materialize',
                    frame: {
                        frames: 'all',
                        decode: 'rgba',
                        encode: 'none'
                    },
                    collect: false,
                    onFrame: async (frame, scope) => {
                        await this.onFrame(frame, scope);
                    }
                }
            })
            .build();

    }

    resolveInstanceUID(instance, metadata = null) {

        var fromMetadata = normalizeString(metadata?.sopInstanceUid);
        if (fromMetadata != null)
            return fromMetadata;

        var dataSet = instance?.dataSet ?? null;

        var fromDataSet = normalizeString(readTagValue(dataSet, Tag.SOPInstanceUID, null));
        if (fromDataSet != null)
            return fromDataSet;

        return normalizeString(instance?.sopInstanceUid, 'unknown-instance');

    }

    resolveTotalFrames(instance, metadata = null) {

        var fromMetadata = Number(metadata?.numberOfFrames);
        if (Number.isFinite(fromMetadata) == true) {
            return Math.max(1, Math.trunc(fromMetadata));
        }

        var value = Number(readTagValue(instance?.dataSet ?? null, Tag.NumberOfFrames, 1));
        if (Number.isFinite(value) == false)
            return 1;

        return Math.max(1, Math.trunc(value));

    }

    resolveInstanceState(instanceUID, metadata = null, totalFrames = 1) {

        var key = normalizeString(instanceUID, 'unknown-instance');
        var state = this.instanceStateByUid.get(key);

        if (state == null) {
            state = {
                instanceUID: key,
                metadata,
                totalFrames,
                processedFrames: 0,
                selectedFrames: 0,
                previousSignature: null,
                selectedFrameIndices: new Set()
            };

            this.instanceStateByUid.set(key, state);
            return state;
        }

        if (metadata != null) {
            state.metadata = metadata;
        }

        state.totalFrames = Math.max(state.totalFrames, totalFrames);
        return state;

    }

    finalizeInstanceState(state) {

        if (state == null)
            return;

        if (state.processedFrames < state.totalFrames)
            return;

        this.instanceStateByUid.delete(state.instanceUID);

    }

    resolveFallbackMetadata(instance) {

        var dataSet = instance?.dataSet ?? null;
        var metaSet = instance?.metaSet ?? null;

        return {
            patientId: normalizeDicomValue(readTagValue(dataSet, Tag.PatientID, null)),
            studyInstanceUid: normalizeDicomValue(readTagValue(dataSet, Tag.StudyInstanceUID, null)),
            seriesInstanceUid: normalizeDicomValue(readTagValue(dataSet, Tag.SeriesInstanceUID, null)),
            sopInstanceUid: normalizeDicomValue(readTagValue(dataSet, Tag.SOPInstanceUID, instance?.sopInstanceUid ?? null)),
            sopClassUid: normalizeDicomValue(readTagValue(dataSet, Tag.SOPClassUID, null)),
            modality: normalizeDicomValue(readTagValue(dataSet, Tag.Modality, null)),
            rows: normalizeDicomValue(readTagValue(dataSet, Tag.Rows, null)),
            columns: normalizeDicomValue(readTagValue(dataSet, Tag.Columns, null)),
            numberOfFrames: normalizeDicomValue(readTagValue(dataSet, Tag.NumberOfFrames, 1)),
            transferSyntaxUid: normalizeDicomValue(readTagValue(metaSet, Tag.TransferSyntaxUID, null))
        };

    }

    async onMetadata(metadata, scope) {

        // Called by EASI toAssets.metadata.onMetadata for each parsed instance.
        // We cache metadata so frame callbacks can publish complete payloads.
        var instance = scope?.instance;
        var instanceUID = this.resolveInstanceUID(instance, metadata);
        var totalFrames = this.resolveTotalFrames(instance, metadata);

        this.resolveInstanceState(instanceUID, metadata, totalFrames);

        this.metrics.metadataEvents += 1;

    }

    async encodeLosslessFrame(frame) {

        if (frame?.bytes == null) {
            return {
                bytes: new Uint8Array(0),
                mimeType: 'application/octet-stream',
                encoding: this.config.output.losslessFormat
            };
        }

        if (frame.encoding != 'rgba') {
            return {
                bytes: frame.bytes,
                mimeType: frame.mimeType ?? 'application/octet-stream',
                encoding: frame.encoding ?? 'native'
            };
        }

        var encoded = this.losslessEncoder.encode(frame.bytes, frame.width, frame.height, this.config.output.losslessOptions);
        if ((encoded != null) && (typeof encoded.then === 'function')) {
            encoded = await encoded;
        }

        return {
            bytes: encoded?.bytes ?? new Uint8Array(0),
            mimeType: encoded?.mimeType ?? 'application/octet-stream',
            encoding: encoded?.format ?? this.config.output.losslessFormat
        };

    }

    async postJson(url, payload, headers = {}) {

        var timeoutMs = this.config.output.cloudTimeoutMs;
        var fetch = await resolveFetchFunction();
        var controller = new AbortController();
        var timeoutHandle = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        try {

            var response = await fetch(url, {
                method: 'POST',
                headers: Object.assign({
                    'Content-Type': 'application/json'
                }, headers),
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            if ((response.status < 200) || (response.status >= 300)) {
                var responseBody = await response.text();
                throw new Error(`Cloud endpoint '${url}' returned ${response.status}: ${responseBody}`);
            }

        }
        finally {
            clearTimeout(timeoutHandle);
        }

    }

    async uploadToCloud(payload) {

        if (this.config.output.cloudUrl == null)
            return;

        var framePayload = payload?.frame ?? {};
        var cloudFramePayload = Object.assign({}, framePayload);
        delete cloudFramePayload.bytes;

        var cloudPayload = Object.assign({}, payload, {
            frame: cloudFramePayload
        });

        var headers = {};
        if (this.config.output.cloudApiKey != null) {
            headers.Authorization = `Bearer ${this.config.output.cloudApiKey}`;
        }

        await this.postJson(this.config.output.cloudUrl, cloudPayload, headers);

    }

    async writeLocalCopy(payload) {

        if (this.config.output.storeLocalCopy !== true)
            return;

        var metadata = payload.metadata ?? {};
        var studyUID = sanitizePathPart(metadata.studyInstanceUid, 'study');
        var seriesUID = sanitizePathPart(metadata.seriesInstanceUid, 'series');
        var instanceUID = sanitizePathPart(metadata.sopInstanceUid, payload.instanceUID ?? 'instance');

        var instanceDirectory = path.join(this.config.output.localOutputDirectory, studyUID, seriesUID, instanceUID);
        await fs.mkdir(instanceDirectory, { recursive: true });

        var frame = payload.frame;
        var extension = resolveFileExtension(frame);
        var frameFileName = `frame-${padNumber(frame.index, 4)}.${extension}`;
        var framePath = path.join(instanceDirectory, frameFileName);

        await fs.writeFile(framePath, frame.bytes);

        var frameMetadataPath = path.join(instanceDirectory, `frame-${padNumber(frame.index, 4)}.json`);
        await fs.writeFile(frameMetadataPath, JSON.stringify({
            eventType: payload.eventType,
            receivedAt: payload.receivedAt,
            bridgeId: payload.bridgeId,
            instanceUID: payload.instanceUID,
            metadata: metadata,
            frame: Object.assign({}, summarizeFramePayload(frame), {
                fileName: frameFileName
            }),
            heuristic: payload.heuristic
        }, null, 2));

        var metadataPath = path.join(instanceDirectory, 'metadata.json');
        if (this.localMetadataWritten.has(instanceUID) == false) {
            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            this.localMetadataWritten.add(instanceUID);
        }

    }

    async publishKeyFrame(payload) {

        await this.uploadToCloud(payload);
        await this.writeLocalCopy(payload);

    }

    async onFrame(frame, scope) {

        // Called by EASI toAssets.payload.onFrame for each emitted frame.
        // This is where we apply frame heuristics and publish selected key frames.
        var instance = scope?.instance;
        var fallbackMetadata = this.resolveFallbackMetadata(instance);
        var instanceUID = this.resolveInstanceUID(instance, fallbackMetadata);
        var totalFrames = this.resolveTotalFrames(instance, fallbackMetadata);

        var state = this.resolveInstanceState(instanceUID, null, totalFrames);
        if (state.metadata == null) {
            state.metadata = fallbackMetadata;
        }

        state.processedFrames += 1;

        var currentSignature = this.heuristic.computeFrameSignature(frame?.bytes ?? null);
        var decision = this.heuristic.selectFrame({
            frameIndex: Number(frame?.index ?? (state.processedFrames - 1)),
            totalFrames: state.totalFrames,
            selectedCount: state.selectedFrames,
            previousSignature: state.previousSignature,
            currentSignature
        });

        state.previousSignature = decision.signature;

        if (decision.selected == true) {

            var encodedFrame = await this.encodeLosslessFrame(frame);
            var selectedIndex = Number(frame?.index ?? (state.processedFrames - 1));

            if (state.selectedFrameIndices.has(selectedIndex) == false) {

                state.selectedFrameIndices.add(selectedIndex);
                state.selectedFrames += 1;

                var keyFramePayload = {
                    eventType: 'image-bridge.key-frame',
                    bridgeId: this.config.bridgeId,
                    receivedAt: (new Date()).toISOString(),
                    instanceUID,
                    metadata: state.metadata,
                    frame: {
                        index: selectedIndex,
                        width: Number(frame?.width ?? 0),
                        height: Number(frame?.height ?? 0),
                        encoding: encodedFrame.encoding,
                        mimeType: encodedFrame.mimeType,
                        bytes: encodedFrame.bytes,
                        bytesBase64: toBase64(encodedFrame.bytes)
                    },
                    heuristic: {
                        reason: decision.reason,
                        motionScore: Number(decision.motionScore.toFixed(4)),
                        selectedFrames: state.selectedFrames,
                        processedFrames: state.processedFrames,
                        totalFrames: state.totalFrames,
                        cadence: decision.cadence
                    }
                };

                await this.publishKeyFrame(keyFramePayload);
                this.metrics.keyFramesPublished += 1;

                if (this.config.logging.verbose == true) {
                    console.log(`[ImageBridge] key-frame selected instance=${instanceUID} frame=${selectedIndex} reason=${decision.reason} motion=${decision.motionScore.toFixed(2)}`);
                }

            }

        }

        this.metrics.frameEvents += 1;
        this.finalizeInstanceState(state);

    }

    onConcern(concern) {

        this.metrics.concerns += 1;

        if (this.config.logging.verbose == false)
            return;

        var code = concern?.code ?? 'Concern';
        var message = concern?.message ?? 'Unknown concern';
        console.warn(`[ImageBridge] concern ${code}: ${message}`);

    }

    async startListener() {

        var listener = await this.transport.start(this.association, this.readOptions);

        console.log(`[ImageBridge] Listening for DIMSE C-STORE on ${listener.host}:${listener.port} AE=${listener.calledAeTitle}`);
        if (this.config.output.cloudUrl != null) {
            console.log(`[ImageBridge] Cloud upload target: ${this.config.output.cloudUrl}`);
        }
        else {
            console.log('[ImageBridge] Cloud upload target not configured. Using local output only.');
        }

        console.log(`[ImageBridge] Local output directory: ${this.config.output.localOutputDirectory}`);

    }

    async stop() {

        if (this.running == false)
            return;

        this.running = false;
        if (this.pipelineRun != null) {
            try {
                await this.pipelineRun.stop();
            }
            catch (_error) {
                // Ignore loop-stop error; transport close below remains the final guard.
            }
        }
        await this.transport.close();

    }

    async run() {

        this.running = true;
        await this.startListener();

        // Source-bound lifecycle mode:
        // start the pipeline once and keep processing incoming DIMSE batches until stop().
        this.pipelineRun = this.pipeline.start({
            sourceOptions: this.readOptions,
            continueOnError: true,
            onResult: async (result) => {

                if (this.running == false)
                    return false;

                var batch = normalizeResultList(result);

                this.metrics.batches += 1;
                this.metrics.instances += batch.length;

                if (this.config.logging.verbose == true) {
                    console.log(`[ImageBridge] batch=${this.metrics.batches} instances=${batch.length} keyFrames=${this.metrics.keyFramesPublished}`);
                }

                return true;

            },
            onError: async (error) => {

                if (this.running == false)
                    return false;

                if (isTimedOutWaitingForInstances(error) == true) {
                    return true;
                }

                console.error(`[ImageBridge] pipeline error: ${error?.message ?? String(error)}`);
                return true;

            }
        });

        await this.pipelineRun.done;
        this.pipelineRun = null;

        console.log(`[ImageBridge] stopped. batches=${this.metrics.batches} instances=${this.metrics.instances} keyFrames=${this.metrics.keyFramesPublished} concerns=${this.metrics.concerns}`);

    }

    constructor(config) {

        this.config = config;

        // Association + source transport are the DIMSE ingress endpoint.
        this.association = this.buildAssociation({
            host: config.listener.host,
            port: config.listener.port,
            calledAeTitle: config.listener.calledAeTitle,
            maxPduLength: config.listener.maxPduLength,
            policy: config.listener.policy
        });

        this.transport = new NodeDimseCStoreScpSourceTransport();

        this.readOptions = {
            waitForFirstInstanceMs: config.listener.waitForFirstInstanceMs,
            batchIdleGraceMs: config.listener.batchIdleGraceMs,
            maxBatchInstances: config.listener.maxBatchInstances,
            compactThreshold: config.listener.compactThreshold,
            maxPduLength: config.listener.maxPduLength,
            onConcern: (concern) => {
                this.onConcern(concern);
            }
        };

        this.metadataMapping = new ImageBridgeMetadataMapping();
        this.heuristic = new KeyFrameHeuristic(config.keyFrames);

        // Encoder comes from EASI global codec registry.
        this.losslessEncoder = Configuration.global.getEncoderFor(config.output.losslessFormat);
        if ((this.losslessEncoder == null) || (typeof this.losslessEncoder.encode !== 'function')) {
            throw new Error(`No encoder registered for '${config.output.losslessFormat}'.`);
        }

        // Build the EASI pipeline once and reuse it for each incoming DIMSE batch.
        this.pipeline = this.buildPipeline();

        this.instanceStateByUid = new Map();
        this.localMetadataWritten = new Set();

        this.metrics = {
            batches: 0,
            instances: 0,
            metadataEvents: 0,
            frameEvents: 0,
            keyFramesPublished: 0,
            concerns: 0
        };

        this.running = false;
        this.pipelineRun = null;

    }

}

export function createImageBridgeConfigFromEnvironment(env = process.env, cwd = process.cwd()) {

    // This config shape maps directly to the EASI DIMSE source + asset pipeline
    // used in ImageBridgeService.buildPipeline().
    var listener = {
        host: normalizeString(env.IMAGE_BRIDGE_HOST, '0.0.0.0'),
        port: normalizeInteger(env.IMAGE_BRIDGE_PORT, 11112, 0, 65535),
        calledAeTitle: normalizeString(env.IMAGE_BRIDGE_CALLED_AE_TITLE, 'IMAGE_BRIDGE'),
        waitForFirstInstanceMs: normalizeInteger(env.IMAGE_BRIDGE_WAIT_FOR_FIRST_INSTANCE_MS, 30000, 1000, 3600000),
        batchIdleGraceMs: normalizeInteger(env.IMAGE_BRIDGE_BATCH_IDLE_GRACE_MS, 250, 0, 60000),
        maxBatchInstances: normalizeInteger(env.IMAGE_BRIDGE_MAX_BATCH_INSTANCES, 0, 0, 1000000),
        compactThreshold: normalizeInteger(env.IMAGE_BRIDGE_COMPACT_THRESHOLD, 256, 16, 1000000),
        maxPduLength: normalizeInteger(env.IMAGE_BRIDGE_MAX_PDU_LENGTH, 16384, 4096, 262144),
        policy: null
    };

    var policy = {};

    var allowedCallingAeTitles = parseCsv(env.IMAGE_BRIDGE_ALLOWED_CALLING_AE_TITLES);
    if (allowedCallingAeTitles.length > 0) {
        policy.allowedCallingAeTitles = allowedCallingAeTitles;
    }

    var deniedCallingAeTitles = parseCsv(env.IMAGE_BRIDGE_DENIED_CALLING_AE_TITLES);
    if (deniedCallingAeTitles.length > 0) {
        policy.deniedCallingAeTitles = deniedCallingAeTitles;
    }

    var allowedRemoteHosts = parseCsv(env.IMAGE_BRIDGE_ALLOWED_REMOTE_HOSTS);
    if (allowedRemoteHosts.length > 0) {
        policy.allowedRemoteHosts = allowedRemoteHosts;
    }

    var deniedRemoteHosts = parseCsv(env.IMAGE_BRIDGE_DENIED_REMOTE_HOSTS);
    if (deniedRemoteHosts.length > 0) {
        policy.deniedRemoteHosts = deniedRemoteHosts;
    }

    var maxActiveAssociations = normalizeInteger(env.IMAGE_BRIDGE_MAX_ACTIVE_ASSOCIATIONS, null, 1, 1024);
    if (maxActiveAssociations != null) {
        policy.maxActiveAssociations = maxActiveAssociations;
    }

    var associationTimeoutMs = normalizeInteger(env.IMAGE_BRIDGE_ASSOCIATION_TIMEOUT_MS, null, 1000, 3600000);
    if (associationTimeoutMs != null) {
        policy.associationTimeoutMs = associationTimeoutMs;
    }

    var rejectWithAssociationRj = normalizeString(env.IMAGE_BRIDGE_REJECT_WITH_ASSOCIATION_RJ, null);
    if (rejectWithAssociationRj != null) {
        policy.rejectWithAssociationRj = normalizeBoolean(rejectWithAssociationRj, true);
    }

    if (Object.keys(policy).length > 0) {
        listener.policy = policy;
    }

    var outputDirectory = path.resolve(cwd, normalizeString(env.IMAGE_BRIDGE_LOCAL_OUTPUT_DIR, 'test/output/pocs/imagebridge'));

    return {
        bridgeId: normalizeString(env.IMAGE_BRIDGE_ID, 'ImageBridge'),
        listener,
        keyFrames: {
            maxFramesPerInstance: normalizeInteger(env.IMAGE_BRIDGE_MAX_KEY_FRAMES_PER_INSTANCE, 6, 1, 1024),
            motionThreshold: normalizeFloat(env.IMAGE_BRIDGE_MOTION_THRESHOLD, 12, 0, 1000),
            maxSignatureSamples: normalizeInteger(env.IMAGE_BRIDGE_MAX_SIGNATURE_SAMPLES, 1024, 32, 100000)
        },
        bulkData: {
            knownLengthThreshold: normalizeInteger(env.IMAGE_BRIDGE_BULK_KNOWN_LENGTH_THRESHOLD, 4096, 1024, (1024 * 1024 * 1024)),
            hardSafetyCap: normalizeInteger(env.IMAGE_BRIDGE_BULK_HARD_SAFETY_CAP, (64 * 1024 * 1024), (1024 * 1024), (1024 * 1024 * 1024))
        },
        output: {
            losslessFormat: normalizeString(env.IMAGE_BRIDGE_LOSSLESS_FORMAT, 'png').toLowerCase(),
            losslessOptions: {},
            cloudUrl: normalizeString(env.IMAGE_BRIDGE_CLOUD_URL, null),
            cloudApiKey: normalizeString(env.IMAGE_BRIDGE_CLOUD_API_KEY, null),
            cloudTimeoutMs: normalizeInteger(env.IMAGE_BRIDGE_CLOUD_TIMEOUT_MS, 15000, 1000, 120000),
            localOutputDirectory: outputDirectory,
            storeLocalCopy: normalizeBoolean(env.IMAGE_BRIDGE_STORE_LOCAL_COPY, true)
        },
        logging: {
            verbose: normalizeBoolean(env.IMAGE_BRIDGE_VERBOSE, true)
        }
    };

}

export function createImageBridgeService(config = null) {

    var resolvedConfig = config ?? createImageBridgeConfigFromEnvironment();
    return new ImageBridgeService(resolvedConfig);

}

export async function runImageBridge(config = null) {

    var service = createImageBridgeService(config);

    var shutdown = async (signal) => {

        if (service.running == false)
            return;

        console.log(`[ImageBridge] Received ${signal}; shutting down...`);

        try {
            await service.stop();
        }
        catch (error) {
            console.error(`[ImageBridge] Failed to close listener: ${error?.message ?? String(error)}`);
        }

    };

    process.once('SIGINT', () => {
        shutdown('SIGINT');
    });

    process.once('SIGTERM', () => {
        shutdown('SIGTERM');
    });

    await service.run();

}

function isDirectExecution(argv = process.argv) {

    var entry = normalizeString(argv?.[1], null);
    if (entry == null)
        return false;

    return (path.basename(entry).toLowerCase() == 'imagebridge.js');

}

if (isDirectExecution(process.argv) == true) {
    runImageBridge().catch((error) => {
        console.error(`[ImageBridge] Fatal error: ${error?.stack ?? error?.message ?? String(error)}`);
        process.exitCode = 1;
    });
}
