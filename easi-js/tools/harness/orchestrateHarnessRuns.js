//
// orchestrateHarnessRuns.js - 1.0.0
//
// Run the test-library harness in contiguous index chunks, then optionally merge reports.
//

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import TransferSyntax from '../../src/dicom/TransferSyntax.js';

const DefaultScenarioOrder = [
    'parse',
    'convert',
    'deidentify',
    'transcode',
    'fhir',
    'assets'
];

const NonDicomExtensions = new Set([
    '7z',
    'zip',
    'txt',
    'csv',
    'md',
    'png',
    'jpg',
    'jpeg',
    'gif',
    'html',
    'htm',
    'js',
    'map',
    'pdf',
    'ds_store'
]);

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

function splitCsv(value) {

    if (value == null)
        return [];

    return String(value)
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

}

function parseScenarioList(value) {

    var names = splitCsv(value).map((name) => name.toLowerCase());
    if (names.length == 0)
        return [...DefaultScenarioOrder];

    return names;

}

function parseRegex(value) {

    if ((value == null) || (String(value).trim().length == 0))
        return null;

    return new RegExp(String(value));

}

function getFileExtension(filePath) {

    var extension = path.extname(filePath).trim().toLowerCase();
    if (extension.startsWith('.'))
        extension = extension.slice(1);

    return extension;

}

function shouldIncludeFile(filePath, options) {

    var fileName = path.basename(filePath).toLowerCase();
    if (fileName.startsWith('.'))
        return false;

    var extension = getFileExtension(filePath);
    if (NonDicomExtensions.has(extension) == true)
        return false;

    if ((options.includeExtensions != null) && (options.includeExtensions.size > 0))
        return options.includeExtensions.has(extension);

    if (options.allFiles == true)
        return true;

    if ((extension == 'dcm') || (extension == 'ima') || (extension == 'new') || (extension.length == 0))
        return true;

    return false;

}

async function listCandidateFiles(rootDirectory, options) {

    var directories = [rootDirectory];
    var files = [];

    while (directories.length > 0) {

        var currentDirectory = directories.pop();
        var entries = await fsp.readdir(currentDirectory, { withFileTypes: true });

        for (var i = 0; i < entries.length; i++) {

            var entry = entries[i];
            var absolutePath = path.join(currentDirectory, entry.name);

            if (entry.isDirectory() == true) {
                directories.push(absolutePath);
                continue;
            }

            if (entry.isFile() == false)
                continue;

            if (shouldIncludeFile(absolutePath, options) == false)
                continue;

            if ((options.matchPattern != null) && (options.matchPattern.test(absolutePath) == false))
                continue;

            if ((options.excludeMatchPattern != null) && (options.excludeMatchPattern.test(absolutePath) == true))
                continue;

            files.push(absolutePath);

        }

    }

    files.sort();
    return files;

}

function printHelp() {

    console.log('Usage: node tools/harness/orchestrateHarnessRuns.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --root <path>               Root test-library directory (default: ../data/test-library).');
    console.log('  --output <path>             Harness output base directory (default: test/output/harness).');
    console.log('  --start-index <n>           Start index (default: 0).');
    console.log('  --end-index <n>             Inclusive end index (default: auto from candidate list).');
    console.log('  --max-files <n>             Optional maximum files from start-index.');
    console.log('  --chunk-size <n>            Files per chunk/run (default: 2000).');
    console.log('  --scenarios <csv>           Scenario list.');
    console.log('  --match <regex>             Include regex on absolute path.');
    console.log('  --exclude-match <regex>     Exclude regex on absolute path.');
    console.log('  --include-ext <csv>         Restrict extensions.');
    console.log('  --all-files <bool>          Include all non-ignored ext (default: true).');
    console.log('  --skip-on-parse-fail <bool> Skip downstream scenarios on parse fail (default: true).');
    console.log('  --scenario-timeout-ms <n>   Per-scenario timeout.');
    console.log('  --isolate-file-worker <b>   Isolated worker mode per file (default: true).');
    console.log('  --file-timeout-ms <n>       Per-file hard timeout (default: 8000).');
    console.log('  --validation-goal <goal>    permissive|strict (default: permissive).');
    console.log(`  --transcode-target <uid>    Target syntax UID (default: ${TransferSyntax.ExplicitVRLittleEndian.ID}).`);
    console.log('  --thumbnail-limit <n>       Thumbnail limit per chunk run (default: 25000).');
    console.log('  --progress-every <n>        Progress interval for each chunk run (default: 50).');
    console.log('  --checkpoint-every <n>      Checkpoint interval for each chunk run (default: 250).');
    console.log('  --continue-on-error <bool>  Continue chunk sequence if one chunk fails (default: true).');
    console.log('  --merge <bool>              Merge completed chunk runs at end (default: true).');
    console.log('  --merge-name <value>        Optional merge name metadata.');
    console.log('  --merge-output <path>       Optional merged report output directory.');
    console.log('  --dry-run <bool>            Show planned chunks only (default: false).');
    console.log('  --quiet <bool>              Reduce orchestrator logging (default: false).');
    console.log('  --help                      Show help.');

}

function parseArguments(argv) {

    var options = {
        rootDirectory: path.resolve(process.cwd(), '../data/test-library'),
        outputBaseDirectory: path.resolve(process.cwd(), 'test/output/harness'),
        startIndex: 0,
        endIndex: null,
        maxFiles: null,
        chunkSize: 2000,
        scenarios: [...DefaultScenarioOrder],
        matchPattern: null,
        excludeMatchPattern: null,
        includeExtensions: null,
        allFiles: true,
        skipOnParseFailure: true,
        scenarioTimeoutMs: null,
        isolateFileWorker: true,
        fileTimeoutMs: 8000,
        validationGoal: 'permissive',
        transcodeTargetSyntax: TransferSyntax.ExplicitVRLittleEndian.ID,
        thumbnailLimit: 25000,
        progressEvery: 50,
        checkpointEvery: 250,
        continueOnError: true,
        merge: true,
        mergeName: null,
        mergeOutput: null,
        dryRun: false,
        quiet: false,
        help: false
    };

    for (var i = 2; i < argv.length; i++) {

        var token = argv[i];

        if ((token == '--help') || (token == '-h')) {
            options.help = true;
            continue;
        }

        if (token == '--root') {
            options.rootDirectory = path.resolve(argv[++i]);
            continue;
        }

        if (token == '--output') {
            options.outputBaseDirectory = path.resolve(argv[++i]);
            continue;
        }

        if (token == '--start-index') {
            options.startIndex = toNumber(argv[++i], 0);
            continue;
        }

        if (token == '--end-index') {
            options.endIndex = toNumber(argv[++i], null);
            continue;
        }

        if (token == '--max-files') {
            options.maxFiles = toNumber(argv[++i], null);
            continue;
        }

        if (token == '--chunk-size') {
            options.chunkSize = toNumber(argv[++i], 2000);
            continue;
        }

        if (token == '--scenarios') {
            options.scenarios = parseScenarioList(argv[++i]);
            continue;
        }

        if (token == '--match') {
            options.matchPattern = parseRegex(argv[++i]);
            continue;
        }

        if (token == '--exclude-match') {
            options.excludeMatchPattern = parseRegex(argv[++i]);
            continue;
        }

        if (token == '--include-ext') {
            options.includeExtensions = new Set(splitCsv(argv[++i]).map((value) => value.toLowerCase()));
            continue;
        }

        if (token == '--all-files') {
            options.allFiles = toBoolean(argv[++i], true);
            continue;
        }

        if (token == '--skip-on-parse-fail') {
            options.skipOnParseFailure = toBoolean(argv[++i], true);
            continue;
        }

        if (token == '--scenario-timeout-ms') {
            options.scenarioTimeoutMs = toNumber(argv[++i], null);
            continue;
        }

        if (token == '--isolate-file-worker') {
            options.isolateFileWorker = toBoolean(argv[++i], true);
            continue;
        }

        if (token == '--file-timeout-ms') {
            options.fileTimeoutMs = toNumber(argv[++i], 8000);
            continue;
        }

        if (token == '--validation-goal') {
            options.validationGoal = String(argv[++i] ?? 'permissive').trim().toLowerCase();
            continue;
        }

        if (token == '--transcode-target') {
            options.transcodeTargetSyntax = String(argv[++i] ?? '').trim();
            continue;
        }

        if (token == '--thumbnail-limit') {
            options.thumbnailLimit = toNumber(argv[++i], 25000);
            continue;
        }

        if (token == '--progress-every') {
            options.progressEvery = toNumber(argv[++i], 50);
            continue;
        }

        if (token == '--checkpoint-every') {
            options.checkpointEvery = toNumber(argv[++i], 250);
            continue;
        }

        if (token == '--continue-on-error') {
            options.continueOnError = toBoolean(argv[++i], true);
            continue;
        }

        if (token == '--merge') {
            options.merge = toBoolean(argv[++i], true);
            continue;
        }

        if (token == '--merge-name') {
            options.mergeName = String(argv[++i] ?? '').trim();
            continue;
        }

        if (token == '--merge-output') {
            options.mergeOutput = path.resolve(argv[++i]);
            continue;
        }

        if (token == '--dry-run') {
            options.dryRun = toBoolean(argv[++i], false);
            continue;
        }

        if (token == '--quiet') {
            options.quiet = toBoolean(argv[++i], false);
            continue;
        }

        throw new Error(`Unknown argument: ${token}`);

    }

    if (Number.isFinite(options.startIndex) == false)
        options.startIndex = 0;
    else
        options.startIndex = Math.max(0, Math.floor(options.startIndex));

    if (Number.isFinite(options.endIndex) == false)
        options.endIndex = null;
    else
        options.endIndex = Math.max(0, Math.floor(options.endIndex));

    if (Number.isFinite(options.maxFiles) == false)
        options.maxFiles = null;
    else
        options.maxFiles = Math.max(1, Math.floor(options.maxFiles));

    if (Number.isFinite(options.chunkSize) == false)
        options.chunkSize = 2000;
    else
        options.chunkSize = Math.max(1, Math.floor(options.chunkSize));

    if (Number.isFinite(options.scenarioTimeoutMs) == false)
        options.scenarioTimeoutMs = null;
    else
        options.scenarioTimeoutMs = Math.max(1, Math.floor(options.scenarioTimeoutMs));

    if (Number.isFinite(options.fileTimeoutMs) == false)
        options.fileTimeoutMs = null;
    else
        options.fileTimeoutMs = Math.max(1, Math.floor(options.fileTimeoutMs));

    if (Number.isFinite(options.thumbnailLimit) == false)
        options.thumbnailLimit = 25000;
    else
        options.thumbnailLimit = Math.max(0, Math.floor(options.thumbnailLimit));

    if (Number.isFinite(options.progressEvery) == false)
        options.progressEvery = 50;
    else
        options.progressEvery = Math.max(1, Math.floor(options.progressEvery));

    if (Number.isFinite(options.checkpointEvery) == false)
        options.checkpointEvery = 250;
    else
        options.checkpointEvery = Math.max(1, Math.floor(options.checkpointEvery));

    if ((options.validationGoal != 'strict') && (options.validationGoal != 'permissive'))
        options.validationGoal = 'permissive';

    return options;

}

function createChunkRanges(startIndex, endIndex, chunkSize) {

    var ranges = [];
    if (endIndex < startIndex)
        return ranges;

    for (var cursor = startIndex; cursor <= endIndex; cursor += chunkSize) {
        ranges.push({
            startIndex: cursor,
            endIndex: Math.min(endIndex, cursor + chunkSize - 1)
        });
    }

    return ranges;

}

async function listRunDirectories(outputBaseDirectory) {

    if (fs.existsSync(outputBaseDirectory) == false)
        return [];

    var entries = await fsp.readdir(outputBaseDirectory, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isDirectory() == true)
        .map((entry) => entry.name)
        .filter((name) => name.startsWith('run-'))
        .sort();

}

function setDifference(after, before) {

    var beforeSet = new Set(before);
    return after.filter((value) => beforeSet.has(value) == false);

}

function pipeChunkOutput(chunkIndex, streamName, chunk) {

    var lines = String(chunk)
        .split(/\r?\n/)
        .filter((line) => line.length > 0);

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (streamName == 'stderr')
            process.stderr.write(`[Harness:Chunk ${chunkIndex + 1}] ${line}\n`);
        else
            process.stdout.write(`[Harness:Chunk ${chunkIndex + 1}] ${line}\n`);
    }

}

async function runHarnessChunk(chunkRange, chunkIndex, options) {

    var beforeRuns = await listRunDirectories(options.outputBaseDirectory);

    var args = [
        path.resolve('tools/harness/runTestLibraryHarness.js'),
        '--root', options.rootDirectory,
        '--output', options.outputBaseDirectory,
        '--start-index', String(chunkRange.startIndex),
        '--end-index', String(chunkRange.endIndex),
        '--scenarios', options.scenarios.join(','),
        '--all-files', String(options.allFiles),
        '--skip-on-parse-fail', String(options.skipOnParseFailure),
        '--isolate-file-worker', String(options.isolateFileWorker),
        '--validation-goal', options.validationGoal,
        '--transcode-target', options.transcodeTargetSyntax,
        '--thumbnail-limit', String(options.thumbnailLimit),
        '--progress-every', String(options.progressEvery),
        '--checkpoint-every', String(options.checkpointEvery),
        '--quiet', 'false'
    ];

    if (options.scenarioTimeoutMs != null) {
        args.push('--scenario-timeout-ms', String(options.scenarioTimeoutMs));
    }

    if (options.fileTimeoutMs != null) {
        args.push('--file-timeout-ms', String(options.fileTimeoutMs));
    }

    if (options.matchPattern != null) {
        args.push('--match', String(options.matchPattern));
    }

    if (options.excludeMatchPattern != null) {
        args.push('--exclude-match', String(options.excludeMatchPattern));
    }

    if ((options.includeExtensions != null) && (options.includeExtensions.size > 0)) {
        args.push('--include-ext', Array.from(options.includeExtensions.values()).join(','));
    }

    return await new Promise((resolve) => {

        var stdoutText = '';
        var stderrText = '';

        var child = spawn(process.execPath, args, {
            cwd: process.cwd(),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        child.stdout.on('data', (chunk) => {
            var text = chunk.toString();
            stdoutText += text;
            if (options.quiet != true)
                pipeChunkOutput(chunkIndex, 'stdout', text);
        });

        child.stderr.on('data', (chunk) => {
            var text = chunk.toString();
            stderrText += text;
            pipeChunkOutput(chunkIndex, 'stderr', text);
        });

        child.on('close', async (code) => {

            var afterRuns = await listRunDirectories(options.outputBaseDirectory);
            var newRuns = setDifference(afterRuns, beforeRuns);
            var runName = (newRuns.length > 0) ? newRuns[newRuns.length - 1] : null;

            if (runName == null) {
                var outputMatch = stdoutText.match(/\[Harness\] Output:\s+(.+)/);
                if (outputMatch != null) {
                    runName = path.basename(outputMatch[1].trim());
                }
            }

            resolve({
                code,
                runName,
                stdoutText,
                stderrText
            });

        });

    });

}

async function runMerge(runNames, options) {

    if (runNames.length == 0)
        return null;

    var args = [
        path.resolve('tools/harness/mergeHarnessRuns.js'),
        '--root', options.outputBaseDirectory,
        '--runs', runNames.join(',')
    ];

    if ((options.mergeName != null) && (options.mergeName.length > 0)) {
        args.push('--name', options.mergeName);
    }

    if (options.mergeOutput != null) {
        args.push('--output', options.mergeOutput);
    }

    return await new Promise((resolve) => {

        var child = spawn(process.execPath, args, {
            cwd: process.cwd(),
            stdio: 'inherit'
        });

        child.on('close', (code) => {
            resolve(code);
        });

    });

}

async function main() {

    var options = parseArguments(process.argv);

    if (options.help == true) {
        printHelp();
        return;
    }

    if (fs.existsSync(options.rootDirectory) == false)
        throw new Error(`Root directory does not exist: ${options.rootDirectory}`);

    await fsp.mkdir(options.outputBaseDirectory, { recursive: true });

    var candidateFiles = await listCandidateFiles(options.rootDirectory, options);
    var totalCandidates = candidateFiles.length;

    var startIndex = options.startIndex;
    if (startIndex > totalCandidates)
        startIndex = totalCandidates;

    var endIndex = options.endIndex;
    if ((endIndex == null) || (Number.isFinite(endIndex) == false))
        endIndex = totalCandidates - 1;

    if (totalCandidates == 0)
        endIndex = -1;
    else
        endIndex = Math.min(Math.max(startIndex, endIndex), totalCandidates - 1);

    if (options.maxFiles != null) {
        endIndex = Math.min(endIndex, startIndex + options.maxFiles - 1);
    }

    var ranges = createChunkRanges(startIndex, endIndex, options.chunkSize);

    console.log('[Harness:Orchestrate] Starting.');
    console.log(`[Harness:Orchestrate] Candidates: ${totalCandidates}`);
    console.log(`[Harness:Orchestrate] Selected range: ${startIndex}..${endIndex}`);
    console.log(`[Harness:Orchestrate] Chunk size: ${options.chunkSize}`);
    console.log(`[Harness:Orchestrate] Chunk count: ${ranges.length}`);
    console.log(`[Harness:Orchestrate] Worker isolation: ${options.isolateFileWorker}`);

    if (options.dryRun == true) {
        for (var dryIndex = 0; dryIndex < ranges.length; dryIndex++) {
            console.log(`[Harness:Orchestrate] Chunk ${dryIndex + 1}: ${ranges[dryIndex].startIndex}..${ranges[dryIndex].endIndex}`);
        }
        console.log('[Harness:Orchestrate] Dry run complete.');
        return;
    }

    var completedRunNames = [];
    var failedChunks = [];

    for (var chunkIndex = 0; chunkIndex < ranges.length; chunkIndex++) {

        var chunkRange = ranges[chunkIndex];

        console.log(`[Harness:Orchestrate] Running chunk ${chunkIndex + 1}/${ranges.length}: ${chunkRange.startIndex}..${chunkRange.endIndex}`);

        var chunkResult = await runHarnessChunk(chunkRange, chunkIndex, options);

        if ((chunkResult.runName != null) && (chunkResult.runName.length > 0)) {
            completedRunNames.push(chunkResult.runName);
        }

        if (chunkResult.code != 0) {

            failedChunks.push({
                chunkIndex,
                range: chunkRange,
                exitCode: chunkResult.code,
                runName: chunkResult.runName
            });

            console.error(`[Harness:Orchestrate] Chunk ${chunkIndex + 1} failed (exit=${chunkResult.code}).`);

            if (options.continueOnError != true)
                break;

        }
        else {
            console.log(`[Harness:Orchestrate] Chunk ${chunkIndex + 1} completed.`);
        }

    }

    var mergeExitCode = null;
    if ((options.merge == true) && (completedRunNames.length > 0)) {
        console.log(`[Harness:Orchestrate] Merging ${completedRunNames.length} run(s).`);
        mergeExitCode = await runMerge(completedRunNames, options);
        if (mergeExitCode != 0)
            console.error(`[Harness:Orchestrate] Merge failed with exit code ${mergeExitCode}.`);
    }

    console.log('[Harness:Orchestrate] Completed.');
    console.log(`[Harness:Orchestrate] Chunk runs created: ${completedRunNames.length}`);
    console.log(`[Harness:Orchestrate] Failed chunks: ${failedChunks.length}`);

    if (failedChunks.length > 0) {
        for (var i = 0; i < failedChunks.length; i++) {
            var failed = failedChunks[i];
            console.error(
                `[Harness:Orchestrate] Failed chunk ${failed.chunkIndex + 1}`
                + ` range=${failed.range.startIndex}..${failed.range.endIndex}`
                + ` exit=${failed.exitCode}`
                + ` run=${failed.runName ?? '-'}`
            );
        }
    }

    if ((failedChunks.length > 0) || ((mergeExitCode != null) && (mergeExitCode != 0)))
        process.exitCode = 1;

}

main().catch((error) => {
    console.error('[Harness:Orchestrate] Failed.');
    console.error(`${error.name ?? 'Error'}: ${error.message ?? String(error)}`);
    if (typeof error?.stack == 'string') {
        console.error(error.stack);
    }
    process.exitCode = 1;
});
