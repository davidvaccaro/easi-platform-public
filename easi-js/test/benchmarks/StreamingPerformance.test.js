import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';

const fs = require('fs');
const path = require('path');

const SHOULD_RUN_BENCHMARKS = process.env.RUN_STREAMING_BENCHMARKS === 'true';
const BENCHMARK_ITERATIONS = Math.max(1, Number.parseInt(process.env.BENCH_ITERATIONS || '3', 10));
const STREAM_CHUNK_SIZES = [8 * 1024, 64 * 1024, 256 * 1024];
const BENCHMARK_TIMEOUT_MS = 300000;

function resolveRepoRoot() {

  const marker = `${path.sep}easi-js`;
  const cwd = process.cwd();
  const markerIndex = cwd.lastIndexOf(marker);

  if (markerIndex > -1)
  return cwd.substring(0, markerIndex);

  return cwd;

}

function resolveFixturePath(relativePath) {
  return path.join(resolveRepoRoot(), relativePath);
}

function bytesToMB(bytes) {
  return bytes / (1024 * 1024);
}

function bytesToKB(bytes) {
  return bytes / 1024;
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function createChunkReader(bytes, chunkBytes) {

  var offset = 0;

  return {

    async read() {

      if (offset >= bytes.length) {
        return {
          done: true,
          value: null
        };
      }

      var next = Math.min(offset + chunkBytes, bytes.length);
      var value = bytes.subarray(offset, next);
      offset = next;

      return {
        done: false,
        value: value
      };

    },

    releaseLock() {
    }

  };

}

class InstrumentedDicomDataParser extends DicomDataParser {

  sampleBuffer() {

    if (this.data == null || typeof this.data.length !== 'function')
    return;

    var bufferedBytes = this.data.length();
    if (bufferedBytes > this.metrics.maxParserBufferedBytes)
    this.metrics.maxParserBufferedBytes = bufferedBytes;

  }

  instrumentData() {

    if (this.data == null)
    return;

    if (this.data.__isBenchInstrumented === true)
    return;

    var data = this.data;
    var parser = this;
    var append = data.append.bind(data);
    var consume = data.consume.bind(data);
    var skip = data.skip.bind(data);

    data.append = function (raw) {
      append(raw);
      parser.sampleBuffer();
    };

    data.consume = function (count) {
      var value = consume(count);
      parser.sampleBuffer();
      return value;
    };

    data.skip = function (count) {
      skip(count);
      parser.sampleBuffer();
    };

    data.__isBenchInstrumented = true;

    this.sampleBuffer();

  }

  reset() {

    super.reset();
    this.instrumentData();

  }

  async parse(chunk, isDone = false, totalRead = null, totalLength = null) {

    this.metrics.parseInvocations++;

    if (chunk != null && chunk.length > 0) {
      this.metrics.inputChunkCount++;
      this.metrics.inputBytes += chunk.length;
    }

    if (this.data != null)
    this.instrumentData();

    return super.parse(chunk, isDone, totalRead, totalLength);

  }

  constructor(metrics) {
    super();
    this.metrics = metrics;
  }

}

class InstrumentedDicomInstanceHandler extends DicomInstanceHandler {

  sampleHeap() {

    var heapBytes = process.memoryUsage().heapUsed;
    if (heapBytes > this.metrics.maxHeapBytes)
    this.metrics.maxHeapBytes = heapBytes;

  }

  trackAttribute(attribute) {

    if (attribute == null || typeof attribute.length !== 'function')
    return;

    var materializedBytes = attribute.length();

    if (materializedBytes > this.metrics.maxAttributeMaterializedBytes) {
      this.metrics.maxAttributeMaterializedBytes = materializedBytes;
    }

    if (attribute.tag === Tag.PixelData && materializedBytes > this.metrics.maxPixelDataMaterializedBytes) {
      this.metrics.maxPixelDataMaterializedBytes = materializedBytes;
    }

    this.sampleHeap();

  }

  onStartInstance(context) {
    this.sampleHeap();
    return super.onStartInstance(context);
  }

  onStartAttribute(context, attribute) {
    this.metrics.attributeCount++;
    this.trackAttribute(attribute);
    return super.onStartAttribute(context, attribute);
  }

  onAppendAttribute(context, attribute) {
    this.metrics.appendAttributeEventCount++;
    this.trackAttribute(attribute);
  }

  onEndAttribute(context, attribute) {
    this.metrics.endAttributeEventCount++;
    this.trackAttribute(attribute);
  }

  onProgress(context, progress) {

    this.metrics.progressEventCount++;

    if (progress != null) {
      var bytesRead = progress.bytesRead != null ? progress.bytesRead : 0;
      var bytesProcessed = progress.bytesProcessed != null ? progress.bytesProcessed : 0;
      var readLagBytes = Math.max(0, bytesRead - bytesProcessed);
      if (readLagBytes > this.metrics.maxReadLagBytes)
      this.metrics.maxReadLagBytes = readLagBytes;
    }

    this.sampleHeap();

  }

  onEndInstance(context) {
    this.sampleHeap();
    return super.onEndInstance(context);
  }

  constructor(metrics) {
    super();
    this.metrics = metrics;
  }

}

function createMetrics() {
  return {
    parseInvocations: 0,
    inputChunkCount: 0,
    inputBytes: 0,
    maxParserBufferedBytes: 0,
    attributeCount: 0,
    appendAttributeEventCount: 0,
    endAttributeEventCount: 0,
    progressEventCount: 0,
    maxReadLagBytes: 0,
    maxAttributeMaterializedBytes: 0,
    maxPixelDataMaterializedBytes: 0,
    maxHeapBytes: 0
  };
}

async function runSingleBenchmarkIteration(bytes, scenario) {

  var metrics = createMetrics();
  var parser = new InstrumentedDicomDataParser(metrics);
  var handler = new InstrumentedDicomInstanceHandler(metrics);

  var pipeline = EASI.pipelineBuilder().
  fromPartStream().
  withParser(parser).
  withHandler(handler).
  build();

  var startHeap = process.memoryUsage().heapUsed;
  metrics.maxHeapBytes = startHeap;

  var startNs = process.hrtime.bigint();
  var result = null;

  if (scenario.mode === 'buffer') {
    result = await pipeline.process({ source: bytes });
  } else
  {
    result = await pipeline.process(createChunkReader(bytes, scenario.chunkBytes), null, { sourceOptions: {
        contentType: 'application/dicom',
        contentLength: bytes.length
      } });
  }

  var elapsedMs = Math.max(0.001, Number(process.hrtime.bigint() - startNs) / 1000000);
  var endHeap = process.memoryUsage().heapUsed;
  var pixelData = result.dataSet.find(Tag.PixelData);

  return {
    elapsedMs: elapsedMs,
    throughputMBps: bytesToMB(bytes.length) / (elapsedMs / 1000),
    maxParserBufferedBytes: metrics.maxParserBufferedBytes,
    maxReadLagBytes: metrics.maxReadLagBytes,
    maxAttributeMaterializedBytes: metrics.maxAttributeMaterializedBytes,
    maxPixelDataMaterializedBytes: metrics.maxPixelDataMaterializedBytes,
    maxHeapBytes: metrics.maxHeapBytes,
    startHeapBytes: startHeap,
    endHeapBytes: endHeap,
    parseInvocations: metrics.parseInvocations,
    inputChunkCount: metrics.inputChunkCount,
    progressEventCount: metrics.progressEventCount,
    appendAttributeEventCount: metrics.appendAttributeEventCount,
    endAttributeEventCount: metrics.endAttributeEventCount,
    attributeCount: metrics.attributeCount,
    hasPixelData: pixelData != null
  };

}

function aggregateRuns(runs) {

  var elapsed = runs.map((x) => x.elapsedMs);
  var throughput = runs.map((x) => x.throughputMBps);
  var parserBuffered = runs.map((x) => x.maxParserBufferedBytes);
  var readLag = runs.map((x) => x.maxReadLagBytes);
  var attributeMaterialized = runs.map((x) => x.maxAttributeMaterializedBytes);
  var pixelMaterialized = runs.map((x) => x.maxPixelDataMaterializedBytes);
  var heapPeak = runs.map((x) => x.maxHeapBytes);
  var heapStart = runs.map((x) => x.startHeapBytes);
  var parseInvocations = runs.map((x) => x.parseInvocations);
  var inputChunkCount = runs.map((x) => x.inputChunkCount);
  var progressEvents = runs.map((x) => x.progressEventCount);
  var appendEvents = runs.map((x) => x.appendAttributeEventCount);
  var endEvents = runs.map((x) => x.endAttributeEventCount);

  var sum = (items) => items.reduce((total, value) => total + value, 0);
  var average = (items) => sum(items) / Math.max(1, items.length);
  var max = (items) => Math.max(...items);
  var min = (items) => Math.min(...items);

  return {
    runCount: runs.length,
    elapsedMsAverage: average(elapsed),
    elapsedMsMin: min(elapsed),
    elapsedMsMax: max(elapsed),
    throughputMBpsAverage: average(throughput),
    maxParserBufferedBytesPeak: max(parserBuffered),
    maxReadLagBytesPeak: max(readLag),
    maxAttributeMaterializedBytesPeak: max(attributeMaterialized),
    maxPixelDataMaterializedBytesPeak: max(pixelMaterialized),
    maxHeapBytesPeak: max(heapPeak),
    averageHeapStartBytes: average(heapStart),
    averageParseInvocations: average(parseInvocations),
    averageInputChunkCount: average(inputChunkCount),
    averageProgressEvents: average(progressEvents),
    averageAppendEvents: average(appendEvents),
    averageEndEvents: average(endEvents)
  };

}

function benchmarkScenarios() {

  var scenarios = [
  {
    name: 'single-buffer',
    mode: 'buffer',
    chunkBytes: null
  }];


  for (var i = 0; i < STREAM_CHUNK_SIZES.length; i++) {
    scenarios.push({
      name: `stream-${STREAM_CHUNK_SIZES[i] / 1024}KB`,
      mode: 'stream',
      chunkBytes: STREAM_CHUNK_SIZES[i]
    });
  }

  return scenarios;

}

function buildFixtures() {

  var fixtures = [
  {
    name: '0002.DCM',
    path: resolveFixturePath('data/dicoms/0002.DCM'),
    optional: false
  },
  {
    name: '0009.DCM',
    path: resolveFixturePath('data/dicoms/0009.DCM'),
    optional: false
  },
  {
    name: 'Lateral_View0.dcm',
    path: resolveFixturePath('data/dicoms/local/Lateral_View0.dcm'),
    optional: true
  }];


  return fixtures.filter((fixture) => {
    if (fs.existsSync(fixture.path))
    return true;
    return fixture.optional !== true;
  });

}

function writeBenchmarkSnapshot(results) {

  var outputDirectory = path.join(process.cwd(), 'test/output/benchmarks');
  fs.mkdirSync(outputDirectory, { recursive: true });

  var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  var outputPath = path.join(outputDirectory, `streaming-baseline-${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify({
    createdOn: new Date().toISOString(),
    iterations: BENCHMARK_ITERATIONS,
    results: results
  }, null, 2));

  return outputPath;

}

const benchmarkTest = SHOULD_RUN_BENCHMARKS ? test : test.skip;

benchmarkTest('Benchmark: DICOM pipeline baseline (timing, buffering, materialization)', async () => {

  var fixtures = buildFixtures();
  var scenarios = benchmarkScenarios();
  var results = [];

  for (var fixtureIndex = 0; fixtureIndex < fixtures.length; fixtureIndex++) {

    var fixture = fixtures[fixtureIndex];
    var fixtureBytes = new Uint8Array(fs.readFileSync(fixture.path));

    for (var scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {

      var scenario = scenarios[scenarioIndex];

      // Warmup pass: prime parser/JIT behavior and avoid first-run skew.
      await runSingleBenchmarkIteration(fixtureBytes, scenario);

      var runs = [];
      for (var i = 0; i < BENCHMARK_ITERATIONS; i++) {
        var run = await runSingleBenchmarkIteration(fixtureBytes, scenario);
        expect(run.hasPixelData).toBe(true);
        runs.push(run);
      }

      var aggregate = aggregateRuns(runs);
      results.push({
        fixtureName: fixture.name,
        fixtureSizeBytes: fixtureBytes.length,
        fixtureSizeMB: round(bytesToMB(fixtureBytes.length), 3),
        scenario: scenario.name,
        mode: scenario.mode,
        chunkBytes: scenario.chunkBytes,
        chunkKB: scenario.chunkBytes != null ? round(bytesToKB(scenario.chunkBytes), 1) : null,
        iterations: aggregate.runCount,
        elapsedMsAverage: round(aggregate.elapsedMsAverage, 2),
        elapsedMsMin: round(aggregate.elapsedMsMin, 2),
        elapsedMsMax: round(aggregate.elapsedMsMax, 2),
        throughputMBpsAverage: round(aggregate.throughputMBpsAverage, 2),
        parserBufferPeakKB: round(bytesToKB(aggregate.maxParserBufferedBytesPeak), 2),
        readLagPeakKB: round(bytesToKB(aggregate.maxReadLagBytesPeak), 2),
        attributeMaterializedPeakKB: round(bytesToKB(aggregate.maxAttributeMaterializedBytesPeak), 2),
        pixelDataMaterializedPeakMB: round(bytesToMB(aggregate.maxPixelDataMaterializedBytesPeak), 3),
        heapPeakMB: round(bytesToMB(aggregate.maxHeapBytesPeak), 2),
        heapStartMB: round(bytesToMB(aggregate.averageHeapStartBytes), 2),
        averageParseInvocations: round(aggregate.averageParseInvocations, 2),
        averageInputChunkCount: round(aggregate.averageInputChunkCount, 2),
        averageProgressEvents: round(aggregate.averageProgressEvents, 2),
        averageAppendEvents: round(aggregate.averageAppendEvents, 2),
        averageEndEvents: round(aggregate.averageEndEvents, 2)
      });

    }

  }

  // Surface benchmark output in Jest logs for direct before/after comparison.
  console.log('\nStreaming benchmark baseline:');
  console.table(results.map((result) => ({
    fixture: result.fixtureName,
    scenario: result.scenario,
    avgMs: result.elapsedMsAverage,
    minMs: result.elapsedMsMin,
    maxMs: result.elapsedMsMax,
    avgMBps: result.throughputMBpsAverage,
    parserPeakKB: result.parserBufferPeakKB,
    lagPeakKB: result.readLagPeakKB,
    attrPeakKB: result.attributeMaterializedPeakKB,
    pixelPeakMB: result.pixelDataMaterializedPeakMB,
    heapPeakMB: result.heapPeakMB
  })));

  var outputPath = writeBenchmarkSnapshot(results);
  console.log(`\nStreaming benchmark snapshot written to: ${outputPath}`);

  expect(results.length).toBeGreaterThan(0);

}, BENCHMARK_TIMEOUT_MS);