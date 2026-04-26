import { createReadStream, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);
const CURRENT_DIR_PATH = dirname(CURRENT_FILE_PATH);
const ROOT = resolve(CURRENT_DIR_PATH, "../../..");
const DEFAULT_ENTRY = "/apps/showcase/src/index.html";
const PORT = Number(process.env.EASI_UI_PORT || 4173);
const HOST = process.env.EASI_UI_HOST || "127.0.0.1";

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg"
};

function resolvePath(urlPath) {
    const pathname = decodeURIComponent((urlPath || "/").split("?")[0]);
    const requestPath = pathname === "/" ? DEFAULT_ENTRY : pathname;
    const normalizedPath = normalize(requestPath).replace(/^\/+/, "");
    const absolutePath = resolve(join(ROOT, normalizedPath));

    if (!absolutePath.startsWith(ROOT)) {
        return null;
    }

    return absolutePath;
}

const server = createServer((request, response) => {
    const filePath = resolvePath(request.url || "/");

    if (!filePath) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
    }

    try {
        const fileStat = statSync(filePath);

        if (fileStat.isDirectory()) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not found");
            return;
        }

        const contentType = MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
        response.writeHead(200, {
            "Content-Type": contentType,
            "Cache-Control": "no-cache"
        });

        createReadStream(filePath).pipe(response);
    }
    catch (error) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
    }
});

server.listen(PORT, HOST, () => {
    console.log(`EASI UI showcase running at http://${HOST}:${PORT}/`);
    console.log("Open /apps/showcase/src/index.html if your browser does not auto-load the showcase entry.");
});
