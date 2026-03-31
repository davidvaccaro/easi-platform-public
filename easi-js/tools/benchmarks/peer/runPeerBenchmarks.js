import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

function parseArguments(argv) {

    var args = {
        workload: 'tools/benchmarks/peer/workloads/default-workload.json',
        iterations: 8,
        warmup: 2,
        include: null,
        output: null
    };

    for (var i = 2; i < argv.length; i++) {

        var token = argv[i];

        if (token === '--workload') {
            args.workload = argv[++i];
            continue;
        }

        if (token === '--iterations') {
            args.iterations = Math.max(1, Number.parseInt(argv[++i], 10));
            continue;
        }

        if (token === '--warmup') {
            args.warmup = Math.max(0, Number.parseInt(argv[++i], 10));
            continue;
        }

        if (token === '--include') {
            var includeCsv = String(argv[++i] || '').trim();
            args.include = includeCsv.length > 0 ? includeCsv.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean) : null;
            continue;
        }

        if (token === '--output') {
            args.output = argv[++i];
            continue;
        }

    }

    return args;

}

function average(values) {
    if ((Array.isArray(values) !== true) || (values.length === 0)) {
        return null;
    }
    return values.reduce((sum, value) => (sum + value), 0) / values.length;
}

function percentile(values, p) {

    if ((Array.isArray(values) !== true) || (values.length === 0)) {
        return null;
    }

    var sorted = [...values].sort((left, right) => left - right);
    var index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[index];

}

function round(value, digits = 3) {
    if (value == null) {
        return null;
    }
    return Number(value.toFixed(digits));
}

function resolveRepoRoot() {

    var marker = `${path.sep}easi-js`;
    var cwd = process.cwd();
    var markerIndex = cwd.lastIndexOf(marker);

    if (markerIndex > -1) {
        return cwd.substring(0, markerIndex);
    }

    return cwd;

}

function resolveToolkitRunners() {

    var venvPython = path.resolve(process.cwd(), 'tools/benchmarks/peer/.venv/bin/python3');
    var pythonCommand = (fs.existsSync(venvPython) === true)
        ? venvPython
        : 'python3';
    var dcmtkBuiltDump = path.resolve(process.cwd(), 'tools/benchmarks/peer/vendors/build/dcmtk/bin/dcmdump');
    var gdcmBuiltDump = path.resolve(process.cwd(), 'tools/benchmarks/peer/vendors/build/gdcm/bin/gdcmdump');
    var dcm4cheInstalledDump = path.resolve(process.cwd(), 'tools/benchmarks/peer/vendors/dcm4che/bin/dcmdump');
    var dcm4cheSourceTarget = path.resolve(process.cwd(), 'tools/benchmarks/peer/vendors/src/dcm4che/dcm4che-assembly/target');
    var dcm4cheInProcessJar = path.resolve(process.cwd(), 'tools/benchmarks/peer/runners/dcm4che/target/dcm4che-bench.jar');
    var dcm4cheSourceBuildDump = null;
    if (fs.existsSync(dcm4cheSourceTarget) === true) {
        var candidates = fs.readdirSync(dcm4cheSourceTarget)
            .filter((entry) => entry.startsWith('dcm4che-') && entry.endsWith('-bin'))
            .map((entry) => path.join(dcm4cheSourceTarget, entry));
        for (var candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
            var candidateRoot = candidates[candidateIndex];
            if (fs.statSync(candidateRoot).isDirectory() !== true) {
                continue;
            }
            var childEntries = fs.readdirSync(candidateRoot);
            for (var childIndex = 0; childIndex < childEntries.length; childIndex++) {
                var dumpPath = path.join(candidateRoot, childEntries[childIndex], 'bin', 'dcmdump');
                if (fs.existsSync(dumpPath) === true) {
                    dcm4cheSourceBuildDump = dumpPath;
                    break;
                }
            }
            if (dcm4cheSourceBuildDump != null) {
                break;
            }
        }
    }
    var dcm4cheDumpPath = (fs.existsSync(dcm4cheInstalledDump) === true)
        ? dcm4cheInstalledDump
        : ((fs.existsSync(dcm4cheSourceBuildDump) === true) ? dcm4cheSourceBuildDump : null);

    return [
        {
            key: 'easi-js',
            label: 'EASI JS',
            command: ['node', 'tools/benchmarks/peer/runners/easiRunner.js']
        },
        {
            key: 'pydicom',
            label: 'pydicom',
            command: [pythonCommand, 'tools/benchmarks/peer/runners/pydicomRunner.py']
        },
        {
            key: 'fo-dicom',
            label: 'fo-dicom',
            command: ['dotnet', 'run', '--project', 'tools/benchmarks/peer/runners/fodicom/FoDicomBench/FoDicomBench.csproj', '--configuration', 'Release', '--']
        },
        {
            key: 'dcm4che',
            label: 'dcm4che',
            command: (fs.existsSync(dcm4cheInProcessJar) === true)
                ? ['java', '-jar', 'tools/benchmarks/peer/runners/dcm4che/target/dcm4che-bench.jar']
                : ((dcm4cheDumpPath == null)
                    ? ['bash', 'tools/benchmarks/peer/runners/dcm4cheRunner.sh']
                    : ['env', `DCM4CHE_DCMDUMP=${dcm4cheDumpPath}`, 'bash', 'tools/benchmarks/peer/runners/dcm4cheRunner.sh'])
        },
        {
            key: 'dcmtk',
            label: 'DCMTK',
            command: (fs.existsSync(dcmtkBuiltDump) === true)
                ? ['env', `DCMDUMP_BIN=${dcmtkBuiltDump}`, 'bash', 'tools/benchmarks/peer/runners/dcmtkRunner.sh']
                : ['bash', 'tools/benchmarks/peer/runners/dcmtkRunner.sh']
        },
        {
            key: 'gdcm',
            label: 'GDCM',
            command: (fs.existsSync(gdcmBuiltDump) === true)
                ? ['env', `GDCMDUMP_BIN=${gdcmBuiltDump}`, 'bash', 'tools/benchmarks/peer/runners/gdcmRunner.sh']
                : ['bash', 'tools/benchmarks/peer/runners/gdcmRunner.sh']
        }
    ];

}

function executeRunner(runner, filePath, iterations, warmup) {

    var command = [...runner.command, '--file', filePath, '--iterations', String(iterations), '--warmup', String(warmup)];

    var result = spawnSync(command[0], command.slice(1), {
        cwd: path.resolve(process.cwd()),
        env: process.env,
        encoding: 'utf-8',
        timeout: 600000,
        maxBuffer: 10 * 1024 * 1024
    });

    if (result.status !== 0) {
        return {
            ok: false,
            error: String(result.stderr || result.stdout || `Runner exited with status ${result.status}`).trim()
        };
    }

    try {
        return {
            ok: true,
            output: JSON.parse(String(result.stdout || '{}'))
        };
    }
    catch (error) {
        return {
            ok: false,
            error: `Failed parsing runner JSON output: ${error?.message || error}`
        };
    }

}

function summarizeResult(output) {

    var samples = Array.isArray(output.samplesMs) ? output.samplesMs : [];
    var avgMs = average(samples);
    var fileSizeBytes = Number(output.fileSizeBytes || 0);
    var throughputMBps = (avgMs == null || avgMs <= 0)
        ? null
        : ((fileSizeBytes / (1024 * 1024)) / (avgMs / 1000));

    return {
        samples,
        avgMs,
        p50Ms: percentile(samples, 50),
        p90Ms: percentile(samples, 90),
        throughputMBps
    };

}

function renderMarkdownReport(snapshot) {

    var lines = [];
    lines.push('# Peer Benchmark Report');
    lines.push('');
    lines.push(`Generated: ${snapshot.generatedAt}`);
    lines.push(`Workload: ${snapshot.workload.name}`);
    lines.push(`Iterations: ${snapshot.iterations}, Warmup: ${snapshot.warmup}`);
    lines.push('');

    lines.push('| Toolkit | File | Avg ms | P50 ms | P90 ms | Throughput MB/s | Read Avg | Read P50 | Read P90 | Parse Avg | Parse P50 | Parse P90 | Full Avg | Full P50 | Full P90 | Stage Order | Status |');
    lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|');

    for (var i = 0; i < snapshot.results.length; i++) {
        var row = snapshot.results[i];
        var readOnlyStageAvgMs = row?.raw?.stage?.readOnly?.avgMs ?? null;
        var readOnlyStageP50Ms = row?.raw?.stage?.readOnly?.p50Ms ?? null;
        var readOnlyStageP90Ms = row?.raw?.stage?.readOnly?.p90Ms ?? null;
        var parseOnlyStageAvgMs = row?.raw?.stage?.parseOnlyNoEmit?.avgMs ?? null;
        var parseOnlyStageP50Ms = row?.raw?.stage?.parseOnlyNoEmit?.p50Ms ?? null;
        var parseOnlyStageP90Ms = row?.raw?.stage?.parseOnlyNoEmit?.p90Ms ?? null;
        var fullStageAvgMs = row?.raw?.stage?.fullParseEmit?.avgMs ?? null;
        var fullStageP50Ms = row?.raw?.stage?.fullParseEmit?.p50Ms ?? null;
        var fullStageP90Ms = row?.raw?.stage?.fullParseEmit?.p90Ms ?? null;
        var stageExecutionOrder = Array.isArray(row?.raw?.stageExecutionOrder) ? row.raw.stageExecutionOrder.join(' > ') : '-';
        lines.push(`| ${row.toolkit} | ${path.basename(row.file)} | ${row.metrics.avgMs == null ? '-' : round(row.metrics.avgMs, 3)} | ${row.metrics.p50Ms == null ? '-' : round(row.metrics.p50Ms, 3)} | ${row.metrics.p90Ms == null ? '-' : round(row.metrics.p90Ms, 3)} | ${row.metrics.throughputMBps == null ? '-' : round(row.metrics.throughputMBps, 3)} | ${readOnlyStageAvgMs == null ? '-' : round(readOnlyStageAvgMs, 3)} | ${readOnlyStageP50Ms == null ? '-' : round(readOnlyStageP50Ms, 3)} | ${readOnlyStageP90Ms == null ? '-' : round(readOnlyStageP90Ms, 3)} | ${parseOnlyStageAvgMs == null ? '-' : round(parseOnlyStageAvgMs, 3)} | ${parseOnlyStageP50Ms == null ? '-' : round(parseOnlyStageP50Ms, 3)} | ${parseOnlyStageP90Ms == null ? '-' : round(parseOnlyStageP90Ms, 3)} | ${fullStageAvgMs == null ? '-' : round(fullStageAvgMs, 3)} | ${fullStageP50Ms == null ? '-' : round(fullStageP50Ms, 3)} | ${fullStageP90Ms == null ? '-' : round(fullStageP90Ms, 3)} | ${stageExecutionOrder} | ${row.status} |`);
    }

    lines.push('');
    lines.push('## Notes');
    lines.push('');
    lines.push('- This benchmark focuses on full DICOM parse + extraction of core tags.');
    lines.push('- Missing toolkits are reported as `unavailable` until bootstrap/install is completed.');
    lines.push('- Compare toolkits primarily within the same host and same workload revision.');

    return `${lines.join('\n')}\n`;

}

function buildSnapshot(workload, args, runRows) {

    return {
        generatedAt: (new Date()).toISOString(),
        workload,
        iterations: args.iterations,
        warmup: args.warmup,
        results: runRows
    };

}

function main() {

    var args = parseArguments(process.argv);
    var repoRoot = resolveRepoRoot();
    var workloadPath = path.resolve(process.cwd(), args.workload);
    var workload = JSON.parse(fs.readFileSync(workloadPath, 'utf-8'));

    var runners = resolveToolkitRunners();
    if (Array.isArray(args.include) && (args.include.length > 0)) {
        runners = runners.filter((runner) => args.include.includes(runner.key.toLowerCase()));
    }

    if (runners.length === 0) {
        throw new Error('No benchmark runners selected.');
    }

    var runRows = [];

    for (var fileIndex = 0; fileIndex < workload.files.length; fileIndex++) {

        var relativeFile = workload.files[fileIndex];
        var absoluteFile = path.resolve(repoRoot, relativeFile);

        if (fs.existsSync(absoluteFile) !== true) {
            for (var missingRunnerIndex = 0; missingRunnerIndex < runners.length; missingRunnerIndex++) {
                runRows.push({
                    toolkit: runners[missingRunnerIndex].key,
                    file: absoluteFile,
                    status: 'missing-fixture',
                    error: 'Fixture file was not found.',
                    metrics: {
                        samples: [],
                        avgMs: null,
                        p50Ms: null,
                        p90Ms: null,
                        throughputMBps: null
                    },
                    extracted: null
                });
            }
            continue;
        }

        for (var runnerIndex = 0; runnerIndex < runners.length; runnerIndex++) {

            var runner = runners[runnerIndex];
            process.stdout.write(`[peer-bench] ${runner.key} :: ${relativeFile}\n`);

            var execution = executeRunner(runner, absoluteFile, args.iterations, args.warmup);
            if (execution.ok !== true) {
                runRows.push({
                    toolkit: runner.key,
                    file: absoluteFile,
                    status: 'unavailable',
                    error: execution.error,
                    metrics: {
                        samples: [],
                        avgMs: null,
                        p50Ms: null,
                        p90Ms: null,
                        throughputMBps: null
                    },
                    extracted: null
                });
                continue;
            }

            var metrics = summarizeResult(execution.output);
            runRows.push({
                toolkit: runner.key,
                file: absoluteFile,
                status: 'ok',
                error: null,
                metrics,
                extracted: execution.output.extracted || null,
                raw: execution.output
            });

        }

    }

    var snapshot = buildSnapshot(workload, args, runRows);
    var outputDirectory = path.resolve(process.cwd(), 'tools/benchmarks/peer/output');
    fs.mkdirSync(outputDirectory, { recursive: true });

    var timestamp = snapshot.generatedAt.replace(/[:.]/g, '-');
    var jsonPath = path.resolve(args.output || path.join(outputDirectory, `peer-benchmark-${timestamp}.json`));
    var markdownPath = jsonPath.replace(/\.json$/i, '.md');

    fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2));
    fs.writeFileSync(markdownPath, renderMarkdownReport(snapshot));

    process.stdout.write(`\nPeer benchmark JSON: ${jsonPath}\n`);
    process.stdout.write(`Peer benchmark report: ${markdownPath}\n`);

}

main();
