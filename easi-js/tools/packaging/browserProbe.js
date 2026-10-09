import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** Optional actual-browser smoke; the default package check only requires Node. */
export async function probeBrowser(consumerDirectory, executable = process.env.EASI_BROWSER_BIN) {
    if (executable == null) {
        executable = process.platform === "darwin" ?
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "chromium";
    }
    if (executable.includes("/"))
        await access(executable);

    var server = createServer(async (request, response) => {
        var files = {
            "/": ["browser.html", "text/html"],
            "/browser.js": ["browser.js", "text/javascript"],
            "/browser.js.map": ["browser.js.map", "application/json"]
        };
        var file = files[request.url];
        if (file == null) {
            response.writeHead(404).end();
            return;
        }
        try {
            var bytes = await readFile(join(consumerDirectory, file[0]));
            response.writeHead(200, { "Content-Type": file[1] });
            response.end(bytes);
        }
        catch {
            response.writeHead(500).end();
        }
    });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });

    var profile = join(consumerDirectory, "isolated-browser-profile");
    var browser = spawn(executable, ["--headless=new", "--disable-gpu", "--disable-background-networking", "--no-first-run",
        "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
        { stdio: "ignore" });
    var browserError;
    browser.on("error", (error) => { browserError = error; });
    var socket;
    var pending = new Map();
    var exceptions = [];
    var sequence = 0;

    try {
        var port;
        for (var attempt = 0; attempt < 100; attempt++) {
            if (browserError != null)
                throw browserError;
            if (browser.exitCode != null || browser.signalCode != null)
                throw new Error(`Browser exited before debugging became available (${browser.exitCode}).`);
            try {
                port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]);
                break;
            }
            catch {
                await delay(100);
            }
        }
        if (port == null)
            throw new Error("Browser debugging did not start within ten seconds.");
        var targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        var target = targets.find((item) => item.type === "page");
        socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            socket.addEventListener("open", resolve, { once: true });
            socket.addEventListener("error", reject, { once: true });
        });

        function send(method, params = {}) {
            var id = ++sequence;
            return new Promise((resolve, reject) => {
                var timeout = setTimeout(() => {
                    pending.delete(id);
                    reject(new Error(`Browser command ${method} timed out.`));
                }, 10000);
                pending.set(id, { resolve, reject, timeout });
                socket.send(JSON.stringify({ id, method, params }));
            });
        }
        socket.addEventListener("message", (event) => {
            var message = JSON.parse(event.data);
            var request = pending.get(message.id);
            if (request != null) {
                clearTimeout(request.timeout);
                pending.delete(message.id);
                if (message.error != null)
                    request.reject(new Error(message.error.message));
                else
                    request.resolve(message.result);
            }
            else if (message.method === "Runtime.exceptionThrown") {
                exceptions.push(message.params.exceptionDetails);
            }
        });
        await send("Runtime.enable");
        await send("Page.enable");
        await send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/` });
        var report;
        for (var iteration = 0; iteration < 150; iteration++) {
            var evaluation = await send("Runtime.evaluate", {
                expression: "globalThis.__easiPackagingSmoke || null", returnByValue: true
            });
            report = evaluation.result?.value;
            if (report != null)
                break;
            if (exceptions.length > 0)
                throw new Error(`Browser module failed: ${JSON.stringify(exceptions)}`);
            await delay(100);
        }
        if (report?.ok !== true)
            throw new Error(`Packaged browser consumer failed: ${report?.error || "No result within fifteen seconds."}`);
        if (exceptions.length > 0)
            throw new Error(`Browser raised unexpected exceptions: ${JSON.stringify(exceptions)}`);
        return report;
    }
    finally {
        for (var request of pending.values())
            clearTimeout(request.timeout);
        socket?.close();
        if (browser.exitCode == null && browser.signalCode == null && browser.pid != null) {
            browser.kill("SIGTERM");
            for (var wait = 0; wait < 50 && browser.exitCode == null && browser.signalCode == null; wait++)
                await delay(100);
            if (browser.exitCode == null && browser.signalCode == null)
                browser.kill("SIGKILL");
        }
        await new Promise((resolve) => server.close(resolve));
    }
}
