import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repositoryRoot = path.resolve(__dirname, '../../..');
const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 8080);

const defaultPagePath = '/easi-js/samples/kitchen-sink/index.htm';

const mimeTypes = {
    '.htm': 'text/html; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.dcm': 'application/dicom',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json; charset=utf-8'
};

function normalizeRequestPath(requestUrl) {

    const url = new URL(requestUrl, `http://${host}:${port}`);
    let pathname = decodeURIComponent(url.pathname);

    if (
        (pathname === '/')
        || (pathname === '/easi-js')
        || (pathname === '/easi-js/')
        || (pathname === '/easi-js/samples')
        || (pathname === '/easi-js/samples/')
        || (pathname === '/easi-js/samples/kitchen-sink')
        || (pathname === '/easi-js/samples/kitchen-sink/')
    ) {
        pathname = defaultPagePath;
    }

    return pathname;

}

function resolveFilePath(pathname) {

    const localPath = path.normalize(path.join(repositoryRoot, pathname));
    if (localPath.startsWith(repositoryRoot) === false)
        return null;

    return localPath;

}

async function serveRequest(request, response) {

    try {

        const pathname = normalizeRequestPath(request.url ?? '/');
        let filePath = resolveFilePath(pathname);

        if (filePath == null) {
            response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('Forbidden');
            return;
        }

        let stat = null;

        try {
            stat = await fs.stat(filePath);
        }
        catch {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('Not Found');
            return;
        }

        if (stat.isDirectory()) {
            filePath = path.join(filePath, 'index.htm');
            try {
                stat = await fs.stat(filePath);
            }
            catch {
                response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                response.end('Not Found');
                return;
            }
        }

        const extension = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[extension] ?? 'application/octet-stream';

        response.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stat.size
        });

        createReadStream(filePath).pipe(response);

    }
    catch (error) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end(`Server Error: ${error?.message ?? 'Unknown error'}`);
    }

}

const server = http.createServer((request, response) => {
    void serveRequest(request, response);
});

server.listen(port, host, () => {
    console.log(`Kitchen sink server listening on http://${host}:${port}${defaultPagePath}`);
});

