import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { validatePackageManifest } from "./packageManifest.js";

var execute = promisify(execFile);
var packageDirectory = fileURLToPath(new URL("../../", import.meta.url));
var options = new Set(process.argv.slice(2));
if ([...options].some((option) => option !== "--keep-temp"))
    throw new Error("Usage: node tools/packaging/checkReadme.js [--keep-temp]");
var temporaryDirectory = await mkdtemp(join(tmpdir(), "easi-readme-check-"));
var consumerDirectory = join(temporaryDirectory, "consumer");
var npm = process.platform === "win32" ? "npm.cmd" : "npm";

async function command(executable, args, cwd, timeout = 120000) {
    try {
        return await execute(executable, args, {
            cwd, env: { ...process.env, npm_config_cache: join(temporaryDirectory, "npm-cache") },
            maxBuffer: 10 * 1024 * 1024, timeout
        });
    }
    catch (error) {
        throw new Error(`${executable} ${args.join(" ")} failed:\n${error.stderr || error.stdout || error.message}`);
    }
}

function extractExamples(readme) {
    var markers = [...readme.matchAll(/<!--\s*easi-example:\s*([^>]*?)\s*-->/g)];
    var examples = [...readme.matchAll(/<!--\s*easi-example:\s*([a-z][a-z0-9-]*)\s*-->\s*\n```(?:js|javascript)\s*\n([\s\S]*?)\n```/g)].
        map((match) => ({ name: match[1], source: match[2] }));
    if (examples.length === 0 || examples.length !== markers.length)
        throw new Error("Every easi-example marker must directly precede a js/javascript fence; at least one runnable example is required.");
    if (new Set(examples.map((example) => example.name)).size !== examples.length)
        throw new Error("Runnable README example names must be unique.");
    return examples;
}

async function checkLocalLinks(readme, installedDirectory) {
    var prose = readme.replace(/```[^\n]*\n[\s\S]*?\n```|~~~[^\n]*\n[\s\S]*?\n~~~/g, "").replace(/`[^`\n]*`/g, "");
    var targets = [...prose.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^"']*["'])?\s*\)/g)].
        map((match) => match[1] || match[2]);
    targets.push(...[...prose.matchAll(/^\s*\[[^\]]+\]:\s*(?:<([^>]+)>|([^\s]+))/gm)].
        map((match) => match[1] || match[2]));
    var localTargets = [...new Set(targets)].filter((target) =>
        /^[a-z][a-z0-9+.-]*:/i.test(target) === false && target.startsWith("//") === false);
    var checked = 0;
    for (var target of localTargets) {
        var path = decodeURIComponent(target.split(/[?#]/)[0]);
        if (path.length === 0)
            continue;
        var destination = resolve(installedDirectory, path);
        var localPath = relative(installedDirectory, destination);
        if (localPath.startsWith("..") || path.startsWith("/"))
            throw new Error(`README link leaves the installed package: ${target}`);
        try {
            await access(destination);
        }
        catch {
            throw new Error(`README contains a missing installed-package link: ${target}`);
        }
        checked++;
    }
    return checked;
}

try {
    var readmeBytes = await readFile(join(packageDirectory, "README.md"));
    var readme = readmeBytes.toString("utf8");
    var examples = extractExamples(readme);
    var packageJson = JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8"));
    var packed = JSON.parse((await command(npm, ["pack", "--json", "--ignore-scripts",
        "--pack-destination", temporaryDirectory], packageDirectory)).stdout)[0];
    var inventory = validatePackageManifest(packageJson, packed);
    await mkdir(consumerDirectory);
    await writeFile(join(consumerDirectory, "package.json"), JSON.stringify({
        name: "easi-readme-test-consumer", private: true, type: "module"
    }));
    await command(npm, ["install", join(temporaryDirectory, packed.filename), "--ignore-scripts",
        "--no-audit", "--no-fund", "--package-lock=false"], consumerDirectory);
    var installedDirectory = join(consumerDirectory, "node_modules", packageJson.name);
    var installedReadme = await readFile(join(installedDirectory, "README.md"));
    if (installedReadme.equals(readmeBytes) === false)
        throw new Error("The packaged README differs from the repository README.");
    var localLinks = await checkLocalLinks(installedReadme.toString("utf8"), installedDirectory);
    console.log(`Packaged README matches source; ${localLinks} local file links resolve.`);
    for (var example of examples) {
        var path = join(consumerDirectory, `example-${example.name}.mjs`);
        await writeFile(path, example.source + "\n");
        var started = performance.now();
        var result;
        try {
            result = await command(process.execPath, [path], consumerDirectory, 30000);
        }
        catch (error) {
            throw new Error(`README example '${example.name}' failed:\n${error.message}`);
        }
        console.log(`Passed ${example.name} (${Math.round(performance.now() - started)} ms)`);
        if (result.stdout.trim().length > 0)
            console.log(result.stdout.trim());
    }
    console.log(JSON.stringify({ name: inventory.name, version: inventory.version,
        packagedReadmeMatches: true, localLinks, examples: examples.map((example) => example.name) }, null, 2));
}
finally {
    if (options.has("--keep-temp"))
        console.log(`Retained README test consumer: ${temporaryDirectory}`);
    else
        await rm(temporaryDirectory, { recursive: true, force: true });
}
