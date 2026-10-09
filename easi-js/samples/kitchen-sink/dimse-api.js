import { BlockedRunError } from './run-feedback.js';

export function resolveDimseRequestUrl(url, backendUrl = '') {
    const base = String(backendUrl ?? '').trim();
    if (!base)
        return url;

    let parsed;
    try { parsed = new URL(base); }
    catch { throw new BlockedRunError('Enter a valid HTTP or HTTPS Kitchen Sink server URL, or leave it blank to use this page’s server.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.search || parsed.hash || parsed.username || parsed.password)
        throw new BlockedRunError('The Kitchen Sink server URL must use HTTP or HTTPS and have no query, fragment, or credentials.');
    return parsed.href.replace(/\/+$/, '') + url;
}

export async function postDimseRequest(url, payload, operation, request = globalThis.fetch) {
    const target = url.startsWith('/') && globalThis.location?.origin ? new URL(url, globalThis.location.origin).href : url;
    let response;
    try {
        response = await request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }
    catch (error) {
        if (error?.name === 'AbortError')
            throw error;
        throw new BlockedRunError(
            'Cannot reach the DIMSE backend at ' + target + '. From the easi-js folder, run npm run kitchen-sink, '
            + 'then check the Kitchen Sink server URL field (normally http://127.0.0.1:8080).'
        );
    }

    let body;
    try {
        body = await response.json();
    }
    catch {
        if (response.ok || [404, 405, 501].includes(response.status)) {
            throw new BlockedRunError(
                'The server at ' + target + ' cannot serve DIMSE requests. From the easi-js folder, run npm run kitchen-sink, '
                + 'then open http://127.0.0.1:8080/easi-js/samples/kitchen-sink/index.htm#dimse.'
            );
        }
        throw new Error(operation + ' failed with HTTP ' + response.status + '.');
    }

    if (!response.ok || body?.success !== true)
        throw new Error(body?.message ?? (operation + ' failed with HTTP ' + response.status + '.'));

    return body;
}
