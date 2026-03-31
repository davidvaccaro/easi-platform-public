import fs from 'fs';
import path from 'path';

import EASI from '../../../../src/EASI.js';
import DicomInstanceHandler from '../../../../src/handlers/terminals/DicomInstanceHandler.js';
import Tag from '../../../../src/dicom/Tag.js';

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

async function runOne(bytes) {

    var handler = new DicomInstanceHandler();
    var pipeline = EASI.pipelineBuilder()
        .fromByteStream()
        .ofDicomData()
        .withHandler(handler)
        .build();

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

async function main() {

    var args = parseArguments(process.argv);
    var filePath = path.resolve(args.file);

    if (fs.existsSync(filePath) !== true) {
        throw new Error(`Input file was not found: ${filePath}`);
    }

    var bytes = new Uint8Array(fs.readFileSync(filePath));
    var warmupRuns = [];
    var measuredRuns = [];
    var lastTags = null;

    for (var i = 0; i < args.warmup; i++) {
        var warmup = await runOne(bytes);
        warmupRuns.push(warmup.elapsedMs);
        lastTags = warmup.tags;
    }

    for (var iteration = 0; iteration < args.iterations; iteration++) {
        var measured = await runOne(bytes);
        measuredRuns.push(measured.elapsedMs);
        lastTags = measured.tags;
    }

    process.stdout.write(JSON.stringify({
        toolkit: 'easi-js',
        operation: 'dicom-parse-and-core-tag-extract',
        file: filePath,
        fileSizeBytes: bytes.length,
        warmupIterations: args.warmup,
        iterations: args.iterations,
        warmupSamplesMs: warmupRuns,
        samplesMs: measuredRuns,
        extracted: lastTags
    }));

}

main().catch((error) => {
    process.stderr.write(String(error?.stack || error));
    process.exit(1);
});
