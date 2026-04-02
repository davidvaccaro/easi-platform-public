import path from 'node:path';
import fs from 'node:fs';

import EASI from '../../../src/EASI.js';
import {
    KeyFrameHeuristic,
    ImageBridgeMetadataMapping,
    createImageBridgeConfigFromEnvironment,
    createImageBridgeService
} from '../../../tools/pocs/ImageBridge/ImageBridge.js';

function readDicomBytes(name = '0002.DCM') {
    var brightDicomRoot = process.cwd().split('easi-js')[0];
    return fs.readFileSync(path.join(brightDicomRoot, '/data/dicoms/' + name));
}

test('Test: ImageBridge config parsing normalizes listener, policy, and output settings', () => {

    var config = createImageBridgeConfigFromEnvironment({
        IMAGE_BRIDGE_ID: 'Bridge-Alpha',
        IMAGE_BRIDGE_HOST: '127.0.0.1',
        IMAGE_BRIDGE_PORT: '4242',
        IMAGE_BRIDGE_CALLED_AE_TITLE: 'IMAGE_BRIDGE',
        IMAGE_BRIDGE_ALLOWED_CALLING_AE_TITLES: 'MODALITY_A, MODALITY_A, MODALITY_B',
        IMAGE_BRIDGE_ALLOWED_REMOTE_HOSTS: '10.10.0.12,10.10.0.12',
        IMAGE_BRIDGE_MAX_ACTIVE_ASSOCIATIONS: '12',
        IMAGE_BRIDGE_ASSOCIATION_TIMEOUT_MS: '45000',
        IMAGE_BRIDGE_REJECT_WITH_ASSOCIATION_RJ: 'false',
        IMAGE_BRIDGE_MAX_KEY_FRAMES_PER_INSTANCE: '5',
        IMAGE_BRIDGE_MOTION_THRESHOLD: '9.5',
        IMAGE_BRIDGE_MAX_SIGNATURE_SAMPLES: '2048',
        IMAGE_BRIDGE_LOSSLESS_FORMAT: 'PNG',
        IMAGE_BRIDGE_LOCAL_OUTPUT_DIR: 'tmp/imagebridge-out',
        IMAGE_BRIDGE_STORE_LOCAL_COPY: 'true',
        IMAGE_BRIDGE_VERBOSE: 'false'
    }, '/tmp/imagebridge-root');

    expect(config.bridgeId).toBe('Bridge-Alpha');
    expect(config.listener.host).toBe('127.0.0.1');
    expect(config.listener.port).toBe(4242);
    expect(config.listener.calledAeTitle).toBe('IMAGE_BRIDGE');
    expect(config.listener.policy.allowedCallingAeTitles).toEqual(['MODALITY_A', 'MODALITY_B']);
    expect(config.listener.policy.allowedRemoteHosts).toEqual(['10.10.0.12']);
    expect(config.listener.policy.maxActiveAssociations).toBe(12);
    expect(config.listener.policy.associationTimeoutMs).toBe(45000);
    expect(config.listener.policy.rejectWithAssociationRj).toBe(false);

    expect(config.keyFrames.maxFramesPerInstance).toBe(5);
    expect(config.keyFrames.motionThreshold).toBe(9.5);
    expect(config.keyFrames.maxSignatureSamples).toBe(2048);

    expect(config.output.losslessFormat).toBe('png');
    expect(config.output.localOutputDirectory).toBe(path.resolve('/tmp/imagebridge-root', 'tmp/imagebridge-out'));
    expect(config.output.storeLocalCopy).toBe(true);
    expect(config.logging.verbose).toBe(false);

});

test('Test: ImageBridge metadata mapping emits stable selected DICOM JSON shape', async () => {

    var result = await EASI.pipelineBuilder()
        .fromPartStream()
        .ofDicomData()
        .toAssets({
            metadata: {
                mapping: new ImageBridgeMetadataMapping(),
                collect: true
            }
        })
        .build()
        .process(readDicomBytes('0002.DCM'));

    expect(result.metadata).toBeDefined();
    expect(result.metadata).not.toBeNull();
    expect(result.metadata.studyInstanceUid).toBeDefined();
    expect(result.metadata.seriesInstanceUid).toBeDefined();
    expect(result.metadata.sopInstanceUid).toBeDefined();
    expect(result.metadata.transferSyntaxUid).toBeDefined();
    expect(result.metadata.dicom).toBeUndefined();

});

test('Test: KeyFrameHeuristic selects first, cadence, and last deterministically', () => {

    var heuristic = new KeyFrameHeuristic({
        maxFramesPerInstance: 4,
        motionThreshold: 99,
        maxSignatureSamples: 128
    });

    var signature = {
        meanLuma: 10,
        stdLuma: 2,
        sampleCount: 20
    };

    var first = heuristic.selectFrame({
        frameIndex: 0,
        totalFrames: 10,
        selectedCount: 0,
        previousSignature: null,
        currentSignature: signature
    });

    var cadence = heuristic.selectFrame({
        frameIndex: 2,
        totalFrames: 10,
        selectedCount: 1,
        previousSignature: signature,
        currentSignature: signature
    });

    var last = heuristic.selectFrame({
        frameIndex: 9,
        totalFrames: 10,
        selectedCount: 2,
        previousSignature: signature,
        currentSignature: signature
    });

    expect(first.selected).toBe(true);
    expect(first.reason).toBe('first');
    expect(cadence.selected).toBe(true);
    expect(cadence.reason).toBe('cadence');
    expect(last.selected).toBe(true);
    expect(last.reason).toBe('last');

});

test('Test: ImageBridge service builds association with top-level policy for SCP transport', () => {

    var config = createImageBridgeConfigFromEnvironment({
        IMAGE_BRIDGE_ALLOWED_CALLING_AE_TITLES: 'MODALITY_X',
        IMAGE_BRIDGE_LOSSLESS_FORMAT: 'png',
        IMAGE_BRIDGE_VERBOSE: 'false'
    }, process.cwd());

    var service = createImageBridgeService(config);

    expect(service.association).toBeDefined();
    expect(service.association.policy).toBeDefined();
    expect(service.association.policy.allowedCallingAeTitles).toEqual(['MODALITY_X']);

});
