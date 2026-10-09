import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { build } from "esbuild";
import { validatePackageManifest } from "./packageManifest.js";
import { probeBrowser } from "./browserProbe.js";

var execute = promisify(execFile);
var toolDirectory = fileURLToPath(new URL(".", import.meta.url));
var packageDirectory = resolve(toolDirectory, "../..");
var options = new Set(process.argv.slice(2));
for (var argument of options) {
    if (["--browser", "--keep-temp"].includes(argument) == false)
        throw new Error(`Unknown option: ${argument}`);
}
var temporaryDirectory = await mkdtemp(join(tmpdir(), "easi-package-check-"));
var consumerDirectory = join(temporaryDirectory, "consumer");
var npm = process.platform === "win32" ? "npm.cmd" : "npm";

async function command(executable, args, cwd, env = process.env) {
    try {
        return await execute(executable, args, {
            cwd, env: { ...env, npm_config_cache: join(temporaryDirectory, "npm-cache") },
            maxBuffer: 20 * 1024 * 1024, timeout: 120000
        });
    }
    catch (error) {
        throw new Error(`${executable} ${args.join(" ")} failed:\n${error.stderr || error.stdout || error.message}`);
    }
}

try {
    var packageJson = JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8"));
    var packed = JSON.parse((await command(npm,
        ["pack", "--json", "--ignore-scripts", "--pack-destination", temporaryDirectory], packageDirectory)).stdout)[0];
    var inventory = validatePackageManifest(packageJson, packed);
    console.log(`Package inventory passed: ${inventory.files} files, ${inventory.packedBytes} packed bytes.`);

    await mkdir(consumerDirectory);
    await cp(join(toolDirectory, "consumerNode.mjs"), join(consumerDirectory, "consumerNode.mjs"));
    for (var file of ["consumerBrowser.js", "smokeWorkflows.js"])
        await cp(join(toolDirectory, file), join(consumerDirectory, file));
    await writeFile(join(consumerDirectory, "package.json"), JSON.stringify({
        name: "easi-package-test-consumer", private: true, type: "module"
    }, null, 2));
    await command(npm, ["install", join(temporaryDirectory, packed.filename),
        "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false"], consumerDirectory);
    var node = JSON.parse((await command(process.execPath, ["consumerNode.mjs"], consumerDirectory, {
        ...process.env, EASI_PACKAGE_NAME: packageJson.name,
        EASI_PACKAGE_SUBPATHS: JSON.stringify(inventory.publicSubpaths)
    })).stdout.trim());
    console.log(`Clean Node consumer passed: ${node.imports} public imports and synthetic read/write/selection/FHIR workflows.`);

    var bundle = await build({
        absWorkingDir: consumerDirectory,
        entryPoints: ["consumerBrowser.js"],
        outfile: join(consumerDirectory, "browser.js"),
        bundle: true, platform: "browser", format: "esm", target: "es2022",
        metafile: true, logLevel: "silent"
    });
    var output = Object.values(bundle.metafile.outputs);
    var unresolved = output.flatMap((file) => file.imports).filter((item) => item.external);
    if (unresolved.some((item) => /^(node:|fs$|net$|tls$|path$|zlib$|events$)/.test(item.path)))
        throw new Error(`Browser bundle contains Node imports: ${JSON.stringify(unresolved)}`);
    await writeFile(join(consumerDirectory, "browser.html"),
        '<!doctype html><html><meta charset="utf-8"><title>EASI packed consumer</title>' +
        '<link rel="icon" href="data:,"><body><pre id="result">Running synthetic package workflows…</pre>' +
        '<script type="module" src="/browser.js"></script></body></html>');
    console.log(`Clean browser bundle passed: ${output.reduce((size, file) => size + file.bytes, 0)} bytes, no Node builtin imports.`);
    var nodeImportRejected = false;
    try {
        await build({
            absWorkingDir: consumerDirectory,
            stdin: { contents: `import * as dimse from '${packageJson.name}/dimse/node'; console.log(dimse);`,
                resolveDir: consumerDirectory, sourcefile: "node-only-browser-probe.js" },
            bundle: true, platform: "browser", format: "esm", write: false, logLevel: "silent"
        });
    }
    catch (error) {
        var notes = (error.errors || []).flatMap((item) => item.notes || []).map((note) => note.text).join("\n");
        nodeImportRejected = /The path "\.\/dimse\/node" is not currently exported/.test(notes);
        if (nodeImportRejected == false)
            throw error;
    }
    if (nodeImportRejected == false)
        throw new Error("Node DIMSE entry must be unavailable under browser export conditions.");
    console.log("Node-only DIMSE export correctly rejects browser bundling.");
    var browser = options.has("--browser") ? await probeBrowser(consumerDirectory) : null;
    if (browser != null)
        console.log("Actual browser consumer passed: public imports and synthetic read/write/selection/FHIR workflows.");
    console.log(JSON.stringify({ inventory, node, browserBundle: true, nodeImportRejected, browser }, null, 2));
    if (options.has("--keep-temp"))
        console.log(`Retained packed artifact and clean consumer: ${temporaryDirectory}`);
}
finally {
    if (options.has("--keep-temp") == false)
        await rm(temporaryDirectory, { recursive: true, force: true });
}
