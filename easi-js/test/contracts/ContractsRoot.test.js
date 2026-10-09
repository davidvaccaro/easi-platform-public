import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import {
    CONTRACT_SNAPSHOT_FILES,
    bundledContractsRoot,
    refreshContractSnapshot,
    resolveContractsRoot
} from '../../tools/contracts/resolveContractsRoot.js';

let workspace;
let projectRoot;
let canonicalRoot;

function populate(root, omit = null) {
    for (const relative of CONTRACT_SNAPSHOT_FILES) {
        if (relative === omit) continue;
        const file = path.join(root, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify({ source: relative }));
    }
}

beforeEach(() => {
    workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'easi-contract-resolver-'));
    projectRoot = path.join(workspace, 'easi-platform', 'easi-js');
    canonicalRoot = path.join(workspace, 'easi', 'easi-contracts');
    fs.mkdirSync(projectRoot, { recursive: true });
});

afterEach(() => fs.rmSync(workspace, { recursive: true, force: true }));

test('public checks use the bundled snapshot even when a canonical companion exists', () => {
    populate(bundledContractsRoot(projectRoot));
    populate(canonicalRoot);
    expect(resolveContractsRoot(projectRoot, { env: {} })).toBe(bundledContractsRoot(projectRoot));
});

test('maintainer generation selects the canonical companion and refreshes only the required files', () => {
    populate(canonicalRoot);
    fs.writeFileSync(path.join(canonicalRoot, 'unrelated.json'), '{}');
    expect(resolveContractsRoot(projectRoot, { mode: 'write', env: {} })).toBe(canonicalRoot);
    const snapshot = refreshContractSnapshot(projectRoot, canonicalRoot);
    for (const relative of CONTRACT_SNAPSHOT_FILES) {
        expect(fs.readFileSync(path.join(snapshot, relative))).toEqual(fs.readFileSync(path.join(canonicalRoot, relative)));
    }
    expect(fs.existsSync(path.join(snapshot, 'unrelated.json'))).toBe(false);
});

test('generation without a companion updates the bundled snapshot', () => {
    populate(bundledContractsRoot(projectRoot));
    expect(resolveContractsRoot(projectRoot, { mode: 'write', env: {} })).toBe(bundledContractsRoot(projectRoot));
    expect(refreshContractSnapshot(projectRoot, bundledContractsRoot(projectRoot))).toBe(bundledContractsRoot(projectRoot));
});

test('an explicit contracts root overrides the bundled snapshot for checks and generation', () => {
    populate(bundledContractsRoot(projectRoot));
    populate(canonicalRoot);
    for (const mode of ['check', 'write']) {
        expect(resolveContractsRoot(projectRoot, { mode, env: { EASI_CONTRACTS_ROOT: canonicalRoot } })).toBe(canonicalRoot);
    }
});

test.each(['', '   ', 'missing'])('an invalid explicit root (%j) fails without falling back', value => {
    populate(bundledContractsRoot(projectRoot));
    const explicit = value === 'missing' ? path.join(workspace, 'missing') : value;
    expect(() => resolveContractsRoot(projectRoot, { env: { EASI_CONTRACTS_ROOT: explicit } })).toThrow(/contracts directory|not a directory/);
});

test.each(CONTRACT_SNAPSHOT_FILES)('a missing snapshot file fails strictly: %s', relative => {
    populate(bundledContractsRoot(projectRoot), relative);
    expect(() => resolveContractsRoot(projectRoot, { env: {} })).toThrow(relative);
});

test('a new canonical baseline can be generated only when its schema and examples exist', () => {
    populate(canonicalRoot, CONTRACT_SNAPSHOT_FILES[0]);
    expect(resolveContractsRoot(projectRoot, { mode: 'write', env: {} })).toBe(canonicalRoot);
    fs.rmSync(path.join(canonicalRoot, CONTRACT_SNAPSHOT_FILES[1]));
    expect(() => resolveContractsRoot(projectRoot, { mode: 'write', env: {} })).toThrow(CONTRACT_SNAPSHOT_FILES[1]);
});

test('actual generation refreshes the public snapshot, which remains strict without the companion', () => {
    const sourceProject = process.cwd();
    const tools = path.join(projectRoot, 'tools', 'contracts');
    fs.mkdirSync(tools, { recursive: true });
    for (const filename of ['generateApiContract.js', 'resolveContractsRoot.js']) {
        fs.copyFileSync(path.join(sourceProject, 'tools', 'contracts', filename), path.join(tools, filename));
    }
    fs.mkdirSync(path.join(projectRoot, 'src'));
    fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify({ type: 'module', name: 'synthetic-contract-test', version: '1.0.0' }));
    const source = path.join(projectRoot, 'src', 'Example.js');
    fs.writeFileSync(source, 'export default class Example { value() { return 1; } }\n');
    for (const relative of CONTRACT_SNAPSHOT_FILES.slice(1)) {
        const target = path.join(canonicalRoot, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(bundledContractsRoot(sourceProject), relative), target);
    }
    const env = { ...process.env };
    delete env.EASI_CONTRACTS_ROOT;
    const script = path.join(tools, 'generateApiContract.js');
    const output = execFileSync(process.execPath, [script], { cwd: projectRoot, env, encoding: 'utf8' });
    expect(output).toContain('Refreshed public contract snapshot');
    for (const relative of CONTRACT_SNAPSHOT_FILES) {
        expect(fs.readFileSync(path.join(bundledContractsRoot(projectRoot), relative))).toEqual(fs.readFileSync(path.join(canonicalRoot, relative)));
    }
    fs.renameSync(path.join(workspace, 'easi'), path.join(workspace, 'retired-companion'));
    expect(execFileSync(process.execPath, [script, '--check'], { cwd: projectRoot, env, encoding: 'utf8' })).toContain('API contract is in sync.');
    fs.appendFileSync(source, 'export const changed = true;\n');
    const stale = spawnSync(process.execPath, [script, '--check'], { cwd: projectRoot, env, encoding: 'utf8' });
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('API contract is out of sync.');
});
