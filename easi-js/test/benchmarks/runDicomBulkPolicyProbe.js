import fs from 'fs';
import path from 'path';

import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';

import DicomPipelineProbeHandler from './probes/DicomPipelineProbeHandler.js';
import { createChunkReader } from './probes/DicomPipelineProbeHandler.js';

function parseArgs(argv) {

  var args = {
    fixture: 'data/dicoms/local/Lateral_View0.dcm',
    iterations: 8,
    chunkKB: 64
  };

  for (var i = 0; i < argv.length; i++) {

    var token = argv[i];

    if (token == '--fixture') {
      args.fixture = argv[++i];
      continue;
    }

    if (token == '--iterations') {
      args.iterations = Math.max(1, Number.parseInt(argv[++i], 10));
      continue;
    }

    if (token == '--chunkKB') {
      args.chunkKB = Math.max(1, Number.parseInt(argv[++i], 10));
      continue;
    }

  }

  return args;

}

function resolveRepoRoot() {

  var marker = `${path.sep}easi-js`;
  var cwd = process.cwd();
  var markerIndex = cwd.lastIndexOf(marker);

  if (markerIndex > -1)
  return cwd.substring(0, markerIndex);

  return cwd;

}

function toMB(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

async function runPolicyMode(mode, bytes, iterations, chunkBytes) {

  var rows = [];

  for (var i = 0; i < iterations; i++) {

    if (typeof global.gc === 'function')
    global.gc();

    var parser = new DicomDataParser();
    parser.bulkDataPolicy = {
      mode: mode,
      knownLengthThreshold: 1024 * 1024,
      hardSafetyCap: 16 * 1024 * 1024
    };

    var handler = new DicomPipelineProbeHandler();
    var pipeline = EASI.pipelineBuilder().
    fromPartStream().
    withParser(parser).
    withHandler(handler).
    build();

    var startNs = process.hrtime.bigint();
    var instance = await pipeline.process(
    createChunkReader(bytes, chunkBytes), null, { sourceOptions:
      {
        contentType: 'application/dicom',
        contentLength: bytes.length
      } });

    var elapsedMs = Number(process.hrtime.bigint() - startNs) / 1000000;

    var pixelData = instance?.dataSet?.find(Tag.PixelData);

    rows.push({
      elapsedMs: elapsedMs,
      pixelIsBulkStreamed: pixelData?.isBulkStreamed == true,
      pixelMaterializedBytes: pixelData?.length?.() || 0,
      ...handler.snapshot
    });

  }

  var average = (key) => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;

  return {
    mode: mode,
    iterations: iterations,
    avgElapsedMs: Number(average('elapsedMs').toFixed(2)),
    streamedRuns: rows.filter((row) => row.pixelIsBulkStreamed == true).length,
    avgPixelMaterializedMB: toMB(average('pixelMaterializedBytes')),
    avgPeakAttrMB: toMB(average('peakAttributeMaterializedBytes')),
    avgPeakPixelAttrMB: toMB(average('peakPixelDataMaterializedBytes')),
    avgPeakHeapUsedMB: toMB(average('peakHeapUsedBytes')),
    avgPeakArrayBuffersMB: toMB(average('peakArrayBuffersBytes')),
    avgPeakExternalMB: toMB(average('peakExternalBytes')),
    avgPeakRssMB: toMB(average('peakRssBytes')),
    rows: rows
  };

}

function renderDelta(materialize, stream) {

  var deltaPercent = (before, after) => {
    if (before === 0)
    return null;
    return Number(((after - before) / before * 100).toFixed(2));
  };

  return {
    elapsedPct: deltaPercent(materialize.avgElapsedMs, stream.avgElapsedMs),
    pixelMaterializedPct: deltaPercent(materialize.avgPixelMaterializedMB, stream.avgPixelMaterializedMB),
    peakAttrPct: deltaPercent(materialize.avgPeakAttrMB, stream.avgPeakAttrMB),
    peakArrayBuffersPct: deltaPercent(materialize.avgPeakArrayBuffersMB, stream.avgPeakArrayBuffersMB),
    peakExternalPct: deltaPercent(materialize.avgPeakExternalMB, stream.avgPeakExternalMB),
    peakRssPct: deltaPercent(materialize.avgPeakRssMB, stream.avgPeakRssMB)
  };

}

async function main() {

  var args = parseArgs(process.argv.slice(2));
  var repoRoot = resolveRepoRoot();
  var fixturePath = path.resolve(repoRoot, args.fixture);

  if (fs.existsSync(fixturePath) != true) {
    throw new Error(`Fixture file does not exist: ${fixturePath}`);
  }

  var bytes = new Uint8Array(fs.readFileSync(fixturePath));
  var chunkBytes = args.chunkKB * 1024;

  console.log('Running DICOM bulk policy probe...');
  console.log(`Fixture: ${fixturePath}`);
  console.log(`Size: ${toMB(bytes.length)} MB`);
  console.log(`Iterations: ${args.iterations}`);
  console.log(`Chunk Size: ${args.chunkKB} KB`);

  var materialize = await runPolicyMode('materialize', bytes, args.iterations, chunkBytes);
  var stream = await runPolicyMode('stream', bytes, args.iterations, chunkBytes);

  console.log('\nA/B summary:');
  console.table([materialize, stream].map((summary) => ({
    mode: summary.mode,
    iterations: summary.iterations,
    avgElapsedMs: summary.avgElapsedMs,
    streamedRuns: summary.streamedRuns,
    avgPixelMaterializedMB: summary.avgPixelMaterializedMB,
    avgPeakAttrMB: summary.avgPeakAttrMB,
    avgPeakPixelAttrMB: summary.avgPeakPixelAttrMB,
    avgPeakHeapUsedMB: summary.avgPeakHeapUsedMB,
    avgPeakArrayBuffersMB: summary.avgPeakArrayBuffersMB,
    avgPeakExternalMB: summary.avgPeakExternalMB,
    avgPeakRssMB: summary.avgPeakRssMB
  })));

  console.log('\nDelta stream vs materialize (%):');
  console.table([renderDelta(materialize, stream)]);

}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});