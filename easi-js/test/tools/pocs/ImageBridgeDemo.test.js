import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import PngDecoder from '../../../src/codecs/decoders/PngDecoder.js';
import { createDicomFixture } from '../../fixtures/dicom/SyntheticDicom.js';
import { dimseSocketTest } from '../../transports/dimse/DimseSocketTestGate.js';

async function listen(server, port = 0) {
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
    });
}

async function close(server) {
    if (server.listening) await new Promise(resolve => server.close(resolve));
}

async function choosePorts() {
    const servers = [net.createServer(), net.createServer()];
    try {
        await Promise.all(servers.map(server => listen(server)));
        return servers.map(server => server.address().port);
    }
    finally { await Promise.all(servers.map(close)); }
}

dimseSocketTest('ImageBridge --once uses its valid default AE and synthetic fallback through real C-STORE and cloud output', async () => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'easi-imagebridge-cli-'));
    // A checkout-shaped directory with an invented local decoy proves the default
    // never reads the optional developer corpus without explicit --pick/--input.
    const cwd = path.join(temporary, 'easi-platform', 'easi-js');
    const output = path.join(temporary, 'output');
    const script = path.resolve('tools/pocs/ImageBridge/ImageBridgeDemo.js');
    const fixture = createDicomFixture();
    let child;
    let completion;
    let timeout;
    try {
        await fs.mkdir(cwd, { recursive: true });
        const localCorpus = path.join(cwd, '..', 'data', 'dicoms');
        await fs.mkdir(localCorpus, { recursive: true });
        const decoy = createDicomFixture('explicit-le', { patientId: 'EASI-SYNTHETIC-DECOY', sopInstanceUid: '2.25.999' });
        await fs.writeFile(path.join(localCorpus, 'ignored.dcm'), decoy.bytes);
        const [bridgePort, cloudPort] = await choosePorts();
        child = spawn(process.execPath, [script, '--once',
            '--bridge-port', String(bridgePort), '--cloud-port', String(cloudPort),
            '--output-dir', output, '--startup-timeout-ms', '5000', '--receive-timeout-ms', '5000'],
            { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', bytes => { stdout += bytes; });
        child.stderr.on('data', bytes => { stderr += bytes; });
        completion = new Promise((resolve, reject) => {
            child.once('error', reject);
            child.once('close', (code, signal) => resolve({ code, signal }));
        });
        timeout = setTimeout(() => child.kill('SIGKILL'), 20000);
        const result = await completion;
        clearTimeout(timeout);
        if (result.code !== 0) throw new Error(`ImageBridge demo failed (${result.code}, ${result.signal}):\n${stdout}${stderr}`);
        expect(stderr).toBe('');
        expect(stdout).toContain('Using independently generated synthetic demo pixels.');
        // No AE override is supplied: this fails when the CLI's default exceeds 16 characters.
        expect(stdout).toContain('C-STORE status=0x0000 ok=true');
        expect(stdout).toContain('Files with observed cloud events: 1');
        expect(stdout).toContain('keyFrames=3 concerns=0');
        expect(Array.from(await fs.readFile(path.join(output, 'fixtures', 'synthetic-demo.dcm')))).toEqual(Array.from(fixture.bytes));

        const eventDirectory = path.join(output, 'mock-cloud', 'events');
        const eventFiles = (await fs.readdir(eventDirectory)).filter(file => file.endsWith('.json')).sort();
        expect(eventFiles).toHaveLength(3);
        const assets = (await fs.readdir(path.join(output, 'mock-cloud', 'assets'))).filter(file => file.endsWith('.png')).sort();
        expect(assets).toHaveLength(3);
        for (const [index, file] of eventFiles.entries()) {
            const event = JSON.parse(await fs.readFile(path.join(eventDirectory, file), 'utf8'));
            expect(event.eventType).toBe('image-bridge.key-frame');
            expect(event.instanceUID).toBe(fixture.expected.sopInstanceUid);
            expect(event.metadata).toMatchObject({
                patientId: fixture.expected.patientId,
                patientName: fixture.expected.patientName,
                studyInstanceUid: fixture.expected.studyInstanceUid,
                seriesInstanceUid: fixture.expected.seriesInstanceUid,
                sopInstanceUid: fixture.expected.sopInstanceUid
            });
            expect(event.frame).toMatchObject({ index, width: 32, height: 32, encoding: 'png', mimeType: 'image/png' });
            expect(event.heuristic.reason).toBe(['first', 'cadence', 'last'][index]);
            const png = new Uint8Array(await fs.readFile(path.join(output, 'mock-cloud', 'assets', assets[index])));
            expect(Buffer.from(png).toString('base64')).toBe(event.frame.bytesBase64);
            const decoded = await new PngDecoder().decodeImage(png);
            expect(decoded).toMatchObject({ width: fixture.expected.columns, height: fixture.expected.rows });
            expect(decoded.bytes).toEqual(fixture.expected.firstFrameRgba);
        }
        // Both services must release their ports when --once finishes.
        for (const port of [bridgePort, cloudPort]) {
            const server = net.createServer();
            try { await listen(server, port); }
            finally { await close(server); }
        }
    }
    finally {
        clearTimeout(timeout);
        if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        await completion?.catch(() => {});
        await fs.rm(temporary, { recursive: true, force: true });
    }
}, 30000);
