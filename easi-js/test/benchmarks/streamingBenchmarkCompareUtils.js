export const STREAMING_BENCHMARK_METRICS = [
    { key: 'elapsedMsAverage', label: 'Elapsed (ms)', target: 'lower' },
    { key: 'throughputMBpsAverage', label: 'Throughput (MB/s)', target: 'higher' },
    { key: 'parserBufferPeakKB', label: 'Parser Buffer Peak (KB)', target: 'lower' },
    { key: 'readLagPeakKB', label: 'Read Lag Peak (KB)', target: 'lower' },
    { key: 'attributeMaterializedPeakKB', label: 'Attribute Materialized Peak (KB)', target: 'lower' },
    { key: 'pixelDataMaterializedPeakMB', label: 'PixelData Materialized Peak (MB)', target: 'lower' },
    { key: 'heapPeakMB', label: 'Heap Peak (MB)', target: 'lower' }
];

function toFiniteNumber(value) {

    if (value == null)
        return null;

    var number = Number(value);
    if (Number.isFinite(number) == false)
        return null;

    return number;

}

export function buildBenchmarkResultKey(result) {
    return `${result.fixtureName}::${result.scenario}`;
}

export function indexBenchmarkResults(results) {

    var index = new Map();

    if (Array.isArray(results) == false)
        return index;

    for (var i = 0; i < results.length; i++) {
        var result = results[i];
        if (result == null)
            continue;
        index.set(buildBenchmarkResultKey(result), result);
    }

    return index;

}

export function compareMetric(beforeValue, afterValue, target = 'lower', epsilonPercent = 0.1) {

    var before = toFiniteNumber(beforeValue);
    var after = toFiniteNumber(afterValue);

    if ((before == null) || (after == null)) {
        return {
            before: before,
            after: after,
            delta: null,
            deltaPercent: null,
            improvementPercent: null,
            trend: 'unknown'
        };
    }

    var delta = (after - before);
    var deltaPercent = (before === 0) ? null : ((delta / before) * 100);
    var improvementPercent = null;

    if (before !== 0) {
        if (target === 'lower')
            improvementPercent = ((before - after) / before) * 100;
        else
            improvementPercent = ((after - before) / before) * 100;
    }

    var trend = 'same';

    if (improvementPercent == null) {
        if (delta > 0) {
            trend = (target === 'higher') ? 'better' : 'worse';
        }
        else if (delta < 0) {
            trend = (target === 'higher') ? 'worse' : 'better';
        }
    }
    else if (Math.abs(improvementPercent) > epsilonPercent) {
        trend = (improvementPercent > 0) ? 'better' : 'worse';
    }

    return {
        before: before,
        after: after,
        delta: delta,
        deltaPercent: deltaPercent,
        improvementPercent: improvementPercent,
        trend: trend
    };

}

export function compareStreamingBenchmarkSnapshots(beforeSnapshot, afterSnapshot, metrics = STREAMING_BENCHMARK_METRICS) {

    var beforeResults = Array.isArray(beforeSnapshot?.results) ? beforeSnapshot.results : [];
    var afterResults = Array.isArray(afterSnapshot?.results) ? afterSnapshot.results : [];

    var beforeByKey = indexBenchmarkResults(beforeResults);
    var afterByKey = indexBenchmarkResults(afterResults);

    var beforeKeys = Array.from(beforeByKey.keys());
    var afterKeys = Array.from(afterByKey.keys());

    var keySet = new Set([...beforeKeys, ...afterKeys]);
    var allKeys = Array.from(keySet).sort();

    var matchedKeys = [];
    var beforeOnlyKeys = [];
    var afterOnlyKeys = [];

    for (var i = 0; i < allKeys.length; i++) {
        var key = allKeys[i];
        var hasBefore = beforeByKey.has(key);
        var hasAfter = afterByKey.has(key);

        if (hasBefore && hasAfter)
            matchedKeys.push(key);
        else if (hasBefore)
            beforeOnlyKeys.push(key);
        else
            afterOnlyKeys.push(key);
    }

    var entries = [];

    for (var entryIndex = 0; entryIndex < matchedKeys.length; entryIndex++) {

        var matchedKey = matchedKeys[entryIndex];
        var beforeResult = beforeByKey.get(matchedKey);
        var afterResult = afterByKey.get(matchedKey);

        var entryMetrics = [];
        for (var metricIndex = 0; metricIndex < metrics.length; metricIndex++) {
            var metric = metrics[metricIndex];
            var metricComparison = compareMetric(beforeResult[metric.key], afterResult[metric.key], metric.target);
            entryMetrics.push({
                key: metric.key,
                label: metric.label,
                target: metric.target,
                ...metricComparison
            });
        }

        entries.push({
            key: matchedKey,
            fixtureName: beforeResult.fixtureName,
            scenario: beforeResult.scenario,
            before: beforeResult,
            after: afterResult,
            metrics: entryMetrics
        });

    }

    var metricSummary = [];

    for (var summaryMetricIndex = 0; summaryMetricIndex < metrics.length; summaryMetricIndex++) {

        var summaryMetric = metrics[summaryMetricIndex];
        var beforeValues = [];
        var afterValues = [];
        var betterCount = 0;
        var worseCount = 0;
        var sameCount = 0;
        var unknownCount = 0;
        var improvementPercentValues = [];

        for (var matchedIndex = 0; matchedIndex < entries.length; matchedIndex++) {

            var matchedEntry = entries[matchedIndex];
            var metricValue = matchedEntry.metrics.find((value) => (value.key === summaryMetric.key));
            if (metricValue == null)
                continue;

            if ((metricValue.before != null) && (metricValue.after != null)) {
                beforeValues.push(metricValue.before);
                afterValues.push(metricValue.after);
            }

            if (metricValue.improvementPercent != null)
                improvementPercentValues.push(metricValue.improvementPercent);

            if (metricValue.trend === 'better')
                betterCount++;
            else if (metricValue.trend === 'worse')
                worseCount++;
            else if (metricValue.trend === 'same')
                sameCount++;
            else
                unknownCount++;

        }

        var sum = (values) => values.reduce((total, value) => (total + value), 0);
        var average = (values) => (values.length > 0 ? (sum(values) / values.length) : null);
        var beforeAverage = average(beforeValues);
        var afterAverage = average(afterValues);
        var deltaAverage = ((beforeAverage == null) || (afterAverage == null)) ? null : (afterAverage - beforeAverage);
        var deltaPercentAverage = (beforeAverage === 0 || beforeAverage == null || afterAverage == null)
            ? null
            : (((afterAverage - beforeAverage) / beforeAverage) * 100);
        var improvementAverage = average(improvementPercentValues);

        metricSummary.push({
            key: summaryMetric.key,
            label: summaryMetric.label,
            target: summaryMetric.target,
            beforeAverage: beforeAverage,
            afterAverage: afterAverage,
            deltaAverage: deltaAverage,
            deltaPercentAverage: deltaPercentAverage,
            improvementPercentAverage: improvementAverage,
            betterCount: betterCount,
            worseCount: worseCount,
            sameCount: sameCount,
            unknownCount: unknownCount
        });

    }

    return {
        beforeResultCount: beforeResults.length,
        afterResultCount: afterResults.length,
        matchedCount: entries.length,
        beforeOnlyKeys: beforeOnlyKeys,
        afterOnlyKeys: afterOnlyKeys,
        entries: entries,
        metricSummary: metricSummary
    };

}
