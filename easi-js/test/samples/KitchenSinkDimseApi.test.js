import { postDimseRequest, resolveDimseRequestUrl } from '../../samples/kitchen-sink/dimse-api.js';
import { BlockedRunError } from '../../samples/kitchen-sink/run-feedback.js';

function jsonResponse(status, body) {
    return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function htmlResponse(status) {
    return { status, ok: status >= 200 && status < 300, json: async () => { throw new SyntaxError('Unexpected token <'); } };
}

describe('Kitchen Sink DIMSE API responses', () => {
    test.each([404, 405, 501, 200])('explains how to run the Node server for a non-JSON preview response (%s)', async status => {
        const request = jest.fn().mockResolvedValue(htmlResponse(status));
        const error = await postDimseRequest('/api/dimse/cfind-studies', {}, 'DIMSE C-FIND', request).catch(value => value);
        expect(error).toBeInstanceOf(BlockedRunError);
        expect(error.message).toContain('npm run kitchen-sink');
        expect(error.message).toContain('http://127.0.0.1:8080/easi-js/samples/kitchen-sink/index.htm#dimse');
    });

    test.each([404, 405, 500, 200])('preserves genuine JSON API failure messages (%s)', async status => {
        const request = jest.fn().mockResolvedValue(jsonResponse(status, { success: false, message: 'The peer rejected the association.' }));
        const error = await postDimseRequest('/api/dimse/cget-instance', {}, 'DIMSE C-GET', request).catch(value => value);
        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(BlockedRunError);
        expect(error.message).toBe('The peer rejected the association.');
    });

    test('retains the operation and HTTP status for other non-JSON HTTP failures', async () => {
        const request = jest.fn().mockResolvedValue(htmlResponse(503));
        await expect(postDimseRequest('/api/dimse/cmove-deidentify-relay', {}, 'DIMSE C-MOVE relay', request))
            .rejects.toThrow('DIMSE C-MOVE relay failed with HTTP 503.');
    });

    test('reports an unreachable configured backend with its exact URL and startup guidance without retrying', async () => {
        const url = 'http://127.0.0.1:18081/easi-js/samples/kitchen-sink/api/dimse/cget-instance';
        const request = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        const error = await postDimseRequest(url, {}, 'DIMSE C-GET', request).catch(value => value);
        expect(error).toBeInstanceOf(BlockedRunError);
        expect(error.message).toContain(url);
        expect(error.message).toContain('npm run kitchen-sink');
        expect(request).toHaveBeenCalledTimes(1);
    });
});

describe('Kitchen Sink DIMSE backend URLs', () => {
    const route = '/easi-js/samples/kitchen-sink/api/dimse/cfind-studies';

    test('keeps blank settings relative to the current server and supports configured origins and base paths', () => {
        expect(resolveDimseRequestUrl(route, '')).toBe(route);
        expect(resolveDimseRequestUrl(route, 'http://127.0.0.1:8080/')).toBe('http://127.0.0.1:8080' + route);
        expect(resolveDimseRequestUrl(route, 'https://example.test/relay/')).toBe('https://example.test/relay' + route);
    });

    test.each(['not a URL', 'file:///tmp', 'javascript:alert(1)', 'http://127.0.0.1:8080/?query=1', 'http://127.0.0.1:8080/#fragment', 'http://user:password@example.test'])('blocks invalid backend settings: %s', base => {
        expect(() => resolveDimseRequestUrl(route, base)).toThrow(BlockedRunError);
    });
});
