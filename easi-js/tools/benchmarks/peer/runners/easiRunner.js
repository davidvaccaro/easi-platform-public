import fs from 'fs';
import path from 'path';

import EASI from '../../../../src/EASI.js';
import DicomInstanceHandler from '../../../../src/handlers/terminals/DicomInstanceHandler.js';
import Tag from '../../../../src/dicom/Tag.js';
import ByteStreamReader from '../../../../src/readers/ByteStreamReader.js';
import DicomDataParser from '../../../../src/parsers/DicomDataParser.js';
import { Status } from '../../../../src/parsers/Status.js';

function parseArguments(argv) {

    var args = {
        file: null,
        iterations: 10,
        warmup: 2
    };

    for (var i = 2; i < argv.length; i++) {

        var token = argv[i];

        if (token === '--file') {
            args.file = argv[++i];
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

    }

    if ((args.file == null) || (String(args.file).trim().length === 0)) {
        throw new Error('Missing required --file argument.');
    }

    return args;

}

function readTags(instance) {

    var dataSet = instance?.dataSet;

    return {
        studyInstanceUid: dataSet?.value(Tag.StudyInstanceUID) || null,
        seriesInstanceUid: dataSet?.value(Tag.SeriesInstanceUID) || null,
        sopInstanceUid: dataSet?.value(Tag.SOPInstanceUID) || null,
        modality: dataSet?.value(Tag.Modality) || null,
        numberOfFrames: dataSet?.value(Tag.NumberOfFrames) || null,
        rows: dataSet?.value(Tag.Rows) || null,
        columns: dataSet?.value(Tag.Columns) || null,
        attributeCount: Array.isArray(dataSet?.attributes) ? dataSet.attributes.length : 0
    };

}

function average(values) {
    if ((Array.isArray(values) !== true) || (values.length === 0))
        return null;
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

function shuffle(values) {

    var result = [...values];
    for (var i = result.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }

    return result;

}

function createNoEmitHandler() {
    return {
        onStartInstance: function (_context, partContext) {
            return partContext;
        },
        onEndInstance: function () {
            return null;
        }
    };
}

function createRunContext() {

    var fullHandler = new DicomInstanceHandler();
    var fullPipeline = EASI.pipelineBuilder()
        .fromByteStream()
        .ofDicomData()
        .withHandler(fullHandler)
        .build();

    var readOnlyReader = new ByteStreamReader();
    var parseOnlyParser = new DicomDataParser();
    parseOnlyParser.handler = createNoEmitHandler();

    return {
        fullPipeline,
        readOnlyReader,
        parseOnlyParser
    };

}

async function runReadOnly(bytes, context) {

    var reader = context.readOnlyReader.toSingleChunkReader(bytes);
    var totalRead = 0;
    var startedAt = process.hrtime.bigint();

    while (true) {
        var next = await reader.read();
        if (next?.done === true) {
            break;
        }
        totalRead += ((next?.value != null) ? next.value.length : 0);
    }

    if (typeof reader.releaseLock === 'function') {
        reader.releaseLock();
    }

    return {
        elapsedMs: Number(process.hrtime.bigint() - startedAt) / 1000000,
        bytesRead: totalRead
    };

}

async function runParseOnlyNoEmit(bytes, context) {

    var parser = context.parseOnlyParser;
    parser.resetSession();
    parser.reset();

    var startedAt = process.hrtime.bigint();
    var status = await parser.parse(bytes, true, bytes.length, bytes.length, {
        raw: 'application/dicom',
        source: 'application/dicom',
        parameters: {},
        isMultipart: false
    });
    var elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1000000;

    if ((status !== Status.SUCCESS) && (status !== Status.STOP) && (status !== Status.JUMP)) {
        if (parser.error != null) {
            throw parser.error;
        }
        throw new Error(`Parse-only benchmark failed with status '${status}'.`);
    }

    return {
        elapsedMs
    };

}

async function runFullParseEmit(bytes, context) {

    var pipeline = context.fullPipeline;

    var startedAt = process.hrtime.bigint();
    var result = await pipeline.process(bytes, {
        contentType: 'application/dicom',
        contentLength: bytes.length
    });
    var elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1000000;

    return {
        elapsedMs,
        tags: readTags(result)
    };

}

async function runStage(runFunction, bytes, context, warmupIterations, iterations) {

    var warmupSamples = [];
    var samples = [];
    var lastResult = null;

    for (var warmupIndex = 0; warmupIndex < warmupIterations; warmupIndex++) {
        var warmupRun = await runFunction(bytes, context);
        warmupSamples.push(warmupRun.elapsedMs);
        lastResult = warmupRun;
    }

    for (var i = 0; i < iterations; i++) {
        var measuredRun = await runFunction(bytes, context);
        samples.push(measuredRun.elapsedMs);
        lastResult = measuredRun;
    }

    return {
        warmupSamplesMs: warmupSamples,
        samplesMs: samples,
        avgMs: average(samples),
        p50Ms: percentile(samples, 50),
        p90Ms: percentile(samples, 90),
        lastResult: lastResult
    };

}

async function main() {

    var args = parseArguments(process.argv);
    var filePath = path.resolve(args.file);

    if (fs.existsSync(filePath) !== true) {
        throw new Error(`Input file was not found: ${filePath}`);
    }

    var bytes = new Uint8Array(fs.readFileSync(filePath));
    var runContext = createRunContext();
    var stageDefinitions = {
        readOnly: runReadOnly,
        parseOnlyNoEmit: runParseOnlyNoEmit,
        fullParseEmit: runFullParseEmit
    };

    var stageOrder = shuffle(Object.keys(stageDefinitions));
    var stageResults = {};

    for (var stageIndex = 0; stageIndex < stageOrder.length; stageIndex++) {
        var stageName = stageOrder[stageIndex];
        stageResults[stageName] = await runStage(
            stageDefinitions[stageName],
            bytes,
            runContext,
            args.warmup,
            args.iterations
        );
    }

    var fullStage = stageResults.fullParseEmit;
    var readStage = stageResults.readOnly;
    var parseOnlyStage = stageResults.parseOnlyNoEmit;
    var lastTags = fullStage?.lastResult?.tags || null;
    var lastReadBytes = readStage?.lastResult?.bytesRead || 0;

    process.stdout.write(JSON.stringify({
        toolkit: 'easi-js',
        operation: 'dicom-parse-and-core-tag-extract',
        file: filePath,
        fileSizeBytes: bytes.length,
        warmupIterations: args.warmup,
        iterations: args.iterations,
        stageExecutionOrder: stageOrder,
        stage: {
            readOnly: {
                warmupSamplesMs: readStage?.warmupSamplesMs || [],
                samplesMs: readStage?.samplesMs || [],
                avgMs: readStage?.avgMs || null,
                p50Ms: readStage?.p50Ms || null,
                p90Ms: readStage?.p90Ms || null,
                bytesRead: lastReadBytes
            },
            parseOnlyNoEmit: {
                warmupSamplesMs: parseOnlyStage?.warmupSamplesMs || [],
                samplesMs: parseOnlyStage?.samplesMs || [],
                avgMs: parseOnlyStage?.avgMs || null,
                p50Ms: parseOnlyStage?.p50Ms || null,
                p90Ms: parseOnlyStage?.p90Ms || null
            },
            fullParseEmit: {
                warmupSamplesMs: fullStage?.warmupSamplesMs || [],
                samplesMs: fullStage?.samplesMs || [],
                avgMs: fullStage?.avgMs || null,
                p50Ms: fullStage?.p50Ms || null,
                p90Ms: fullStage?.p90Ms || null
            }
        },
        warmupSamplesMs: fullStage?.warmupSamplesMs || [],
        samplesMs: fullStage?.samplesMs || [],
        extracted: lastTags
    }));

}

main().catch((error) => {
    process.stderr.write(String(error?.stack || error));
    process.exit(1);
});
