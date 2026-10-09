import { Readable, Writable } from 'node:stream';
import { createKitchenSinkServer } from '../../samples/kitchen-sink/server.js';

const apiPrefix = '/easi-js/samples/kitchen-sink/api/dimse/';
const routes = ['cfind-studies', 'cget-instance', 'cmove-deidentify-relay'];
const previewOrigins = ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://[::1]:5500'];

class MockResponse extends Writable {

    constructor() {
        super();
        this.statusCode = 200;
        this.headers = new Map();
        this.chunks = [];
    }

    setHeader(name, value) {
        this.headers.set(name.toLowerCase(), value);
    }

    getHeader(name) {
        return this.headers.get(name.toLowerCase());
    }

    writeHead(statusCode, headers = {}) {
        this.statusCode = statusCode;
        for (const [name, value] of Object.entries(headers))
            this.setHeader(name, value);
        return this;
    }

    _write(chunk, _encoding, callback) {
        this.chunks.push(Buffer.from(chunk));
        callback();
    }

}

async function sendRequest(server, path, { method = 'POST', headers = {}, body = '{}' } = {}) {

    const request = Readable.from([Buffer.from(body)]);
    request.method = method;
    request.url = path;
    request.headers = headers;
    const response = new MockResponse();
    const finished = new Promise((resolve, reject) => {
        response.once('finish', resolve);
        response.once('error', reject);
    });

    server.emit('request', request, response);
    await finished;
    response.text = Buffer.concat(response.chunks).toString('utf8');
    return response;

}

describe('Kitchen Sink DIMSE requests from a local static preview', () => {

    let server;
    let pipelineBuilder;
    let process;
    let createSourceTransport;

    beforeEach(() => {
        process = jest.fn().mockResolvedValue([]);
        const builder = {
            fromDimseAssociation() { return builder; },
            ofDicomData() { return builder; },
            toInstances() { return builder; },
            build() { return { process }; }
        };
        pipelineBuilder = jest.fn(() => builder);
        createSourceTransport = jest.fn(() => ({}));
        server = createKitchenSinkServer({
            dependencies: { easi: { pipelineBuilder }, createSourceTransport }
        });
    });

    test.each(routes.flatMap(route => previewOrigins.map(origin => [route, origin])))
    ('allows a JSON POST preflight for %s from %s without running DIMSE', async (route, origin) => {
        const response = await sendRequest(server, apiPrefix + route, {
            method: 'OPTIONS',
            headers: {
                origin,
                'access-control-request-method': 'POST',
                'access-control-request-headers': 'content-type'
            },
            body: ''
        });

        expect(response.statusCode).toBe(204);
        expect(response.text).toBe('');
        expect(response.getHeader('Access-Control-Allow-Origin')).toBe(origin);
        expect(response.getHeader('Vary')).toBe('Origin');
        expect(response.getHeader('Access-Control-Allow-Methods')).toBe('POST');
        expect(response.getHeader('Access-Control-Allow-Headers')).toBe('Content-Type');
        expect(response.getHeader('Access-Control-Allow-Credentials')).toBeUndefined();
        expect(pipelineBuilder).not.toHaveBeenCalled();
        expect(createSourceTransport).not.toHaveBeenCalled();
    });

    test.each(previewOrigins)('returns the query result to the exact preview origin %s', async origin => {
        const response = await sendRequest(server, apiPrefix + 'cfind-studies', {
            headers: { origin, 'content-type': 'application/json' }
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.text)).toMatchObject({ success: true, operation: 'c-find', resultCount: 0 });
        expect(response.getHeader('Access-Control-Allow-Origin')).toBe(origin);
        expect(response.getHeader('Vary')).toBe('Origin');
        expect(response.getHeader('Access-Control-Allow-Credentials')).toBeUndefined();
        expect(process).toHaveBeenCalledTimes(1);
    });

    test.each(routes)('keeps preview headers on a %s API error', async route => {
        const response = await sendRequest(server, apiPrefix + route, {
            headers: { origin: previewOrigins[0], 'content-type': 'application/json' },
            body: '{'
        });

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.text).success).toBe(false);
        expect(response.getHeader('Access-Control-Allow-Origin')).toBe(previewOrigins[0]);
        expect(response.getHeader('Vary')).toBe('Origin');
        expect(createSourceTransport).not.toHaveBeenCalled();
    });

    test('keeps preview headers on a DIMSE transport failure', async () => {
        process.mockRejectedValueOnce(new Error('Association rejected.'));
        const response = await sendRequest(server, apiPrefix + 'cfind-studies', {
            headers: { origin: previewOrigins[1], 'content-type': 'application/json' }
        });

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.text).message).toBe('Association rejected.');
        expect(response.getHeader('Access-Control-Allow-Origin')).toBe(previewOrigins[1]);
    });

    test.each(['https://remote.example', 'null', 'http://127.0.0.1:5501', 'http://127.0.0.1:5500.evil.example'])
    ('does not grant a preflight from %s', async origin => {
        const response = await sendRequest(server, apiPrefix + 'cfind-studies', {
            method: 'OPTIONS',
            headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' }
        });

        expect(response.statusCode).toBe(403);
        expect(response.getHeader('Access-Control-Allow-Origin')).toBeUndefined();
        expect(response.getHeader('Access-Control-Allow-Methods')).toBeUndefined();
        expect(response.getHeader('Access-Control-Allow-Headers')).toBeUndefined();
        expect(pipelineBuilder).not.toHaveBeenCalled();
    });

    test.each([
        ['GET', 'content-type'],
        ['DELETE', 'content-type'],
        [undefined, 'content-type'],
        ['POST', 'authorization'],
        ['POST', 'content-type, x-custom-header']
    ])('does not grant unsupported method %s or headers %s', async (method, headers) => {
        const response = await sendRequest(server, apiPrefix + 'cfind-studies', {
            method: 'OPTIONS',
            headers: {
                origin: previewOrigins[0],
                'access-control-request-method': method,
                'access-control-request-headers': headers
            }
        });

        expect(response.statusCode).toBe(403);
        expect(response.getHeader('Access-Control-Allow-Origin')).toBeUndefined();
        expect(pipelineBuilder).not.toHaveBeenCalled();
    });

    test('accepts case-insensitive Content-Type on preflight', async () => {
        const response = await sendRequest(server, apiPrefix + 'cfind-studies', {
            method: 'OPTIONS',
            headers: {
                origin: previewOrigins[0],
                'access-control-request-method': 'POST',
                'access-control-request-headers': ' Content-Type '
            }
        });

        expect(response.statusCode).toBe(204);
        expect(response.getHeader('Access-Control-Allow-Origin')).toBe(previewOrigins[0]);
    });

    test.each([undefined, 'http://127.0.0.1:8080', 'https://remote.example'])
    ('does not change a regular query or grant CORS for origin %s', async origin => {
        const response = await sendRequest(server, apiPrefix + 'cfind-studies', {
            headers: { origin, 'content-type': 'application/json' }
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.text).success).toBe(true);
        expect(response.getHeader('Access-Control-Allow-Origin')).toBeUndefined();
        expect(process).toHaveBeenCalledTimes(1);
    });

    test('does not grant CORS on static files', async () => {
        const response = await sendRequest(server, '/easi-js/samples/kitchen-sink/index.htm', {
            method: 'GET',
            headers: { origin: previewOrigins[0] }
        });

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<!DOCTYPE html>');
        expect(response.getHeader('Access-Control-Allow-Origin')).toBeUndefined();
        expect(pipelineBuilder).not.toHaveBeenCalled();
    });

});
