#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..', '..');
const repositoryRoot = path.resolve(projectRoot, '..');
const workspaceRoot = path.resolve(repositoryRoot, '..');

const explicitRoot = process.env.EASI_SPEC_ROOT ? path.resolve(process.env.EASI_SPEC_ROOT) : null;
const candidateRoots = [
    explicitRoot,
    path.join(workspaceRoot, 'easi', 'easi-spec'),
    path.join(workspaceRoot, 'easi-spec'),
    path.join(repositoryRoot, 'easi-spec')
].filter(Boolean);

const specRoot = candidateRoots.find((candidate) => fs.existsSync(candidate));

if (!specRoot) {
    const listedCandidates = candidateRoots.join(', ');
    throw new Error(`Unable to resolve EASI spec root. Checked: ${listedCandidates}`);
}

const generatorPath = path.join(specRoot, 'site', 'scripts', 'generate-api-reference.js');

if (fs.existsSync(generatorPath) === false) {
    throw new Error(`Unable to locate API reference generator: ${generatorPath}`);
}

const child = spawnSync(process.execPath, [generatorPath], {
    stdio: 'inherit',
    env: process.env
});

if (child.status !== 0) {
    process.exit(child.status ?? 1);
}
