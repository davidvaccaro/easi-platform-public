//
// monitorHarnessRun.js - 1.0.0
//
// Watches a harness run folder and streams compact progress snapshots.
// Useful for long full-library runs and stall detection.
//

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

function toNumber(value, fallback = null) {
    var numeric = Number(value);
    if (Number.isFinite(numeric) == false)
        return fallback;
    return numeric;
}

function toBoolean(value, fallback = false) {

    if (value == null)
        return fallback;

    if (typeof value == 'boolean')
        return value;

    var normalized = String(value).trim().toLowerCase();
    if ((normalized == 'true') || (normalized == '1') || (normalized == 'yes') || (normalized == 'y'))
        return true;
    if ((normalized == 'false') || (normalized == '0') || (normalized == 'no') || (normalized == 'n'))
        return false;

    return fallback;

}

function round(value, digits = 3) {

    var numeric = Number(value);
    if (Number.isFinite(numeric) == false)
        return null;

    var factor = 10 ** digits;
    return Math.round(numeric * factor) / factor;

}

function formatDurationMs(value) {

    if ((value == null) || (Number.isFinite(Number(value)) == false))
        return '-';

    var ms = Number(value);

    if (ms < 1000)
        return `${ms.toFixed(0)}ms`;

    var seconds = ms / 1000;
    if (seconds < 60)
        return `${seconds.toFixed(1)}s`;

    var minutes = Math.floor(seconds / 60);
    var remSeconds = (seconds - (minutes * 60));
    return `${minutes}m${remSeconds.toFixed(0)}s`;

}

function printHelp() {

    console.log('Usage: node tools/harness/monitorHarnessRun.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --run <path|run-id>         Run directory or run-id (for example run-20260319_143231037Z).');
    console.log('  --base <path>               Harness output base directory (default: test/output/harness).');
    console.log('  --interval-ms <n>           Poll interval in milliseconds (default: 3000).');
    console.log('  --stale-ms <n>              Warn if run-state age exceeds threshold (default: 20000).');
    console.log('  --exit-on-stale <bool>      Exit with code 2 when stale threshold is reached (default: false).');
    console.log('  --max-wait-ms <n>           Exit with code 3 after this monitor duration (default: none).');
    console.log('  --json <bool>               Emit JSON lines instead of text (default: false).');
    console.log('  --once <bool>               Print one snapshot and exit (default: false).');
    console.log('  --help                      Show this help.');

}

function parseArguments(argv) {

    var options = {
        run: null,
        baseDirectory: path.resolve(process.cwd(), 'test/output/harness'),
        intervalMs: 3000,
        staleMs: 20000,
        exitOnStale: false,
        maxWaitMs: null,
        json: false,
        once: false,
        help: false
    };

    for (var i = 2; i < argv.length; i++) {

        var token = argv[i];

        if ((token == '--help') || (token == '-h')) {
            options.help = true;
            continue;
        }

        if (token == '--run') {
            options.run = String(argv[++i] ?? '').trim();
            continue;
        }

        if (token == '--base') {
            options.baseDirectory = path.resolve(argv[++i]);
            continue;
        }

        if (token == '--interval-ms') {
            options.intervalMs = toNumber(argv[++i], 3000);
            continue;
        }

        if (token == '--stale-ms') {
            options.staleMs = toNumber(argv[++i], 20000);
            continue;
        }

        if (token == '--exit-on-stale') {
            options.exitOnStale = toBoolean(argv[++i], false);
            continue;
        }

        if (token == '--max-wait-ms') {
            options.maxWaitMs = toNumber(argv[++i], null);
            continue;
        }

        if (token == '--json') {
            options.json = toBoolean(argv[++i], false);
            continue;
        }

        if (token == '--once') {
            options.once = toBoolean(argv[++i], false);
            continue;
        }

        throw new Error(`Unknown argument: ${token}`);

    }

    options.intervalMs = Math.max(250, Math.floor(toNumber(options.intervalMs, 3000)));

    if (Number.isFinite(options.staleMs) == false)
        options.staleMs = null;
    else
        options.staleMs = Math.max(0, Math.floor(options.staleMs));

    if (Number.isFinite(options.maxWaitMs) == false)
        options.maxWaitMs = null;
    else
        options.maxWaitMs = Math.max(0, Math.floor(options.maxWaitMs));

    return options;

}

async function resolveRunDirectory(baseDirectory, runOption) {

    if (runOption != null) {

        var candidates = [];

        if (path.isAbsolute(runOption) == true) {
            candidates.push(runOption);
        }
        else {
            candidates.push(path.resolve(process.cwd(), runOption));
            candidates.push(path.resolve(baseDirectory, runOption));
        }

        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            if (fs.existsSync(candidate) == false)
                continue;

            var stat = await fsp.stat(candidate);
            if (stat.isDirectory() == true)
                return candidate;
        }

        throw new Error(`Run directory not found for --run '${runOption}'.`);

    }

    if (fs.existsSync(baseDirectory) == false) {
        throw new Error(`Harness base directory does not exist: ${baseDirectory}`);
    }

    var entries = await fsp.readdir(baseDirectory, { withFileTypes: true });
    var runEntries = entries
        .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
        .map((entry) => path.join(baseDirectory, entry.name));

    if (runEntries.length == 0) {
        throw new Error(`No run-* directories were found under: ${baseDirectory}`);
    }

    var withStats = await Promise.all(
        runEntries.map(async (runPath) => ({
            runPath,
            stat: await fsp.stat(runPath)
        }))
    );

    withStats.sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);
    return withStats[0].runPath;

}

function safeReadJson(filePath) {

    if (fs.existsSync(filePath) == false)
        return null;

    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));

}

function toIsoNow() {
    return new Date().toISOString();
}

function buildSnapshot(runDirectory, runState, checkpoint, previousSnapshot) {

    var now = Date.now();
    var generatedAtMs = (runState?.generatedAt != null)
        ? Date.parse(runState.generatedAt)
        : null;

    var processedCount = Number(runState?.processedCount ?? 0);
    var totalFiles = Number(runState?.totalFiles ?? 0);
    var progressPercent = Number(runState?.progressPercent ?? 0);
    var status = String(runState?.status ?? 'unknown');

    var deltaFiles = null;
    var rateFilesPerSecond = null;

    if (previousSnapshot != null) {
        deltaFiles = processedCount - previousSnapshot.processedCount;
        var deltaSeconds = Math.max(0.001, (now - previousSnapshot.observedAtMs) / 1000);
        rateFilesPerSecond = round(deltaFiles / deltaSeconds, 3);
    }

    var ageMs = (Number.isFinite(generatedAtMs) == true)
        ? Math.max(0, now - generatedAtMs)
        : null;

    return {
        observedAt: toIsoNow(),
        observedAtMs: now,
        runDirectory,
        status,
        processedCount,
        totalFiles,
        progressPercent: round(progressPercent, 3),
        generatedAt: runState?.generatedAt ?? null,
        runStateAgeMs: ageMs,
        deltaFiles,
        rateFilesPerSecond,
        currentFile: runState?.currentFile?.relativePath ?? null,
        currentScenario: runState?.currentScenario?.name ?? null,
        msSinceLastProgress: runState?.msSinceLastProgress ?? null,
        lastCompletedFile: runState?.lastCompletedFile?.relativePath ?? null,
        lastFailure: runState?.lastFailure ?? null,
        telemetry: runState?.telemetry ?? checkpoint?.telemetry ?? null,
        checkpointGeneratedAt: checkpoint?.generatedAt ?? null
    };

}

function formatTextSnapshot(snapshot, staleMs) {

    var staleFlag = '';
    if ((staleMs != null)
        && (snapshot.status == 'running')
        && (snapshot.runStateAgeMs != null)
        && (snapshot.runStateAgeMs >= staleMs)) {
        staleFlag = ' | STALE';
    }

    var delta = (snapshot.deltaFiles == null) ? '-' : String(snapshot.deltaFiles);
    var rate = (snapshot.rateFilesPerSecond == null) ? '-' : `${snapshot.rateFilesPerSecond}/s`;
    var filePart = (snapshot.currentFile == null) ? '-' : snapshot.currentFile;
    var scenarioPart = (snapshot.currentScenario == null) ? '-' : snapshot.currentScenario;
    var agePart = formatDurationMs(snapshot.runStateAgeMs);

    return `[Monitor] ${snapshot.observedAt}`
        + ` | ${snapshot.status}`
        + ` | ${snapshot.processedCount}/${snapshot.totalFiles}`
        + ` (${snapshot.progressPercent}%)`
        + ` | delta=${delta}`
        + ` | rate=${rate}`
        + ` | stateAge=${agePart}`
        + ` | scenario=${scenarioPart}`
        + ` | file=${filePart}`
        + staleFlag;

}

function emitSnapshot(snapshot, options) {

    if (options.json == true) {
        console.log(JSON.stringify(snapshot));
        return;
    }

    console.log(formatTextSnapshot(snapshot, options.staleMs));

}

function emitFinalSummary(runDirectory, status) {

    var reportPath = path.join(runDirectory, 'report.json');
    if (fs.existsSync(reportPath) == false)
        return;

    var report = safeReadJson(reportPath);
    if (report == null)
        return;

    var summary = {
        status,
        filesProcessed: report?.summary?.filesProcessed ?? null,
        filesPassedAllScenarios: report?.summary?.filesPassedAllScenarios ?? null,
        filesWithFailures: report?.summary?.filesWithFailures ?? null,
        warningCountTotal: report?.summary?.warningCountTotal ?? null,
        errorCountTotal: report?.summary?.errorCountTotal ?? null,
        generatedAt: report?.generatedAt ?? null
    };

    console.log(`[Monitor] Final summary: ${JSON.stringify(summary)}`);

}

async function delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {

    var options = parseArguments(process.argv);
    if (options.help == true) {
        printHelp();
        return;
    }

    var runDirectory = await resolveRunDirectory(options.baseDirectory, options.run);
    var runStatePath = path.join(runDirectory, 'run-state.json');
    var checkpointPath = path.join(runDirectory, 'checkpoint.json');

    console.log(`[Monitor] Watching: ${runDirectory}`);
    console.log(`[Monitor] run-state: ${runStatePath}`);
    console.log(`[Monitor] checkpoint: ${checkpointPath}`);

    var monitorStartedAt = Date.now();
    var previousSnapshot = null;

    while (true) {

        var runState = safeReadJson(runStatePath);
        var checkpoint = safeReadJson(checkpointPath);

        if (runState == null) {

            var missingSnapshot = {
                observedAt: toIsoNow(),
                runDirectory,
                status: 'waiting',
                message: 'run-state.json is not available yet.'
            };
            if (options.json == true)
                console.log(JSON.stringify(missingSnapshot));
            else
                console.log(`[Monitor] ${missingSnapshot.observedAt} | waiting | run-state.json not available yet`);

            if (options.once == true)
                return;

            await delay(options.intervalMs);
            continue;

        }

        var snapshot = buildSnapshot(runDirectory, runState, checkpoint, previousSnapshot);
        emitSnapshot(snapshot, options);
        previousSnapshot = snapshot;

        if ((options.staleMs != null)
            && (snapshot.status == 'running')
            && (snapshot.runStateAgeMs != null)
            && (snapshot.runStateAgeMs >= options.staleMs)) {

            console.warn(
                `[Monitor] Stale detected (run-state age ${formatDurationMs(snapshot.runStateAgeMs)}`
                + ` >= ${formatDurationMs(options.staleMs)}).`
            );

            if (options.exitOnStale == true) {
                process.exitCode = 2;
                return;
            }

        }

        if ((snapshot.status == 'completed') || (snapshot.status == 'failed')) {
            emitFinalSummary(runDirectory, snapshot.status);
            process.exitCode = (snapshot.status == 'completed') ? 0 : 1;
            return;
        }

        if (options.once == true)
            return;

        if ((options.maxWaitMs != null) && ((Date.now() - monitorStartedAt) >= options.maxWaitMs)) {
            console.warn(`[Monitor] Max wait reached (${formatDurationMs(options.maxWaitMs)}).`);
            process.exitCode = 3;
            return;
        }

        await delay(options.intervalMs);

    }

}

main().catch((error) => {
    console.error(`[Monitor] Fatal: ${error?.message ?? error}`);
    process.exitCode = 1;
});

