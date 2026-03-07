import { compareStreamingBenchmarkSnapshots } from './streamingBenchmarkCompareUtils.js';

function createSnapshot(results) {
    return {
        createdOn: '2026-03-06T00:00:00.000Z',
        iterations: 3,
        results: results
    };
}

test('Test: compareStreamingBenchmarkSnapshots summarizes lower/higher-better trends', () => {

    var before = createSnapshot([
        {
            fixtureName: '0002.DCM',
            scenario: 'single-buffer',
            elapsedMsAverage: 10,
            throughputMBpsAverage: 100,
            parserBufferPeakKB: 64,
            readLagPeakKB: 8,
            attributeMaterializedPeakKB: 1024,
            pixelDataMaterializedPeakMB: 1.5,
            heapPeakMB: 80
        },
        {
            fixtureName: '0002.DCM',
            scenario: 'stream-64KB',
            elapsedMsAverage: 12,
            throughputMBpsAverage: 85,
            parserBufferPeakKB: 64,
            readLagPeakKB: 12,
            attributeMaterializedPeakKB: 1024,
            pixelDataMaterializedPeakMB: 1.5,
            heapPeakMB: 82
        }
    ]);

    var after = createSnapshot([
        {
            fixtureName: '0002.DCM',
            scenario: 'single-buffer',
            elapsedMsAverage: 8,
            throughputMBpsAverage: 125,
            parserBufferPeakKB: 32,
            readLagPeakKB: 8,
            attributeMaterializedPeakKB: 1024,
            pixelDataMaterializedPeakMB: 1.5,
            heapPeakMB: 78
        },
        {
            fixtureName: '0002.DCM',
            scenario: 'stream-64KB',
            elapsedMsAverage: 15,
            throughputMBpsAverage: 70,
            parserBufferPeakKB: 80,
            readLagPeakKB: 16,
            attributeMaterializedPeakKB: 1024,
            pixelDataMaterializedPeakMB: 1.5,
            heapPeakMB: 86
        }
    ]);

    var comparison = compareStreamingBenchmarkSnapshots(before, after);

    expect(comparison.matchedCount).toBe(2);
    expect(comparison.beforeOnlyKeys.length).toBe(0);
    expect(comparison.afterOnlyKeys.length).toBe(0);

    var elapsedSummary = comparison.metricSummary.find((summary) => summary.key === 'elapsedMsAverage');
    expect(elapsedSummary.betterCount).toBe(1);
    expect(elapsedSummary.worseCount).toBe(1);

    var throughputSummary = comparison.metricSummary.find((summary) => summary.key === 'throughputMBpsAverage');
    expect(throughputSummary.betterCount).toBe(1);
    expect(throughputSummary.worseCount).toBe(1);

});

test('Test: compareStreamingBenchmarkSnapshots reports unmatched scenarios', () => {

    var before = createSnapshot([
        {
            fixtureName: '0002.DCM',
            scenario: 'single-buffer',
            elapsedMsAverage: 10,
            throughputMBpsAverage: 100,
            parserBufferPeakKB: 64,
            readLagPeakKB: 8,
            attributeMaterializedPeakKB: 1024,
            pixelDataMaterializedPeakMB: 1.5,
            heapPeakMB: 80
        }
    ]);

    var after = createSnapshot([
        {
            fixtureName: '0009.DCM',
            scenario: 'single-buffer',
            elapsedMsAverage: 20,
            throughputMBpsAverage: 50,
            parserBufferPeakKB: 128,
            readLagPeakKB: 16,
            attributeMaterializedPeakKB: 2048,
            pixelDataMaterializedPeakMB: 2.5,
            heapPeakMB: 90
        }
    ]);

    var comparison = compareStreamingBenchmarkSnapshots(before, after);

    expect(comparison.matchedCount).toBe(0);
    expect(comparison.beforeOnlyKeys.length).toBe(1);
    expect(comparison.afterOnlyKeys.length).toBe(1);

});
