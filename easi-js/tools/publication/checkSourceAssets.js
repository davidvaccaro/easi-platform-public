import { execFile, spawn } from 'node:child_process';
import { lstat, open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const privatePrefix = /^(?:data\/(?:dicoms|mixed|xml|dumps|local-corpus)|ext\/tools)(?:\/|$)/i;
const dicomExtension = /\.(?:dcm|dicom|ima)$/i;

function hasPart10Header(bytes) {
    return bytes.length >= 132 && bytes.subarray(128, 132).equals(Buffer.from('DICM'));
}

async function git(cwd, args) {
    try {
        return (await run('git', ['-C', cwd, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })).stdout;
    }
    catch {
        throw new Error('Cannot check source assets: Git could not inspect the checkout.');
    }
}

/** Inspect staged blob headers without loading complete binary contents into memory. */
async function inspectIndexHeaders(root, objects) {
    if (objects.size === 0) return new Set();
    const child = spawn('git', ['-C', root, 'cat-file', '--batch'], { stdio: ['pipe', 'pipe', 'ignore'] });
    const completion = new Promise((accept, reject) => {
        child.once('error', () => reject(new Error('Cannot check source assets: Git could not read the index.')));
        child.once('close', (code) => code === 0 ? accept() : reject(new Error('Cannot check source assets: Git could not read the index.')));
    });
    // Attach a rejection handler immediately, including while stdout is being consumed.
    completion.catch(() => {});
    child.stdin.on('error', () => {});
    child.stdin.end([...objects.keys()].join('\n') + '\n');
    const matches = new Set();
    let pending = Buffer.alloc(0);
    let current = null;
    let completed = 0;
    try {
        for await (const chunk of child.stdout) {
            pending = pending.length === 0 ? chunk : Buffer.concat([pending, chunk]);
            while (pending.length > 0) {
                if (current === null) {
                    const end = pending.indexOf(10);
                    if (end < 0) break;
                    const [object, type, size] = pending.subarray(0, end).toString('ascii').split(' ');
                    if (!objects.has(object) || type !== 'blob' || !/^\d+$/.test(size)) {
                        throw new Error('Cannot check source assets: an index object could not be inspected.');
                    }
                    current = { object, remaining: Number(size), header: Buffer.alloc(132), collected: 0 };
                    pending = pending.subarray(end + 1);
                }
                if (current.remaining > 0) {
                    const consumed = Math.min(current.remaining, pending.length);
                    const retained = Math.min(consumed, 132 - current.collected);
                    if (retained > 0) {
                        pending.copy(current.header, current.collected, 0, retained);
                        current.collected += retained;
                    }
                    current.remaining -= consumed;
                    pending = pending.subarray(consumed);
                    if (current.remaining > 0) break;
                }
                if (pending.length === 0) break;
                if (pending[0] !== 10) throw new Error('Cannot check source assets: invalid Git object framing.');
                if (current.collected === 132 && hasPart10Header(current.header)) matches.add(current.object);
                pending = pending.subarray(1);
                current = null;
                completed++;
            }
        }
        await completion;
        if (current !== null || pending.length !== 0 || completed !== objects.size) {
            throw new Error('Cannot check source assets: incomplete Git index inspection.');
        }
        return matches;
    }
    catch (error) {
        child.kill();
        await completion.catch(() => {});
        throw error;
    }
}

async function inspectWorkingHeader(path) {
    let handle;
    try {
        // A source archive contains a symlink itself, not the target's local bytes.
        if (!(await lstat(path)).isFile()) return false;
        handle = await open(path, 'r');
        const header = Buffer.alloc(132);
        const { bytesRead } = await handle.read(header, 0, 132, 0);
        return bytesRead === 132 && hasPart10Header(header);
    }
    catch (error) {
        if (error.code === 'ENOENT') return false;
        throw new Error('Cannot check source assets: a listed source file could not be inspected.');
    }
    finally { await handle?.close(); }
}

/** Check the Git index and nonignored working files; ignored local corpora stay local. */
export async function checkSourceAssets(cwd = process.cwd()) {
    let root;
    try { root = (await git(cwd, ['rev-parse', '--show-toplevel'])).trim(); }
    catch {
        throw new Error('Cannot check source assets: a Git checkout is required. Run this check before creating a source export.');
    }
    const candidates = new Set();
    const objects = new Map();
    const violations = new Set();
    const staged = await git(root, ['ls-files', '--cached', '--stage', '-z']);
    for (const record of staged.split('\0').filter(Boolean)) {
        const tab = record.indexOf('\t');
        const [mode, object] = record.slice(0, tab).split(' ');
        const path = record.slice(tab + 1);
        candidates.add(path);
        if (privatePrefix.test(path) || dicomExtension.test(path)) violations.add(path);
        else if (mode !== '160000') {
            if (!objects.has(object)) objects.set(object, []);
            objects.get(object).push(path);
        }
    }
    const untracked = await git(root, ['ls-files', '--others', '--exclude-standard', '-z']);
    for (const path of untracked.split('\0').filter(Boolean)) {
        candidates.add(path);
        if (privatePrefix.test(path) || dicomExtension.test(path)) violations.add(path);
    }
    for (const object of await inspectIndexHeaders(root, objects)) {
        for (const path of objects.get(object)) violations.add(path);
    }
    for (const path of candidates) {
        if (!violations.has(path) && await inspectWorkingHeader(resolve(root, path))) violations.add(path);
    }
    if (violations.size > 0) {
        // JSON quoting keeps filenames with spaces, line breaks or control characters readable.
        // No file contents or DICOM values appear in publication-check output.
        throw new Error('Source publication blocked by private imaging assets or external binaries:\n' +
            [...violations].sort().map(path => `- ${JSON.stringify(path)}`).join('\n'));
    }
    return { filesChecked: candidates.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    checkSourceAssets().then(result => {
        console.log(`Source asset check passed: ${result.filesChecked} Git-listed files.`);
    }).catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
