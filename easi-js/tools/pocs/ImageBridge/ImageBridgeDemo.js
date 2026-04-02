import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline';

// DIMSE SCU transport used by the demo sender to push files into the bridge.
import NodeDimseCStoreScuTransport from '../../../src/transports/dimse/NodeDimseCStoreScuTransport.js';
import {
    createImageBridgeConfigFromEnvironment,
    createImageBridgeService
} from './ImageBridge.js';
import { createMockCloudServer } from './MockCloudServer.js';

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
    if ((integer < min) || (integer > max))
        return fallback;

    return integer;

}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDimseStatus(status) {

    var numeric = Number(status);
    if (Number.isFinite(numeric) == false)
        return 'UNKNOWN';

    return `0x${numeric.toString(16).toUpperCase().padStart(4, '0')}`;

}

function parseCliArguments(args = process.argv.slice(2)) {

    var options = {};

    for (var index = 0; index < args.length; index++) {

        var arg = String(args[index] ?? '').trim();
        if (arg.startsWith('--') == false)
            continue;

        var key = null;
        var value = null;

        if (arg.includes('=')) {
            var parts = arg.split('=');
            key = parts.shift().replace(/^--/, '');
            value = parts.join('=');
        }
        else {
            key = arg.replace(/^--/, '');
            var next = args[index + 1];
            if ((next != null) && (String(next).startsWith('--') == false)) {
                value = next;
                index += 1;
            }
            else {
                value = true;
            }
        }

        options[key] = value;

    }

    return options;

}

function resolveBrightDicomRoot(cwd = process.cwd()) {

    var normalized = path.resolve(cwd);
    var marker = `${path.sep}easi-js`;
    var markerIndex = normalized.indexOf(marker);

    if (markerIndex >= 0)
        return normalized.substring(0, markerIndex);

    if (path.basename(normalized) == 'BrightDicom')
        return normalized;

    return path.resolve(normalized, '..');

}

function isDicomLikeFile(fileName) {

    var extension = path.extname(fileName).toLowerCase();
    if ((extension == '.dcm') || (extension == '.ima') || (extension == '.dicom'))
        return true;

    if (extension.length == 0)
        return true;

    return false;

}

async function listDicomFiles(rootDirectory) {

    var stack = [rootDirectory];
    var files = [];

    while (stack.length > 0) {

        var current = stack.pop();
        var entries = await fs.readdir(current, { withFileTypes: true });

        for (var index = 0; index < entries.length; index++) {

            var entry = entries[index];
            var absolutePath = path.join(current, entry.name);

            if (entry.isDirectory() == true) {
                stack.push(absolutePath);
                continue;
            }

            if (entry.isFile() == false)
                continue;

            if (isDicomLikeFile(entry.name) == false)
                continue;

            files.push(absolutePath);

        }

    }

    files.sort((a, b) => a.localeCompare(b));
    return files;

}

function askQuestion(question) {

    return new Promise((resolve) => {

        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });

    });

}

async function pickDicomFile(candidates, displayRoot = process.cwd()) {

    if (Array.isArray(candidates) == false)
        return null;

    if (candidates.length == 0)
        return null;

    if (process.stdin.isTTY != true)
        return candidates[0];

    var maxToDisplay = Math.min(40, candidates.length);

    console.log('');
    console.log('Available DICOM files:');

    for (var index = 0; index < maxToDisplay; index++) {
        var relative = path.relative(displayRoot, candidates[index]);
        console.log(`  ${index + 1}. ${relative}`);
    }

    if (candidates.length > maxToDisplay) {
        console.log(`  ... (${candidates.length - maxToDisplay} more files not shown)`);
        console.log('  Tip: use --input <path> for an explicit file.');
    }

    var answer = await askQuestion(`Select file [1-${maxToDisplay}] (default 1): `);
    var selectedIndex = normalizeInteger(answer, 1, 1, maxToDisplay);

    return candidates[selectedIndex - 1];

}

async function resolveInputFiles(config) {

    var inputPath = normalizeString(config.inputPath, null);
    if (inputPath != null) {

        var absoluteInput = path.resolve(config.cwd, inputPath);
        var stat = await fs.stat(absoluteInput);

        if (stat.isDirectory() == true) {
            var fromDirectory = await listDicomFiles(absoluteInput);
            if (fromDirectory.length == 0)
                throw new Error(`No DICOM-like files found under '${absoluteInput}'.`);
            return fromDirectory;
        }

        return [absoluteInput];

    }

    var defaultLibrary = path.join(config.brightDicomRoot, 'data', 'dicoms');
    var candidates = await listDicomFiles(defaultLibrary);

    if (candidates.length == 0)
        throw new Error(`No DICOM files found under '${defaultLibrary}'.`);

    if (config.pickInput == true) {
        var picked = await pickDicomFile(candidates, config.brightDicomRoot);
        return (picked != null) ? [picked] : [candidates[0]];
    }

    var preferred = candidates.find((candidate) => path.basename(candidate).toUpperCase() == '0002.DCM');
    if (preferred != null)
        return [preferred];

    return [candidates[0]];

}

function createDemoConfig(options = null, cwd = process.cwd()) {

    var parsed = options ?? parseCliArguments();
    var brightDicomRoot = resolveBrightDicomRoot(cwd);

    return {
        cwd,
        brightDicomRoot,
        inputPath: normalizeString(parsed.input ?? parsed.file, null),
        pickInput: normalizeBoolean(parsed.pick, false),
        keepRunning: (normalizeBoolean(parsed.once, false) == true) ? false : normalizeBoolean(parsed.keepRunning ?? parsed['keep-running'], true),
        bridgePort: normalizeInteger(parsed.bridgePort ?? parsed['bridge-port'], 11112, 1024, 65535),
        cloudPort: normalizeInteger(parsed.cloudPort ?? parsed['cloud-port'], 18080, 1024, 65535),
        calledAeTitle: normalizeString(parsed.calledAeTitle ?? parsed['called-ae-title'], 'IMAGE_BRIDGE'),
        callingAeTitle: normalizeString(parsed.callingAeTitle ?? parsed['calling-ae-title'], 'IMAGE_BRIDGE_DEMO'),
        startupTimeoutMs: normalizeInteger(parsed.startupTimeoutMs ?? parsed['startup-timeout-ms'], 10000, 1000, 120000),
        receiveTimeoutMs: normalizeInteger(parsed.receiveTimeoutMs ?? parsed['receive-timeout-ms'], 15000, 1000, 300000),
        outputDirectory: path.resolve(cwd, normalizeString(parsed.outputDir ?? parsed['output-dir'], 'test/output/pocs/imagebridge/demo')),
        verbose: normalizeBoolean(parsed.verbose, true)
    };

}

function createBridgeConfigForDemo(config, cloud) {

    // Start from ImageBridge defaults, then pin explicit demo values so behavior is
    // deterministic and easy to demonstrate across environments.
    var bridgeConfig = createImageBridgeConfigFromEnvironment({}, config.cwd);

    bridgeConfig.bridgeId = 'ImageBridgeDemo';
    bridgeConfig.listener.host = '127.0.0.1';
    bridgeConfig.listener.port = config.bridgePort;
    bridgeConfig.listener.calledAeTitle = config.calledAeTitle;
    bridgeConfig.listener.waitForFirstInstanceMs = Math.max(bridgeConfig.listener.waitForFirstInstanceMs, config.receiveTimeoutMs);

    bridgeConfig.output.cloudUrl = `${cloud.baseUrl}/image-bridge/events`;
    bridgeConfig.output.cloudApiKey = null;
    bridgeConfig.output.localOutputDirectory = path.join(config.outputDirectory, 'bridge-local-output');
    bridgeConfig.output.storeLocalCopy = true;

    bridgeConfig.logging.verbose = config.verbose;

    return bridgeConfig;

}

async function waitForBridgeListener(service, timeoutMs = 10000) {

    // bridge.run() starts asynchronously; wait until the DIMSE listener socket is bound
    // before attempting C-STORE sends.
    var startedAt = Date.now();

    while ((Date.now() - startedAt) <= timeoutMs) {

        var listener = service?.transport?.listener ?? null;
        if ((listener != null) && (listener.port != null))
            return listener;

        await delay(25);

    }

    throw new Error(`Timed out waiting for ImageBridge listener startup after ${timeoutMs} ms.`);

}

async function sendFileViaCStore(filePath, config, listener) {

    // Outbound C-STORE leg of the demo:
    // read local DICOM bytes -> open DIMSE association -> send one C-STORE request.
    // The `transport.write(...)` call below is the exact network operation that initiates
    // DIMSE C-STORE to the running ImageBridge SCP listener.
    var bytes = new Uint8Array(await fs.readFile(filePath));

    var association = {
        host: '127.0.0.1',
        port: listener.port,
        callingAeTitle: config.callingAeTitle,
        calledAeTitle: config.calledAeTitle
    };

    var transport = new NodeDimseCStoreScuTransport();

    return await transport.write(association, bytes, {
        messageId: 1,
        priority: 0
    });

}

function toDisplayPath(filePath, root = process.cwd()) {

    var relative = path.relative(root, filePath);
    if ((relative.length > 0) && (relative.startsWith('..') == false))
        return relative;

    return filePath;

}

async function waitForShutdownSignal(cleanup) {

    return await new Promise((resolve) => {

        var isClosing = false;

        var close = async (signal) => {

            if (isClosing == true)
                return;

            isClosing = true;
            console.log(`[ImageBridgeDemo] Received ${signal}; shutting down demo services...`);

            try {
                await cleanup();
            }
            finally {
                resolve();
            }

        };

        process.once('SIGINT', () => close('SIGINT'));
        process.once('SIGTERM', () => close('SIGTERM'));

    });

}

export async function runImageBridgeDemo(options = null) {

    // Demo orchestration:
    // 1) Start mock cloud.
    // 2) Start ImageBridge service (EASI DIMSE source + pipeline).
    // 3) Send one or more DICOM files via C-STORE.
    // 4) Confirm cloud event visibility and keep services live if requested.
    var config = createDemoConfig(options, process.cwd());
    var files = await resolveInputFiles(config);

    await fs.mkdir(config.outputDirectory, { recursive: true });

    var cloud = createMockCloudServer({
        host: '127.0.0.1',
        port: config.cloudPort,
        outputDirectory: path.join(config.outputDirectory, 'mock-cloud'),
        verbose: config.verbose,
        maxBodyBytes: (64 * 1024 * 1024)
    });

    var bridge = null;
    var bridgeRunPromise = null;

    try {

        // Step 1: mock cloud accepts non-DICOM bridge payloads and provides dashboard visibility.
        await cloud.start();

        console.log('');
        console.log('[ImageBridgeDemo] Step 1/4: Mock cloud started');
        console.log(`[ImageBridgeDemo] Dashboard: ${cloud.dashboardUrl}`);

        // Step 2: create and run the bridge service. The service internally builds the
        // EASI pipeline and DIMSE C-STORE SCP listener.
        var bridgeConfig = createBridgeConfigForDemo(config, cloud);
        bridge = createImageBridgeService(bridgeConfig);
        bridgeRunPromise = bridge.run();

        var listener = await waitForBridgeListener(bridge, config.startupTimeoutMs);

        console.log('[ImageBridgeDemo] Step 2/4: ImageBridge listener started');
        console.log(`[ImageBridgeDemo] Bridge: ${listener.host}:${listener.port} AE=${listener.calledAeTitle}`);
        console.log(`[ImageBridgeDemo] Bridge output: ${bridgeConfig.output.localOutputDirectory}`);

        console.log('[ImageBridgeDemo] Step 3/4: Sending DICOM via C-STORE');

        var totalSent = 0;
        var totalCloudSignals = 0;

        for (var fileIndex = 0; fileIndex < files.length; fileIndex++) {

            var filePath = files[fileIndex];
            // Capture count before send so we can confirm this file produced new cloud output.
            var cloudCountBefore = cloud.eventCount;

            console.log(`[ImageBridgeDemo]   (${fileIndex + 1}/${files.length}) ${toDisplayPath(filePath, config.brightDicomRoot)}`);

            // C-STORE initiation point in demo flow:
            // this call executes NodeDimseCStoreScuTransport.write(...) and transmits
            // the selected DICOM file to ImageBridge over DIMSE.
            var cstoreResult = await sendFileViaCStore(filePath, config, listener);
            var statusHex = formatDimseStatus(cstoreResult?.dimseStatus);

            console.log(`[ImageBridgeDemo]   C-STORE status=${statusHex} ok=${cstoreResult?.ok === true}`);

            totalSent += 1;

            if (cstoreResult?.ok !== true) {
                throw new Error(`C-STORE failed for '${filePath}' with status ${statusHex}.`);
            }

            try {
                // DIMSE success means the bridge accepted the instance. This verifies the
                // full pipeline completed and emitted a cloud event as non-DICOM output.
                await cloud.waitForEventCount(cloudCountBefore + 1, config.receiveTimeoutMs);
                totalCloudSignals += 1;
                console.log(`[ImageBridgeDemo]   Mock cloud received event(s). Total=${cloud.eventCount}`);
            }
            catch (error) {
                console.warn(`[ImageBridgeDemo]   No new cloud event observed within timeout (${config.receiveTimeoutMs} ms). ${error?.message ?? String(error)}`);
            }

        }

        console.log('[ImageBridgeDemo] Step 4/4: Flow complete');
        console.log(`[ImageBridgeDemo] Files sent: ${totalSent}`);
        console.log(`[ImageBridgeDemo] Files with observed cloud events: ${totalCloudSignals}`);
        console.log(`[ImageBridgeDemo] Mock cloud output: ${path.join(config.outputDirectory, 'mock-cloud')}`);
        console.log(`[ImageBridgeDemo] Open dashboard: ${cloud.dashboardUrl}`);

        if (config.keepRunning == true) {
            // Live mode keeps both services running so users can repeat C-STORE sends.
            console.log('[ImageBridgeDemo] Demo remains live. Press Ctrl+C to stop.');
            await waitForShutdownSignal(async () => {
                await bridge.stop();
                await cloud.stop();
            });
        }
        else {
            await bridge.stop();
            await cloud.stop();
        }

        if (bridgeRunPromise != null)
            await bridgeRunPromise;

    }
    catch (error) {

        // Coordinated shutdown for both services to avoid orphaned listeners on failure.
        if (bridge != null) {
            try {
                await bridge.stop();
            }
            catch (_ignored) {
                // Ignore shutdown error.
            }
        }

        try {
            await cloud.stop();
        }
        catch (_ignored) {
            // Ignore shutdown error.
        }

        if (bridgeRunPromise != null) {
            try {
                await bridgeRunPromise;
            }
            catch (_ignored) {
                // Ignore run-loop error during shutdown.
            }
        }

        throw error;

    }

}

function isDirectExecution(argv = process.argv) {

    var entry = normalizeString(argv?.[1], null);
    if (entry == null)
        return false;

    return (path.basename(entry).toLowerCase() == 'imagebridgedemo.js');

}

if (isDirectExecution(process.argv) == true) {
    runImageBridgeDemo().catch((error) => {
        console.error(`[ImageBridgeDemo] Fatal error: ${error?.stack ?? error?.message ?? String(error)}`);
        process.exitCode = 1;
    });
}
