import fs from 'node:fs';
import path from 'node:path';

export const CONTRACT_SNAPSHOT_FILES = [
    'schemas/implementation/javascript/easi-api.contract.json',
    'schemas/implementation/javascript/easi-api.contract.schema.json',
    'fixtures/neutral/valid/codec-plugin-contract/basic.json',
    'fixtures/neutral/valid/plugin-contract/basic.json'
];

export function bundledContractsRoot(projectRoot) {
    return path.join(projectRoot, 'test', 'fixtures', 'contracts');
}

function validateRoot(root, mode) {
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
        throw new Error(`EASI contracts root is not a directory: ${root}`);
    }
    const required = mode === 'write' ? CONTRACT_SNAPSHOT_FILES.slice(1) : CONTRACT_SNAPSHOT_FILES;
    for (const relative of required) {
        const file = path.join(root, relative);
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            throw new Error(`EASI contracts root is missing a required file: ${file}`);
        }
    }
    return root;
}

/** Public checks use a pinned local snapshot; maintainers generate canonical output. */
export function resolveContractsRoot(projectRoot, { mode = 'check', env = process.env } = {}) {
    if (mode !== 'check' && mode !== 'write') throw new Error(`Unknown contracts mode: ${mode}`);
    if (env.EASI_CONTRACTS_ROOT !== undefined) {
        const value = env.EASI_CONTRACTS_ROOT;
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error('EASI_CONTRACTS_ROOT must name a contracts directory.');
        }
        return validateRoot(path.resolve(value), mode);
    }
    if (mode === 'write') {
        const repositoryRoot = path.resolve(projectRoot, '..');
        const workspaceRoot = path.resolve(repositoryRoot, '..');
        const canonical = [
            path.join(workspaceRoot, 'easi', 'easi-contracts'),
            path.join(workspaceRoot, 'easi-contracts'),
            path.join(repositoryRoot, 'easi-contracts')
        ].find(candidate => fs.existsSync(candidate));
        if (canonical) return validateRoot(canonical, mode);
    }
    return validateRoot(bundledContractsRoot(projectRoot), mode);
}

/** Refresh exactly the four files used by public tests after canonical generation. */
export function refreshContractSnapshot(projectRoot, contractsRoot) {
    validateRoot(contractsRoot, 'check');
    const snapshotRoot = bundledContractsRoot(projectRoot);
    for (const relative of CONTRACT_SNAPSHOT_FILES) {
        const source = path.join(contractsRoot, relative);
        const target = path.join(snapshotRoot, relative);
        if (path.resolve(source) === path.resolve(target)) continue;
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(source, target);
    }
    return snapshotRoot;
}
