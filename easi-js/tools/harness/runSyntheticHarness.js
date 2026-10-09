// Run the existing functional harness against freshly generated independent data.
// Inputs belong to this run and are removed in finally; its reports stay available.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import EASI from '../../src/EASI.js';
import Tag from '../../src/dicom/Tag.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';
import Constants from '../../src/dicom/Constants.js';
import { createDicomFixture } from '../../test/fixtures/dicom/SyntheticDicom.js';

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const profiles = ['explicit-le', 'implicit-le', 'explicit-be', 'rgb', 'multiframe', 'rle', 'jpeg-baseline', 'jpeg-lossless'];
const scenarios = ['parse', 'convert', 'deidentify', 'transcode', 'fhir', 'assets'];

function parseArguments(args) {
    const options = { output: path.join(packageRoot, 'test/output/harness'), help: false };
    for (let index = 0; index < args.length; index++) {
        if (args[index] === '--help' || args[index] === '-h') options.help = true;
        else if (args[index] === '--output') {
            const value = args[++index];
            if (!value || value.startsWith('--')) throw new Error('--output requires a directory path.');
            options.output = path.resolve(value);
        }
        else throw new Error(`Unknown option: ${args[index]}. Use --help for supported options.`);
    }
    return options;
}

async function runHarness(inputRoot, outputRoot) {
    const harnessPath = path.join(packageRoot, 'tools/harness/runTestLibraryHarness.js');
    const child = spawn(process.execPath, [harnessPath,
        '--root', inputRoot,
        '--output', outputRoot,
        '--scenarios', scenarios.join(','),
        '--isolate-file-worker', 'false'
    ], { cwd: packageRoot, stdio: 'inherit' });
    const exitCode = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
    });
    assert.equal(exitCode, 0, 'The functional harness did not exit successfully.');
    const runs = (await fs.readdir(outputRoot)).filter(name => name.startsWith('run-'));
    assert.equal(runs.length, 1, 'Expected one report in the newly owned output directory.');
    const runDirectory = path.join(outputRoot, runs[0]);
    const report = JSON.parse(await fs.readFile(path.join(runDirectory, 'report.json'), 'utf8'));
    assert.equal(report.summary.filesProcessed, profiles.length, 'The harness did not process every synthetic input.');
    assert.equal(report.summary.filesWithFailures, 0, 'The functional report contains failed scenarios.');
    assert.equal(report.summary.errorCountTotal, 0, 'The functional report contains error concerns.');
    assert.deepEqual(report.files.map(file => file.relativePath).sort(), profiles.map(profile => `${profile}.dcm`).sort());
    for (const file of report.files) {
        for (const scenario of scenarios) {
            assert.equal(file.scenarios[scenario]?.status, 'pass', `${file.relativePath}: ${scenario} must pass without skipping.`);
        }
        assert.equal(file.scenarios.parse.metrics.instanceCount, 1);
        assert.equal(file.scenarios.parse.metrics.hasPixelData, true);
        assert.equal(file.scenarios.fhir.metrics.seriesCount, 1);
        assert.equal(file.scenarios.transcode.warningCount, 0, `${file.relativePath}: transcoding must use the declared source syntax.`);
        const assets = file.scenarios.assets;
        assert.equal(assets.metrics.metadataCount, 1);
        assert.equal(assets.metrics.frameCount, 1);
        assert.equal(assets.metrics.decodeFallbackToNative, false, `${file.relativePath}: a real decoder must produce the thumbnail.`);
        assert.ok(assets.thumbnailPath, `${file.relativePath}: missing decoded thumbnail.`);
        const thumbnail = await fs.readFile(path.join(runDirectory, assets.thumbnailPath));
        assert.ok(thumbnail.length > 4 && thumbnail[0] === 0xFF && thumbnail[1] === 0xD8 && thumbnail.at(-2) === 0xFF && thumbnail.at(-1) === 0xD9,
            `${file.relativePath}: thumbnail must contain an encoded JPEG image.`);
    }
    return runDirectory;
}

function expectedLittleEndianPixels(expected) {
    if (expected.bitsAllocated === 8) return new Uint8Array(expected.pixels);
    const bytes = new Uint8Array(expected.pixels.length * 2);
    const view = new DataView(bytes.buffer);
    expected.pixels.forEach((pixel, index) => view.setUint16(index * 2, pixel & 0xFFFF, true));
    return bytes;
}

async function verifyTranscodedPixels(inputRoot, fixtures) {
    for (const [profile, fixture] of fixtures) {
        const concerns = [];
        const bytes = await EASI.pipelineBuilder().fromFileStream().ofDicomData({ includePart10Header: true }).
            withTranscoding({ targetTransferSyntax: TransferSyntax.ExplicitVRLittleEndian.ID, onConcern: concern => concerns.push(concern) }).
            toDicomData().build().process({ source: path.join(inputRoot, `${profile}.dcm`) });
        assert.deepEqual(concerns, [], `${profile}: exact pixel verification encountered a transcoding concern.`);
        const instance = await EASI.pipelineBuilder().fromByteStream().ofDicomData({ includePart10Header: true }).
            toInstances().build().process({ source: bytes });
        assert.equal(instance.metaSet.transferSyntaxUID.ID, TransferSyntax.ExplicitVRLittleEndian.ID);
        const pixelData = instance.dataSet.find(Tag.PixelData);
        assert.notEqual(pixelData.valueLength, Constants.UndefinedLength, `${profile}: native output cannot retain encapsulated PixelData.`);
        if (['rle', 'jpeg-baseline', 'jpeg-lossless'].includes(profile)) {
            const assets = await EASI.pipelineBuilder().fromByteStream().ofDicomData().
                toAssets({ payload: { frame: { frames: 'first', decode: 'rgba', encode: 'none' }, collect: true } }).
                build().process({ source: bytes });
            assert.deepEqual(assets.frames[0].bytes, fixture.expected.firstFrameRgba, `${profile}: decoded native output differs from independent expected pixels.`);
        }
        else {
            assert.deepEqual(new Uint8Array(pixelData.access()), expectedLittleEndianPixels(fixture.expected), `${profile}: native samples were changed during transcoding.`);
        }
    }
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
        console.log('Run eight independent synthetic profiles through all six functional harness scenarios.');
        console.log('Usage: node tools/harness/runSyntheticHarness.js [--output <report-directory>]');
        return;
    }
    const inputRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'easi-synthetic-harness-'));
    try {
        const fixtures = profiles.map(profile => [profile, createDicomFixture(profile)]);
        await Promise.all(fixtures.map(([profile, fixture]) => fs.writeFile(path.join(inputRoot, `${profile}.dcm`), fixture.bytes)));
        await fs.mkdir(options.output, { recursive: true });
        const outputRoot = await fs.mkdtemp(path.join(options.output, 'synthetic-'));
        const runDirectory = await runHarness(inputRoot, outputRoot);
        await verifyTranscodedPixels(inputRoot, fixtures);
        console.log(`[SyntheticHarness] Passed ${profiles.length * scenarios.length} scenarios and ${profiles.length} exact pixel checks.`);
        console.log(`[SyntheticHarness] Report: ${path.join(runDirectory, 'report.html')}`);
    }
    finally {
        await fs.rm(inputRoot, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(`[SyntheticHarness] Failed: ${error.message}`);
    process.exitCode = 1;
});
