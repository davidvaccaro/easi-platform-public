import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';

function normalizeString(value, fallback = null) {

    if (value == null)
        return fallback;

    var text = String(value).trim();
    if (text.length == 0)
        return fallback;

    return text;

}

function normalizeBoolean(value, fallback = false) {

    if (value == null)
        return fallback;

    if (typeof value === 'boolean')
        return value;

    var normalized = String(value).trim().toLowerCase();
    if ((normalized == '1') || (normalized == 'true') || (normalized == 'yes') || (normalized == 'on'))
        return true;
    if ((normalized == '0') || (normalized == 'false') || (normalized == 'no') || (normalized == 'off'))
        return false;

    return fallback;

}

function normalizeInteger(value, fallback, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {

    var numeric = Number(value);
    if (Number.isFinite(numeric) == false)
        return fallback;

    var integer = Math.trunc(numeric);
    if ((integer < min) || (integer > max))
        return fallback;

    return integer;

}

function sanitizePathSegment(value, fallback = 'unknown') {

    var normalized = String(value ?? fallback)
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .trim();

    if (normalized.length == 0)
        return fallback;

    return normalized;

}

function padNumber(value, width = 4) {
    return String(value).padStart(width, '0');
}

function extensionFromFrame(frame = null) {

    var mimeType = String(frame?.mimeType ?? '').toLowerCase();
    if (mimeType.includes('png') == true)
        return 'png';
    if (mimeType.includes('jpeg') == true)
        return 'jpg';
    if (mimeType.includes('jpg') == true)
        return 'jpg';
    if (mimeType.includes('tiff') == true)
        return 'tiff';
    if (mimeType.includes('webp') == true)
        return 'webp';

    var encoding = String(frame?.encoding ?? '').toLowerCase();
    if (encoding == 'png')
        return 'png';
    if ((encoding == 'jpeg') || (encoding == 'jpg'))
        return 'jpg';
    if ((encoding == 'tiff') || (encoding == 'tif'))
        return 'tiff';
    if (encoding == 'webp')
        return 'webp';

    return 'bin';

}

function mimeTypeFromExtension(extension = '') {

    var normalized = String(extension).toLowerCase();
    if (normalized == 'png')
        return 'image/png';
    if ((normalized == 'jpg') || (normalized == 'jpeg'))
        return 'image/jpeg';
    if ((normalized == 'tiff') || (normalized == 'tif'))
        return 'image/tiff';
    if (normalized == 'webp')
        return 'image/webp';
    if (normalized == 'json')
        return 'application/json; charset=utf-8';
    if (normalized == 'html')
        return 'text/html; charset=utf-8';

    return 'application/octet-stream';

}

function toJson(value) {
    return JSON.stringify(value, null, 2);
}

function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    }
    catch (_error) {
        return null;
    }
}

function normalizeEventSummary(record) {

    return {
        id: record.id,
        receivedAt: record.receivedAt,
        eventType: record.eventType,
        bridgeId: record.bridgeId,
        instanceUID: record.instanceUID,
        studyInstanceUid: record.studyInstanceUid,
        seriesInstanceUid: record.seriesInstanceUid,
        frameIndex: record.frameIndex,
        frameWidth: record.frameWidth,
        frameHeight: record.frameHeight,
        frameMimeType: record.frameMimeType,
        frameEncoding: record.frameEncoding,
        frameBytes: record.frameBytes,
        heuristicReason: record.heuristicReason,
        heuristicMotionScore: record.heuristicMotionScore,
        assetUrl: record.assetUrl,
        eventUrl: `/api/events/${record.id}`
    };

}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockCloudServer {

    get eventCount() {
        return this.events.length;
    }

    get baseUrl() {

        if ((this.server == null) || (this.listener == null))
            return null;

        return `http://${this.config.host}:${this.listener.port}`;

    }

    get dashboardUrl() {

        var baseUrl = this.baseUrl;
        if (baseUrl == null)
            return null;

        return `${baseUrl}/`;

    }

    async ensureDirectories() {

        await fs.mkdir(this.config.outputDirectory, { recursive: true });
        await fs.mkdir(this.eventDirectory, { recursive: true });
        await fs.mkdir(this.assetDirectory, { recursive: true });

    }

    async start() {

        if (this.server != null)
            return this.listener;

        await this.ensureDirectories();

        this.server = http.createServer((request, response) => {
            this.handleRequest(request, response).catch((error) => {
                this.log(`request failed: ${error?.message ?? String(error)}`);
                this.sendJson(response, 500, {
                    ok: false,
                    error: error?.message ?? 'Internal Server Error'
                });
            });
        });

        await new Promise((resolve, reject) => {
            this.server.once('error', reject);
            this.server.listen(this.config.port, this.config.host, () => {
                this.server.removeListener('error', reject);
                resolve();
            });
        });

        var address = this.server.address();
        this.listener = {
            host: this.config.host,
            port: Number(address?.port ?? this.config.port)
        };

        this.log(`listening on ${this.listener.host}:${this.listener.port}`);
        this.log(`dashboard ${this.dashboardUrl}`);

        return this.listener;

    }

    async stop() {

        if (this.server == null)
            return;

        await new Promise((resolve) => {
            this.server.close(() => resolve());
        });

        this.server = null;
        this.listener = null;
        this.resolveWaiters();

    }

    log(message) {

        if (this.config.verbose != true)
            return;

        console.log(`[MockCloud] ${message}`);

    }

    resolveWaiters() {

        if (this.waiters.length == 0)
            return;

        for (var index = 0; index < this.waiters.length; index++) {
            var waiter = this.waiters[index];
            waiter.resolve();
        }

        this.waiters = [];

    }

    async waitForEventCount(minCount, timeoutMs = 10000) {

        if (this.eventCount >= minCount)
            return this.eventCount;

        var start = Date.now();

        while ((Date.now() - start) <= timeoutMs) {

            await new Promise((resolve) => {
                this.waiters.push({ resolve });
                setTimeout(resolve, 100);
            });

            if (this.eventCount >= minCount)
                return this.eventCount;

        }

        throw new Error(`Timed out waiting for mock-cloud event count >= ${minCount}. Current count=${this.eventCount}.`);

    }

    sendJson(response, statusCode, payload) {

        if (response.writableEnded == true)
            return;

        var body = JSON.stringify(payload);
        response.writeHead(statusCode, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(body)
        });
        response.end(body);

    }

    sendText(response, statusCode, text, contentType = 'text/plain; charset=utf-8') {

        if (response.writableEnded == true)
            return;

        response.writeHead(statusCode, {
            'Content-Type': contentType,
            'Content-Length': Buffer.byteLength(text)
        });
        response.end(text);

    }

    async readRequestBody(request) {

        var maxBodyBytes = this.config.maxBodyBytes;

        return await new Promise((resolve, reject) => {

            var chunks = [];
            var total = 0;

            request.on('data', (chunk) => {
                total += chunk.length;
                if (total > maxBodyBytes) {
                    reject(new Error(`Request body exceeds max size (${maxBodyBytes} bytes).`));
                    request.destroy();
                    return;
                }

                chunks.push(chunk);
            });

            request.on('end', () => {
                resolve(Buffer.concat(chunks));
            });

            request.on('error', (error) => {
                reject(error);
            });

        });

    }

    async readJsonBody(request) {

        var body = await this.readRequestBody(request);
        if (body.length == 0)
            return {};

        var parsed = safeJsonParse(body.toString('utf-8'));
        if (parsed == null)
            throw new Error('Invalid JSON request body.');

        return parsed;

    }

    async writeEventArtifacts(payload, record) {

        var payloadPath = path.join(this.eventDirectory, `event-${padNumber(record.id, 6)}.json`);
        await fs.writeFile(payloadPath, toJson(payload));

        if (record.frameBytes <= 0)
            return;

        var frameBytesBase64 = payload?.frame?.bytesBase64;
        if (typeof frameBytesBase64 !== 'string')
            return;

        var frameBytes = Buffer.from(frameBytesBase64, 'base64');
        var assetPath = path.join(this.assetDirectory, record.assetFileName);
        await fs.writeFile(assetPath, frameBytes);

    }

    createEventRecord(payload, request = null) {

        var metadata = payload?.metadata ?? {};
        var frame = payload?.frame ?? {};
        var heuristic = payload?.heuristic ?? {};
        var frameBytesBase64 = normalizeString(frame.bytesBase64, null);

        var frameIndex = normalizeInteger(frame.index, 0, 0);
        var frameWidth = normalizeInteger(frame.width, 0, 0);
        var frameHeight = normalizeInteger(frame.height, 0, 0);

        var frameBytes = 0;
        if (frameBytesBase64 != null) {
            frameBytes = Buffer.from(frameBytesBase64, 'base64').length;
        }

        var extension = extensionFromFrame(frame);
        var assetFileName = `event-${padNumber(this.nextEventId, 6)}-frame-${padNumber(frameIndex, 4)}.${extension}`;

        return {
            id: this.nextEventId,
            receivedAt: (new Date()).toISOString(),
            eventType: normalizeString(payload?.eventType, 'image-bridge.unknown'),
            bridgeId: normalizeString(payload?.bridgeId, null),
            instanceUID: normalizeString(payload?.instanceUID, null),
            studyInstanceUid: normalizeString(metadata?.studyInstanceUid, null),
            seriesInstanceUid: normalizeString(metadata?.seriesInstanceUid, null),
            frameIndex,
            frameWidth,
            frameHeight,
            frameEncoding: normalizeString(frame?.encoding, null),
            frameMimeType: normalizeString(frame?.mimeType, mimeTypeFromExtension(extension)),
            frameBytes,
            heuristicReason: normalizeString(heuristic?.reason, null),
            heuristicMotionScore: Number(heuristic?.motionScore ?? 0),
            assetFileName,
            assetUrl: `/assets/${assetFileName}`,
            remoteAddress: normalizeString(request?.socket?.remoteAddress, null)
        };

    }

    async acceptEvent(payload, request = null) {

        var record = this.createEventRecord(payload, request);
        await this.writeEventArtifacts(payload, record);

        this.events.push(record);
        this.nextEventId += 1;
        this.resolveWaiters();

        this.log(`event #${record.id} received type=${record.eventType} instance=${record.instanceUID ?? 'n/a'} frame=${record.frameIndex}`);

        return record;

    }

    async serveAsset(response, assetName) {

        var sanitizedName = sanitizePathSegment(assetName, null);
        if (sanitizedName == null) {
            this.sendJson(response, 400, { ok: false, error: 'Invalid asset path.' });
            return;
        }

        var filePath = path.join(this.assetDirectory, sanitizedName);

        try {
            var bytes = await fs.readFile(filePath);
            var extension = path.extname(filePath).replace('.', '');
            response.writeHead(200, {
                'Content-Type': mimeTypeFromExtension(extension),
                'Content-Length': bytes.length
            });
            response.end(bytes);
        }
        catch (_error) {
            this.sendJson(response, 404, { ok: false, error: 'Asset not found.' });
        }

    }

    async serveEventDetail(response, idText) {

        var id = normalizeInteger(idText, null, 1, Number.MAX_SAFE_INTEGER);
        if (id == null) {
            this.sendJson(response, 400, { ok: false, error: 'Invalid event ID.' });
            return;
        }

        var record = this.events.find((item) => item.id == id);
        if (record == null) {
            this.sendJson(response, 404, { ok: false, error: 'Event not found.' });
            return;
        }

        var payloadPath = path.join(this.eventDirectory, `event-${padNumber(record.id, 6)}.json`);

        var payload = null;
        try {
            var payloadText = await fs.readFile(payloadPath, 'utf-8');
            payload = safeJsonParse(payloadText);
        }
        catch (_error) {
            payload = null;
        }

        this.sendJson(response, 200, {
            ok: true,
            event: normalizeEventSummary(record),
            payload
        });

    }

    renderDashboardHtml() {

        return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ImageBridge Mock Cloud</title>
<style>
:root {
    --bg: #f5f5ef;
    --ink: #212529;
    --muted: #5c6167;
    --accent: #0b7285;
    --card: #ffffff;
    --border: #d7dde4;
}
body {
    margin: 0;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    background: radial-gradient(circle at 10% 10%, #ffffff, var(--bg));
    color: var(--ink);
}
header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background: #ffffff;
    position: sticky;
    top: 0;
}
header h1 {
    margin: 0;
    font-size: 1.2rem;
}
header .meta {
    margin-top: 0.4rem;
    color: var(--muted);
    font-size: 0.9rem;
}
main {
    padding: 1rem;
}
#eventCount {
    font-weight: 600;
    color: var(--accent);
}
.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 0.9rem;
}
.card {
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 0.8rem;
    background: var(--card);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.card h2 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
}
.card img {
    width: 100%;
    height: auto;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: #f8f9fa;
}
.row {
    font-size: 0.85rem;
    margin: 0.2rem 0;
    word-break: break-word;
}
.label {
    color: var(--muted);
}
.empty {
    color: var(--muted);
    border: 1px dashed var(--border);
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
}
</style>
</head>
<body>
<header>
    <h1>ImageBridge Mock Cloud Dashboard</h1>
    <div class="meta">
        Received Events: <span id="eventCount">0</span> |
        Polling every 1s |
        Endpoint: <code>/image-bridge/events</code>
    </div>
</header>
<main>
    <div id="events" class="grid"></div>
</main>
<script>
async function refreshEvents() {
    var response = await fetch('/api/events');
    var payload = await response.json();

    var events = Array.isArray(payload.events) ? payload.events : [];
    document.getElementById('eventCount').textContent = String(events.length);

    var host = document.getElementById('events');
    host.innerHTML = '';

    if (events.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No events yet. Send C-STORE to ImageBridge to watch assets appear here.';
        host.appendChild(empty);
        return;
    }

    for (var i = 0; i < events.length; i++) {
        var event = events[i];

        var card = document.createElement('article');
        card.className = 'card';

        var title = document.createElement('h2');
        title.textContent = 'Event #' + event.id + ' | Frame ' + event.frameIndex;
        card.appendChild(title);

        if (event.assetUrl && event.frameMimeType && event.frameMimeType.indexOf('image/') === 0) {
            var img = document.createElement('img');
            img.src = event.assetUrl;
            img.loading = 'lazy';
            img.alt = 'Frame ' + event.frameIndex;
            card.appendChild(img);
        }

        function addRow(label, value) {
            var row = document.createElement('div');
            row.className = 'row';
            var prefix = document.createElement('span');
            prefix.className = 'label';
            prefix.textContent = label + ': ';
            row.appendChild(prefix);
            row.appendChild(document.createTextNode(value == null ? 'n/a' : String(value)));
            card.appendChild(row);
        }

        addRow('Time', event.receivedAt);
        addRow('Event Type', event.eventType);
        addRow('Instance UID', event.instanceUID);
        addRow('Frame', event.frameWidth + 'x' + event.frameHeight + ' ' + (event.frameMimeType || ''));
        addRow('Heuristic', event.heuristicReason + ' (motion=' + event.heuristicMotionScore + ')');

        var linkRow = document.createElement('div');
        linkRow.className = 'row';
        var link = document.createElement('a');
        link.href = event.eventUrl;
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        link.textContent = 'View Full Event JSON';
        linkRow.appendChild(link);
        card.appendChild(linkRow);

        host.appendChild(card);
    }
}

refreshEvents().catch(console.error);
setInterval(function() {
    refreshEvents().catch(console.error);
}, 1000);
</script>
</body>
</html>`;

    }

    async handleRequest(request, response) {

        var method = String(request.method ?? 'GET').toUpperCase();
        var url = new URL(request.url ?? '/', `http://${request.headers.host || 'localhost'}`);
        var pathname = url.pathname;

        if ((method == 'GET') && (pathname == '/')) {
            this.sendText(response, 200, this.renderDashboardHtml(), 'text/html; charset=utf-8');
            return;
        }

        if ((method == 'GET') && (pathname == '/api/health')) {
            this.sendJson(response, 200, {
                ok: true,
                service: 'ImageBridgeMockCloud',
                eventCount: this.eventCount,
                dashboardUrl: this.dashboardUrl
            });
            return;
        }

        if ((method == 'GET') && (pathname == '/api/events')) {
            var events = this.events
                .slice()
                .reverse()
                .map((item) => normalizeEventSummary(item));

            this.sendJson(response, 200, {
                ok: true,
                count: events.length,
                events
            });
            return;
        }

        if ((method == 'GET') && (pathname.startsWith('/api/events/'))) {
            var idText = pathname.substring('/api/events/'.length);
            await this.serveEventDetail(response, idText);
            return;
        }

        if ((method == 'GET') && (pathname.startsWith('/assets/'))) {
            var assetName = pathname.substring('/assets/'.length);
            await this.serveAsset(response, assetName);
            return;
        }

        if ((method == 'POST') && (pathname == '/image-bridge/events')) {

            var payload = await this.readJsonBody(request);
            var record = await this.acceptEvent(payload, request);

            this.sendJson(response, 202, {
                ok: true,
                eventId: record.id,
                eventCount: this.eventCount,
                eventUrl: `/api/events/${record.id}`,
                assetUrl: record.assetUrl
            });

            return;

        }

        this.sendJson(response, 404, {
            ok: false,
            error: 'Not found.'
        });

    }

    constructor(config = null) {

        this.config = config ?? createMockCloudServerConfigFromEnvironment();

        this.eventDirectory = path.join(this.config.outputDirectory, 'events');
        this.assetDirectory = path.join(this.config.outputDirectory, 'assets');

        this.server = null;
        this.listener = null;

        this.events = [];
        this.nextEventId = 1;
        this.waiters = [];

    }

}

export function createMockCloudServerConfigFromEnvironment(env = process.env, cwd = process.cwd()) {

    return {
        host: normalizeString(env.IMAGE_BRIDGE_MOCK_CLOUD_HOST, '127.0.0.1'),
        port: normalizeInteger(env.IMAGE_BRIDGE_MOCK_CLOUD_PORT, 18080, 0, 65535),
        maxBodyBytes: normalizeInteger(env.IMAGE_BRIDGE_MOCK_CLOUD_MAX_BODY_BYTES, (64 * 1024 * 1024), 1024, (1024 * 1024 * 1024)),
        outputDirectory: path.resolve(cwd, normalizeString(env.IMAGE_BRIDGE_MOCK_CLOUD_OUTPUT_DIR, 'test/output/pocs/imagebridge/mock-cloud')),
        verbose: normalizeBoolean(env.IMAGE_BRIDGE_MOCK_CLOUD_VERBOSE, true)
    };

}

export function createMockCloudServer(config = null) {

    var resolved = config ?? createMockCloudServerConfigFromEnvironment();
    return new MockCloudServer(resolved);

}

export async function runMockCloudServer(config = null) {

    var server = createMockCloudServer(config);
    await server.start();

    var stopping = false;
    var shutdown = async (signal) => {

        if (stopping == true)
            return;

        stopping = true;
        console.log(`[MockCloud] Received ${signal}; shutting down...`);

        try {
            await server.stop();
        }
        finally {
            process.exitCode = 0;
            process.exit();
        }

    };

    process.once('SIGINT', () => {
        shutdown('SIGINT');
    });

    process.once('SIGTERM', () => {
        shutdown('SIGTERM');
    });

    while (true) {
        await delay(60000);
    }

}

function isDirectExecution(argv = process.argv) {

    var entry = normalizeString(argv?.[1], null);
    if (entry == null)
        return false;

    return (path.basename(entry).toLowerCase() == 'mockcloudserver.js');

}

if (isDirectExecution(process.argv) == true) {
    runMockCloudServer().catch((error) => {
        console.error(`[MockCloud] Fatal error: ${error?.stack ?? error?.message ?? String(error)}`);
        process.exitCode = 1;
    });
}
