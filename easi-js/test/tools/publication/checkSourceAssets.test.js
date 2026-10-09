const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const script = path.resolve('tools/publication/checkSourceAssets.js');
let directory;
let temporaryDirectory;

function git(...args) {
    return execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', stdio: 'pipe' });
}

function write(name, bytes) {
    fs.mkdirSync(path.dirname(path.join(directory, name)), { recursive: true });
    fs.writeFileSync(path.join(directory, name), bytes);
}

function part10() {
    const bytes = Buffer.alloc(180);
    bytes.write('DICM', 128, 'ascii');
    bytes.write('INVENTED-SENSITIVE-MARKER', 132, 'ascii');
    return bytes;
}

function check(cwd = directory) {
    return spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
}

function expectBlocked(name) {
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(JSON.stringify(name));
    expect(result.stderr).not.toContain('INVENTED-SENSITIVE-MARKER');
    expect(result.stdout).toBe('');
}

beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'easi-source-assets-'));
    directory = temporaryDirectory;
    git('init', '--quiet');
});

afterEach(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('accepts dictionary XML and generated JavaScript in a clean Git checkout', () => {
    write('data/dictionary/part06.xml', '<dictionary><tag id="00080018"/></dictionary>');
    write('easi-js/test/fixtures/SyntheticDicom.js', '// Invented bytes only.\nexport const marker = "DICM";\n');
    git('add', '.');
    const result = check();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Source asset check passed: 2 Git-listed files.');
    expect(result.stderr).toBe('');
});

test('allows ignored local originals and local extensionless Part-10 files', () => {
    write('.gitignore', 'data/dicoms/\ndata/local-corpus/\nlocal/\n*.[dD][cC][mM]\n');
    git('add', '.gitignore');
    write('data/dicoms/original.DCM', part10());
    write('data/local-corpus/renamed', part10());
    write('local/private-copy', part10());
    write('another/image.dCm', part10());
    expect(check().status).toBe(0);
});

test.each(['data/dicoms', 'data/mixed', 'data/xml', 'data/dumps', 'data/local-corpus', 'ext/tools'])
('blocks nonignored new files in the private prefix %s', (prefix) => {
    const name = `${prefix}/accidental-copy.txt`;
    write(name, 'Invented placeholder');
    expectBlocked(name);
});

test.each(['image.dCm', 'image.DiCoM', 'image.ImA'])('blocks a force-added ignored DICOM extension: %s', (name) => {
    write('.gitignore', '*');
    git('add', '--force', '.gitignore');
    write(name, 'Invented placeholder');
    git('add', '--force', name);
    expectBlocked(name);
});

test('blocks a force-added ignored private path without relying on its extension', () => {
    write('.gitignore', 'data/mixed/');
    git('add', '.gitignore');
    const name = 'data/mixed/renamed-image';
    write(name, 'Invented placeholder');
    git('add', '--force', name);
    expectBlocked(name);
});

test('detects a renamed extensionless Part-10 file before it is added', () => {
    const name = 'samples/renamed-input';
    write(name, part10());
    expectBlocked(name);
});

test('inspects the staged blob when the working file has since been replaced', () => {
    const name = 'samples/staged-then-hidden';
    const bytes = Buffer.alloc(2 * 1024 * 1024);
    part10().copy(bytes);
    write(name, bytes);
    git('add', name);
    write(name, 'Safe working copy cannot conceal the staged binary.');
    expectBlocked(name);
});

test('reports each filename when multiple staged files share the same Part-10 blob', () => {
    for (const name of ['samples/first-copy', 'samples/second-copy']) {
        write(name, part10());
        git('add', name);
        write(name, 'Safe working text');
    }
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(JSON.stringify('samples/first-copy'));
    expect(result.stderr).toContain(JSON.stringify('samples/second-copy'));
    expect(result.stderr).not.toContain('INVENTED-SENSITIVE-MARKER');
});

test('inspects unstaged changes to a safe tracked file', () => {
    const name = 'samples/changed-input';
    write(name, 'Safe staged text');
    git('add', name);
    write(name, part10());
    expectBlocked(name);
});

test('allows a removed index asset to remain ignored in the local developer kit', () => {
    const name = 'data/dicoms/local-copy.dcm';
    write('.gitignore', 'data/dicoms/');
    git('add', '.gitignore');
    write(name, part10());
    git('add', '--force', name);
    git('rm', '--cached', '--force', name);
    expect(fs.existsSync(path.join(directory, name))).toBe(true);
    expect(check().status).toBe(0);
});

test('prints only safely quoted filenames for Part-10 findings', () => {
    const name = 'samples/renamed\nimage file';
    write(name, part10());
    expectBlocked(name);
});

test('does not treat a marker at another byte offset as a Part-10 header', () => {
    const bytes = Buffer.alloc(256);
    bytes.write('DICM', 20, 'ascii');
    write('data/dictionary/example.xml', bytes);
    git('add', '.');
    expect(check().status).toBe(0);
});

test('fails clearly for a source export that has no Git index', () => {
    fs.rmSync(path.join(directory, '.git'), { recursive: true });
    const result = check();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('a Git checkout is required');
    expect(result.stdout).toBe('');
});

test('finds the platform Git root from a nested CI checkout without inspecting sibling docs', () => {
    directory = path.join(temporaryDirectory, 'easi-platform');
    fs.mkdirSync(path.join(directory, 'easi-js'), { recursive: true });
    git('init', '--quiet');
    write('README.md', 'Synthetic platform checkout');
    git('add', '.');
    const docs = path.join(temporaryDirectory, 'easi-docs');
    fs.mkdirSync(docs);
    fs.writeFileSync(path.join(docs, 'sibling-input.dcm'), part10());
    const result = check(path.join(directory, 'easi-js'));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Source asset check passed: 1 Git-listed files.');
});
