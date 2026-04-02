import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { createMockCloudServer } from '../../../tools/pocs/ImageBridge/MockCloudServer.js';

function request({ host, port, method, pathname, headers = {}, body = null }) {

    return new Promise((resolve, reject) => {

        var requestOptions = {
            host,
            port,
            method,
            path: pathname,
            headers
        };

        var req = http.request(requestOptions, (res) => {

            var chunks = [];

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                var buffer = Buffer.concat(chunks);
                resolve({
                    statusCode: Number(res.statusCode ?? 0),
                    headers: res.headers,
                    body: buffer
                });
            });

        });

        req.on('error', reject);

        if (body != null) {
            req.write(body);
        }

        req.end();

    });

}

function parseJsonBody(response) {
    return JSON.parse(response.body.toString('utf-8'));
}

test('Test: ImageBridge MockCloudServer stores event payloads and frame assets', async () => {

    var tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'imagebridge-mock-cloud-'));

    var server = createMockCloudServer({
        host: '127.0.0.1',
        port: 0,
        outputDirectory: tempRoot,
        verbose: false,
        maxBodyBytes: (1024 * 1024)
    });

    try {

        var listener = await server.start();

        var eventPayload = {
            eventType: 'image-bridge.key-frame',
            bridgeId: 'ImageBridgeDemo',
            instanceUID: '1.2.840.113619.2.55.3.604688132.999.1',
            metadata: {
                studyInstanceUid: '1.2.840.113619.2.55.3.604688132.999',
                seriesInstanceUid: '1.2.840.113619.2.55.3.604688132.999.2'
            },
            frame: {
                index: 0,
                width: 2,
                height: 2,
                encoding: 'png',
                mimeType: 'image/png',
                bytesBase64: Buffer.from([137, 80, 78, 71]).toString('base64')
            },
            heuristic: {
                reason: 'first',
                motionScore: 0
            }
        };

        var body = Buffer.from(JSON.stringify(eventPayload));

        var postResponse = await request({
            host: listener.host,
            port: listener.port,
            method: 'POST',
            pathname: '/image-bridge/events',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body.length
            },
            body
        });

        expect(postResponse.statusCode).toBe(202);

        var postJson = parseJsonBody(postResponse);
        expect(postJson.ok).toBe(true);
        expect(postJson.eventId).toBe(1);
        expect(typeof postJson.assetUrl).toBe('string');

        var listResponse = await request({
            host: listener.host,
            port: listener.port,
            method: 'GET',
            pathname: '/api/events'
        });

        expect(listResponse.statusCode).toBe(200);

        var listJson = parseJsonBody(listResponse);
        expect(listJson.ok).toBe(true);
        expect(listJson.count).toBe(1);
        expect(Array.isArray(listJson.events)).toBe(true);
        expect(listJson.events[0].eventType).toBe('image-bridge.key-frame');

        var eventDetailResponse = await request({
            host: listener.host,
            port: listener.port,
            method: 'GET',
            pathname: '/api/events/1'
        });

        expect(eventDetailResponse.statusCode).toBe(200);

        var eventDetailJson = parseJsonBody(eventDetailResponse);
        expect(eventDetailJson.ok).toBe(true);
        expect(eventDetailJson.payload.instanceUID).toBe(eventPayload.instanceUID);

        var assetResponse = await request({
            host: listener.host,
            port: listener.port,
            method: 'GET',
            pathname: postJson.assetUrl
        });

        expect(assetResponse.statusCode).toBe(200);
        expect(assetResponse.body.length).toBe(4);
        expect(assetResponse.body[0]).toBe(137);
        expect(assetResponse.body[1]).toBe(80);

        var eventFiles = await fs.readdir(path.join(tempRoot, 'events'));
        var assetFiles = await fs.readdir(path.join(tempRoot, 'assets'));

        expect(eventFiles.some((name) => name.endsWith('.json'))).toBe(true);
        expect(assetFiles.length).toBe(1);

    }
    finally {

        await server.stop();

    }

}, 20000);
