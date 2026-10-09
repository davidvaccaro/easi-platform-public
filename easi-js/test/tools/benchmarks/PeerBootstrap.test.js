import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const projectRoot = process.cwd();
const peerRoot = path.join(projectRoot, 'tools', 'benchmarks', 'peer');
const runnerPom = fs.readFileSync(path.join(peerRoot, 'runners', 'dcm4che', 'pom.xml'), 'utf8');
const release = runnerPom.match(/<dcm4che.version>([^<]+)<\/dcm4che.version>/)[1];
let temporary;
let remote;
let bootstrap;
let source;

function git(args, cwd = remote) {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function shell(commands, env = {}) {
    return spawnSync('bash', ['-c', 'source "$BOOTSTRAP"\n' + commands], {
        env: { ...process.env, BOOTSTRAP: bootstrap, SOURCE_REPOSITORY: remote, MAVEN_LOG: path.join(temporary, 'maven.log'), ...env },
        encoding: 'utf8'
    });
}

beforeEach(() => {
    temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'easi-peer-bootstrap-'));
    remote = path.join(temporary, 'upstream');
    fs.mkdirSync(remote);
    git(['init']);
    fs.writeFileSync(path.join(remote, 'pom.xml'), `<project><version>${release}</version></project>\n`);
    fs.writeFileSync(path.join(remote, 'mvnw'), '#!/usr/bin/env bash\n' +
        'echo "$*" >> "$MAVEN_LOG"\n' +
        'exit "${MAVEN_FAILURE:-0}"\n', { mode: 0o755 });
    git(['add', '.']);
    git(['-c', 'user.name=Synthetic Fixture', '-c', 'user.email=synthetic@example.invalid', 'commit', '--no-gpg-sign', '-m', 'invented release']);
    git(['tag', release]);
    fs.writeFileSync(path.join(remote, 'pom.xml'), '<project><version>99.0.0-SNAPSHOT</version></project>\n');
    git(['add', '.']);
    git(['-c', 'user.name=Synthetic Fixture', '-c', 'user.email=synthetic@example.invalid', 'commit', '--no-gpg-sign', '-m', 'invented future development']);
    const copiedPeer = path.join(temporary, 'peer');
    fs.mkdirSync(path.join(copiedPeer, 'runners', 'dcm4che'), { recursive: true });
    bootstrap = path.join(copiedPeer, 'bootstrapPeerToolkits.sh');
    fs.copyFileSync(path.join(peerRoot, 'bootstrapPeerToolkits.sh'), bootstrap);
    fs.writeFileSync(path.join(copiedPeer, 'runners', 'dcm4che', 'pom.xml'), runnerPom);
    source = path.join(copiedPeer, 'vendors', 'src', 'dcm4che');
});

afterEach(() => fs.rmSync(temporary, { recursive: true, force: true }));

test('fresh bootstrap checks out the release required by the benchmark runner, rather than newer upstream HEAD', () => {
    const result = shell('clone_if_missing dcm4che "$SOURCE_REPOSITORY" "$DCM4CHE_VERSION"');
    expect(result.status).toBe(0);
    expect(git(['describe', '--tags', '--exact-match', 'HEAD'], source)).toBe(release);
    expect(fs.readFileSync(path.join(source, 'pom.xml'), 'utf8')).toContain(`<version>${release}</version>`);
    expect(git(['rev-parse', 'HEAD'], source)).not.toBe(git(['rev-parse', 'HEAD']));
});

test('an existing matching release can be reused without resetting it', () => {
    expect(shell('clone_if_missing dcm4che "$SOURCE_REPOSITORY" "$DCM4CHE_VERSION"').status).toBe(0);
    const head = git(['rev-parse', 'HEAD'], source);
    const result = shell('clone_if_missing dcm4che "$SOURCE_REPOSITORY" "$DCM4CHE_VERSION"');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('source already present');
    expect(git(['rev-parse', 'HEAD'], source)).toBe(head);
});

test('a mismatched cached clone fails with an actionable message and preserves its HEAD and files', () => {
    git(['clone', remote, source], temporary);
    const head = git(['rev-parse', 'HEAD'], source);
    const pom = fs.readFileSync(path.join(source, 'pom.xml'));
    const result = shell('clone_if_missing dcm4che "$SOURCE_REPOSITORY" "$DCM4CHE_VERSION"');
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('Move');
    expect(result.stdout).toContain('local work has not been changed');
    expect(git(['rev-parse', 'HEAD'], source)).toBe(head);
    expect(fs.readFileSync(path.join(source, 'pom.xml'))).toEqual(pom);
});

test('local modifications on the pinned release fail without overwriting the edits', () => {
    expect(shell('clone_if_missing dcm4che "$SOURCE_REPOSITORY" "$DCM4CHE_VERSION"').status).toBe(0);
    fs.appendFileSync(path.join(source, 'pom.xml'), '<!-- local work -->\n');
    const local = fs.readFileSync(path.join(source, 'pom.xml'));
    const result = shell('clone_if_missing dcm4che "$SOURCE_REPOSITORY" "$DCM4CHE_VERSION"');
    expect(result.status).not.toBe(0);
    expect(fs.readFileSync(path.join(source, 'pom.xml'))).toEqual(local);
});

test('the pinned core is installed before the runner is packaged and Maven failures stay fatal', () => {
    expect(shell('clone_if_missing dcm4che "$SOURCE_REPOSITORY" "$DCM4CHE_VERSION"').status).toBe(0);
    const result = shell('bootstrap_dcm4che_runner');
    expect(result.status).toBe(0);
    const calls = fs.readFileSync(path.join(temporary, 'maven.log'), 'utf8').trim().split('\n');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('-pl dcm4che-core -am install');
    expect(calls[1]).toContain('-f ');
    expect(calls[1]).toContain('runners/dcm4che/pom.xml -DskipTests package');
    const failed = shell('bootstrap_dcm4che_runner', { MAVEN_FAILURE: '7' });
    expect(failed.status).toBe(7);
    expect(fs.readFileSync(path.join(temporary, 'maven.log'), 'utf8').trim().split('\n')).toHaveLength(3);
});

test('a missing Maven wrapper fails rather than silently skipping the runner build', () => {
    const result = shell('bootstrap_dcm4che_runner');
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('Maven wrapper was not found');
});
