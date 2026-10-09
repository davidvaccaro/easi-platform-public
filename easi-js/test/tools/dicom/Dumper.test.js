import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import DicomInstanceHandler from '../../../src/handlers/terminals/DicomInstanceHandler.js';
import Dumper from '../../../src/tools/dicom/Dumper.js';
import DumpParser from '../../../src/tools/dicom/DumpParser.js';
import Tag from '../../../src/dicom/Tag.js';
import { getFixtureBytes } from '../../fixtures/dicom/SyntheticDicom.js';

jest.mock('child_process', () => ({ execFile: jest.fn() }));
jest.mock('fs', () => ({ ...jest.requireActual('fs'), accessSync: jest.fn() }));

const { execFile } = require('child_process');
const { accessSync } = require('fs');
const syntheticDump = [
    '(0x0002,0x0010) UI Transfer Syntax UID VR=<UI> VL=<0x0014> <1.2.840.10008.1.2.1>',
    '(0x0008,0x0018) UI SOP Instance UID VR=<UI> VL=<0x0008> <2.25.803>',
    '(0x0010,0x0010) PN Patient Name VR=<PN> VL=<0x000e> <SYNTHETIC^DUMP>'
].join('\n');

let fixtureDirectory;
let inputPath;
let originalToolOverride;

beforeAll(async () => {
    fixtureDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'easi-dump-synthetic-'));
    inputPath = path.join(fixtureDirectory, 'synthetic image ; literal.dcm');
    await fs.writeFile(inputPath, getFixtureBytes());
});

beforeEach(() => {
    originalToolOverride = process.env.EASI_DCDUMP_PATH;
    delete process.env.EASI_DCDUMP_PATH;
    execFile.mockReset();
    accessSync.mockReset().mockImplementation(() => { throw new Error('No local executable'); });
    execFile.mockImplementation((_executable, _args, callback) => callback(null, '', syntheticDump));
});

afterEach(() => {
    if (originalToolOverride === undefined)
        delete process.env.EASI_DCDUMP_PATH;
    else
        process.env.EASI_DCDUMP_PATH = originalToolOverride;
});

afterAll(async () => {
    if (fixtureDirectory != null)
        await fs.rm(fixtureDirectory, { recursive: true, force: true });
});

test('Test: Dumper awaits synthetic dump parsing and keeps filenames as one executable argument', async () => {
    // EASI_DCDUMP_PATH takes precedence over a preserved local tool and PATH lookup.
    process.env.EASI_DCDUMP_PATH = '/synthetic tool/dcdump';
    const dumper = new Dumper(new DumpParser(new DicomInstanceHandler()));

    const result = await dumper.dump(inputPath);

    expect(execFile).toHaveBeenCalledWith('/synthetic tool/dcdump', [inputPath], expect.any(Function));
    expect(accessSync).not.toHaveBeenCalled();
    expect(result.metaSet.attributes).toHaveLength(1);
    expect(result.dataSet.attributes).toHaveLength(2);
    expect(result.dataSet.value(Tag.SOPInstanceUID)).toBe('2.25.803');
    expect(result.dataSet.value(Tag.PatientName)).toBe('SYNTHETIC^DUMP');
});

test('Test: Dumper falls back to an executable on PATH and accepts stdout dump output', async () => {
    execFile.mockImplementation((_executable, _args, callback) => callback(null, syntheticDump, ''));
    const result = await new Dumper(new DumpParser(new DicomInstanceHandler())).dump(inputPath);
    expect(execFile).toHaveBeenCalledWith('dcdump', [inputPath], expect.any(Function));
    expect(result.dataSet.value(Tag.SOPInstanceUID)).toBe('2.25.803');
});

test('Test: Dumper preserves a readable executable in the local private tools directory', async () => {
    accessSync.mockImplementation(() => {});
    await new Dumper(new DumpParser(new DicomInstanceHandler())).dump(inputPath);
    expect(execFile.mock.calls[0][0]).toMatch(/[\/]ext[\/]tools[\/]dcdump$/);
});

test('Test: Dumper rejects executable failures', async () => {
    const error = new Error('Synthetic executable failure');
    execFile.mockImplementation((_executable, _args, callback) => callback(error, '', ''));
    await expect(new Dumper(new DumpParser(new DicomInstanceHandler())).dump(inputPath)).rejects.toBe(error);
});

test.each([
    ['unsuccessful parse', { parse: jest.fn(() => false), result: {} }],
    ['missing result', { parse: jest.fn(() => true), result: null }]
])('Test: Dumper rejects %s', async (_name, parser) => {
    await expect(new Dumper(parser).dump(inputPath)).rejects.toThrow('Unable to parse DICOM dump output.');
});

test('Test: Dumper rejects thrown parser errors', async () => {
    const error = new Error('Synthetic parser failure');
    const parser = { parse: jest.fn(() => { throw error; }) };
    await expect(new Dumper(parser).dump(inputPath)).rejects.toBe(error);
});
