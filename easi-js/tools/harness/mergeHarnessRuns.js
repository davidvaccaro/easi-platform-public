//
// mergeHarnessRuns.js - 1.0.0
//
// Merge one or more harness run reports into a consolidated JSON + HTML report.
//

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { renderTestLibraryHarnessHtmlPages } from './TestLibraryHarnessHtmlReport.js';

const ScenarioOrder = ['parse', 'convert', 'deidentify', 'transcode', 'fhir', 'assets'];

function toIsoTimestamp(date = new Date()) {
    return date.toISOString();
}

function createStamp(date = new Date()) {
    return date.toISOString()
        .replaceAll(':', '')
        .replaceAll('-', '')
        .replaceAll('.', '')
        .replace('T', '_')
        .replace('Z', 'Z');
}

function toNumber(value, fallback = null) {

    var numeric = Number(value);
    if (Number.isFinite(numeric) == false)
        return fallback;

    return numeric;

}

function splitCsv(value) {

    if (value == null)
        return [];

    return String(value)
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

}

function round(value, digits = 3) {

    if (value == null)
        return null;

    var numeric = Number(value);
    if (Number.isFinite(numeric) == false)
        return null;

    return Number(numeric.toFixed(digits));

}

function normalizeScenarioStatus(status) {

    if ((status == 'pass') || (status == 'fail') || (status == 'skip'))
        return status;

    return 'fail';

}

function buildScenarioList(reports) {

    var ordered = [];
    var seen = new Set();

    for (var i = 0; i < ScenarioOrder.length; i++) {

        var scenarioName = ScenarioOrder[i];

        for (var reportIndex = 0; reportIndex < reports.length; reportIndex++) {

            var reportScenarios = reports[reportIndex]?.configuration?.scenarios ?? [];
            if (reportScenarios.includes(scenarioName) == false)
                continue;

            if (seen.has(scenarioName) == true)
                continue;

            seen.add(scenarioName);
            ordered.push(scenarioName);
            break;

        }

    }

    for (var reportIndex = 0; reportIndex < reports.length; reportIndex++) {

        var scenarios = reports[reportIndex]?.configuration?.scenarios ?? [];
        for (var scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {

            var scenarioName = scenarios[scenarioIndex];
            if (seen.has(scenarioName) == true)
                continue;

            seen.add(scenarioName);
            ordered.push(scenarioName);

        }

    }

    return ordered;

}

function buildSummary(files, scenarios) {

    var summary = {
        filesProcessed: files.length,
        filesPassedAllScenarios: 0,
        filesWithFailures: 0,
        elapsedMsTotal: 0,
        warningCountTotal: 0,
        errorCountTotal: 0,
        scenarios: {}
    };

    for (var scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {
        summary.scenarios[scenarios[scenarioIndex]] = {
            passCount: 0,
            failCount: 0,
            skipCount: 0,
            averageMs: null,
            maxMs: null
        };
    }

    for (var i = 0; i < files.length; i++) {

        var file = files[i];
        var hasFailure = false;
        summary.elapsedMsTotal += Number(file?.totalElapsedMs ?? 0);

        for (var scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {

            var scenarioName = scenarios[scenarioIndex];
            var scenarioResult = file?.scenarios?.[scenarioName];
            if (scenarioResult == null)
                continue;

            var scenarioSummary = summary.scenarios[scenarioName];
            var status = normalizeScenarioStatus(scenarioResult.status);

            if (status == 'pass')
                scenarioSummary.passCount++;
            else if (status == 'fail')
                scenarioSummary.failCount++;
            else
                scenarioSummary.skipCount++;

            if (status == 'fail')
                hasFailure = true;

            summary.warningCountTotal += Number(scenarioResult.warningCount ?? 0);
            summary.errorCountTotal += Number(scenarioResult.errorCount ?? 0);

            if ((status == 'pass') || (status == 'fail')) {

                var elapsed = toNumber(scenarioResult.elapsedMs, null);
                if (elapsed != null) {

                    if (scenarioSummary.averageMs == null) {
                        scenarioSummary.averageMs = elapsed;
                        scenarioSummary._count = 1;
                    }
                    else {
                        scenarioSummary.averageMs += elapsed;
                        scenarioSummary._count += 1;
                    }

                    scenarioSummary.maxMs = (scenarioSummary.maxMs == null)
                        ? elapsed
                        : Math.max(scenarioSummary.maxMs, elapsed);

                }

            }

        }

        if (hasFailure == true)
            summary.filesWithFailures++;
        else
            summary.filesPassedAllScenarios++;

    }

    var scenarioKeys = Object.keys(summary.scenarios);
    for (var keyIndex = 0; keyIndex < scenarioKeys.length; keyIndex++) {

        var key = scenarioKeys[keyIndex];
        var scenario = summary.scenarios[key];

        if (scenario._count > 0)
            scenario.averageMs = round(scenario.averageMs / scenario._count, 3);

        scenario.maxMs = round(scenario.maxMs, 3);
        delete scenario._count;

    }

    summary.elapsedMsTotal = round(summary.elapsedMsTotal, 3);

    return summary;

}

function printHelp() {

    console.log('Usage: node tools/harness/mergeHarnessRuns.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --root <path>              Harness output base directory (default: test/output/harness).');
    console.log('  --runs <csv>              Run directory names (or absolute paths) to merge.');
    console.log('  --latest <n>              Merge latest N runs that contain report.json.');
    console.log('  --output <path>           Output directory for merged report (default: <root>/merged-<stamp>).');
    console.log('  --name <value>            Optional merge name in metadata.');
    console.log('  --help                    Show help.');

}

function parseArguments(argv) {

    var options = {
        rootDirectory: path.resolve(process.cwd(), 'test/output/harness'),
        runs: [],
        latestCount: null,
        outputDirectory: null,
        name: null,
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

        if (token == '--runs') {
            options.runs = splitCsv(argv[++i]);
            continue;
        }

        if (token == '--latest') {
            options.latestCount = toNumber(argv[++i], null);
            continue;
        }

        if (token == '--output') {
            options.outputDirectory = path.resolve(argv[++i]);
            continue;
        }

        if (token == '--name') {
            options.name = String(argv[++i] ?? '').trim();
            continue;
        }

        throw new Error(`Unknown argument: ${token}`);

    }

    if (Number.isFinite(options.latestCount) == false)
        options.latestCount = null;
    else
        options.latestCount = Math.max(1, Math.floor(options.latestCount));

    return options;

}

async function listRunnableRunDirectories(rootDirectory) {

    if (fs.existsSync(rootDirectory) == false)
        return [];

    var entries = await fsp.readdir(rootDirectory, { withFileTypes: true });
    var runs = [];

    for (var i = 0; i < entries.length; i++) {

        var entry = entries[i];
        if (entry.isDirectory() == false)
            continue;

        var runDirectory = path.join(rootDirectory, entry.name);
        var reportPath = path.join(runDirectory, 'report.json');
        if (fs.existsSync(reportPath) == false)
            continue;

        var stat = await fsp.stat(reportPath);
        runs.push({
            name: entry.name,
            runDirectory,
            reportPath,
            mtimeMs: stat.mtimeMs
        });

    }

    runs.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return runs;

}

function resolveRunInput(input, rootDirectory) {

    if (path.isAbsolute(input) == true)
        return input;

    return path.join(rootDirectory, input);

}

async function loadReports(options) {

    var selectedRunDirectories = [];

    if (options.runs.length > 0) {

        for (var i = 0; i < options.runs.length; i++) {
            selectedRunDirectories.push(resolveRunInput(options.runs[i], options.rootDirectory));
        }

    }
    else if (options.latestCount != null) {

        var latestRuns = await listRunnableRunDirectories(options.rootDirectory);
        selectedRunDirectories = latestRuns.slice(0, options.latestCount).map((item) => item.runDirectory);

    }

    if (selectedRunDirectories.length == 0)
        throw new Error('No runs selected. Provide --runs <csv> or --latest <n>.');

    var reports = [];

    for (var i = 0; i < selectedRunDirectories.length; i++) {

        var runDirectory = path.resolve(selectedRunDirectories[i]);
        var reportPath = path.join(runDirectory, 'report.json');

        if (fs.existsSync(reportPath) == false)
            throw new Error(`Missing report.json in run directory: ${runDirectory}`);

        var parsed = JSON.parse(await fsp.readFile(reportPath, 'utf-8'));
        reports.push({
            runDirectory,
            reportPath,
            report: parsed
        });

    }

    return reports;

}

function mergeReports(loadedReports, options) {

    var mergedByPath = new Map();
    var duplicateCount = 0;

    for (var reportIndex = 0; reportIndex < loadedReports.length; reportIndex++) {

        var source = loadedReports[reportIndex];
        var files = source?.report?.files ?? [];

        for (var fileIndex = 0; fileIndex < files.length; fileIndex++) {

            var file = files[fileIndex];
            var dedupeKey = String(file?.absolutePath ?? file?.relativePath ?? `${source.runDirectory}::${fileIndex}`);

            if (mergedByPath.has(dedupeKey) == true)
                duplicateCount++;

            mergedByPath.set(dedupeKey, {
                ...file,
                __mergedFrom: path.basename(source.runDirectory)
            });

        }

    }

    var files = Array.from(mergedByPath.values());
    files.sort((a, b) => {

        var leftIndex = toNumber(a?.index, Number.MAX_SAFE_INTEGER);
        var rightIndex = toNumber(b?.index, Number.MAX_SAFE_INTEGER);
        if (leftIndex != rightIndex)
            return leftIndex - rightIndex;

        var leftPath = String(a?.absolutePath ?? a?.relativePath ?? '');
        var rightPath = String(b?.absolutePath ?? b?.relativePath ?? '');
        return leftPath.localeCompare(rightPath);

    });

    var scenarioList = buildScenarioList(loadedReports.map((item) => item.report));
    var summary = buildSummary(files, scenarioList);

    return {
        generatedAt: toIsoTimestamp(),
        configuration: {
            merged: true,
            name: (options.name && options.name.length > 0) ? options.name : null,
            sourceRuns: loadedReports.map((item) => ({
                runDirectory: item.runDirectory,
                generatedAt: item.report?.generatedAt ?? null,
                scenarios: item.report?.configuration?.scenarios ?? [],
                filesProcessed: item.report?.summary?.filesProcessed ?? 0,
                filesWithFailures: item.report?.summary?.filesWithFailures ?? 0
            })),
            scenarios: scenarioList,
            dedupeKey: 'absolutePath|relativePath',
            duplicateCount
        },
        telemetry: {
            latest: null,
            peaks: null
        },
        summary,
        files
    };

}

async function writeMergedReport(report, options) {

    var outputDirectory = options.outputDirectory;
    if ((outputDirectory == null) || (String(outputDirectory).trim().length == 0)) {
        outputDirectory = path.join(options.rootDirectory, `merged-${createStamp()}`);
    }

    await fsp.mkdir(outputDirectory, { recursive: true });

    var reportJsonPath = path.join(outputDirectory, 'report.json');
    var reportHtmlPath = path.join(outputDirectory, 'report.html');

    await fsp.writeFile(reportJsonPath, JSON.stringify(report, null, 2), 'utf-8');

    var htmlPages = renderTestLibraryHarnessHtmlPages(report, {
        pageSize: 1000,
        outputDirectory: outputDirectory,
        easiSourceDirectory: path.resolve('src')
    });
    await fsp.writeFile(reportHtmlPath, htmlPages.mainHtml, 'utf-8');

    var reportPagePaths = [];
    for (var pageIndex = 0; pageIndex < htmlPages.pages.length; pageIndex++) {
        var page = htmlPages.pages[pageIndex];
        var reportPagePath = path.join(outputDirectory, page.fileName);
        reportPagePaths.push(reportPagePath);
        await fsp.writeFile(reportPagePath, page.html, 'utf-8');
    }

    return {
        outputDirectory,
        reportJsonPath,
        reportHtmlPath,
        reportPagePaths
    };

}

async function main() {

    var options = parseArguments(process.argv);

    if (options.help == true) {
        printHelp();
        return;
    }

    var loadedReports = await loadReports(options);
    var mergedReport = mergeReports(loadedReports, options);
    var output = await writeMergedReport(mergedReport, options);

    console.log('[Harness:Merge] Completed.');
    console.log(`[Harness:Merge] Source runs: ${loadedReports.length}`);
    console.log(`[Harness:Merge] Files processed: ${mergedReport.summary.filesProcessed}`);
    console.log(`[Harness:Merge] Files with failures: ${mergedReport.summary.filesWithFailures}`);
    console.log(`[Harness:Merge] JSON report: ${output.reportJsonPath}`);
    console.log(`[Harness:Merge] HTML report: ${output.reportHtmlPath}`);
    console.log(`[Harness:Merge] HTML modality pages: ${output.reportPagePaths?.length ?? 0}`);

}

main().catch((error) => {
    console.error('[Harness:Merge] Failed.');
    console.error(`${error.name ?? 'Error'}: ${error.message ?? String(error)}`);
    if (typeof error?.stack == 'string') {
        console.error(error.stack);
    }
    process.exitCode = 1;
});
