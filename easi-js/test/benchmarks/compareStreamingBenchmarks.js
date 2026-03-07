import fs from 'fs';
import path from 'path';
import { compareStreamingBenchmarkSnapshots } from './streamingBenchmarkCompareUtils.js';

function round(value, digits = 2) {
    if (value == null)
        return null;
    return Number(value.toFixed(digits));
}

function parseArguments(argv) {

    var args = {
        before: null,
        after: null,
        out: null,
        help: false
    };

    for (var i = 2; i < argv.length; i++) {
        var token = argv[i];

        if ((token === '--help') || (token === '-h')) {
            args.help = true;
            continue;
        }

        if (token === '--before') {
            args.before = argv[++i];
            continue;
        }

        if (token === '--after') {
            args.after = argv[++i];
            continue;
        }

        if (token === '--out') {
            args.out = argv[++i];
            continue;
        }
    }

    return args;

}

function printHelp() {
    console.log('Usage: node test/benchmarks/compareStreamingBenchmarks.js [--before <file>] [--after <file>] [--out <file>]');
    console.log('If --before/--after are omitted, the two newest streaming baseline snapshots are used.');
}

function listSnapshotFiles(directory) {

    if (fs.existsSync(directory) == false)
        return [];

    var allFiles = fs.readdirSync(directory)
        .filter((file) => file.startsWith('streaming-baseline-') && file.endsWith('.json'))
        .map((file) => path.join(directory, file));

    allFiles.sort((left, right) => {
        var leftStat = fs.statSync(left);
        var rightStat = fs.statSync(right);
        return (leftStat.mtimeMs - rightStat.mtimeMs);
    });

    return allFiles;

}

function resolveComparisonInputs(args) {

    var benchmarkDirectory = path.join(process.cwd(), 'test/output/benchmarks');
    var snapshotFiles = listSnapshotFiles(benchmarkDirectory);

    if ((args.before != null) && (args.after != null)) {
        return {
            beforePath: path.resolve(args.before),
            afterPath: path.resolve(args.after)
        };
    }

    if (snapshotFiles.length < 2) {
        throw new Error('Unable to resolve comparison inputs. Provide --before and --after, or generate at least two benchmark snapshots.');
    }

    return {
        beforePath: snapshotFiles[snapshotFiles.length - 2],
        afterPath: snapshotFiles[snapshotFiles.length - 1]
    };

}

function loadSnapshot(filePath) {

    if (fs.existsSync(filePath) == false)
        throw new Error(`Benchmark snapshot not found: ${filePath}`);

    var text = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(text);

}

function metricMap(entry) {
    return Object.fromEntries(entry.metrics.map((metric) => [metric.key, metric]));
}

function renderComparison(beforePath, afterPath, comparison) {

    console.log(`\nComparing streaming benchmark snapshots:`);
    console.log(`  before: ${beforePath}`);
    console.log(`  after:  ${afterPath}`);
    console.log(`  matched scenarios: ${comparison.matchedCount}`);

    if (comparison.beforeOnlyKeys.length > 0) {
        console.log(`  before-only scenarios: ${comparison.beforeOnlyKeys.length}`);
    }

    if (comparison.afterOnlyKeys.length > 0) {
        console.log(`  after-only scenarios: ${comparison.afterOnlyKeys.length}`);
    }

    var detailedRows = comparison.entries.map((entry) => {
        var metrics = metricMap(entry);
        return {
            fixture: entry.fixtureName,
            scenario: entry.scenario,
            msBefore: round(metrics.elapsedMsAverage?.before, 2),
            msAfter: round(metrics.elapsedMsAverage?.after, 2),
            msChangePct: round(metrics.elapsedMsAverage?.improvementPercent, 2),
            msTrend: metrics.elapsedMsAverage?.trend,
            mbpsBefore: round(metrics.throughputMBpsAverage?.before, 2),
            mbpsAfter: round(metrics.throughputMBpsAverage?.after, 2),
            mbpsChangePct: round(metrics.throughputMBpsAverage?.improvementPercent, 2),
            mbpsTrend: metrics.throughputMBpsAverage?.trend,
            heapBefore: round(metrics.heapPeakMB?.before, 2),
            heapAfter: round(metrics.heapPeakMB?.after, 2),
            heapChangePct: round(metrics.heapPeakMB?.improvementPercent, 2),
            heapTrend: metrics.heapPeakMB?.trend
        };
    });

    console.log('\nScenario detail:');
    console.table(detailedRows);

    var summaryRows = comparison.metricSummary.map((summary) => ({
        metric: summary.label,
        goal: summary.target,
        beforeAvg: round(summary.beforeAverage, 3),
        afterAvg: round(summary.afterAverage, 3),
        changeAvgPct: round(summary.improvementPercentAverage, 2),
        better: summary.betterCount,
        worse: summary.worseCount,
        same: summary.sameCount,
        unknown: summary.unknownCount
    }));

    console.log('\nMetric summary:');
    console.table(summaryRows);

}

function writeOutput(pathArg, beforePath, afterPath, comparison) {

    if (pathArg == null)
        return null;

    var outputPath = path.resolve(pathArg);
    var outputDirectory = path.dirname(outputPath);
    fs.mkdirSync(outputDirectory, { recursive: true });

    fs.writeFileSync(outputPath, JSON.stringify({
        beforePath: beforePath,
        afterPath: afterPath,
        comparedOn: (new Date()).toISOString(),
        comparison: comparison
    }, null, 2));

    return outputPath;

}

function main() {

    var args = parseArguments(process.argv);
    if (args.help === true) {
        printHelp();
        return;
    }

    var inputs = resolveComparisonInputs(args);
    var beforeSnapshot = loadSnapshot(inputs.beforePath);
    var afterSnapshot = loadSnapshot(inputs.afterPath);
    var comparison = compareStreamingBenchmarkSnapshots(beforeSnapshot, afterSnapshot);

    renderComparison(inputs.beforePath, inputs.afterPath, comparison);

    var outputPath = writeOutput(args.out, inputs.beforePath, inputs.afterPath, comparison);
    if (outputPath != null) {
        console.log(`\nComparison JSON written to: ${outputPath}`);
    }

}

main();
