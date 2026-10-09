import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { validatePackageManifest } from "./packageManifest.js";

var packageDirectory = fileURLToPath(new URL("../../", import.meta.url));
var outputDirectory = resolve(packageDirectory, process.argv[2] || "artifacts");
if (process.argv.length > 3)
    throw new Error("Usage: npm run package:pack -- [output-directory]");
await mkdir(outputDirectory, { recursive: true });
var execute = promisify(execFile);
var packageJson = JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8"));
var npm = process.platform === "win32" ? "npm.cmd" : "npm";
var cacheDirectory = await mkdtemp(join(tmpdir(), "easi-package-cache-"));
var result;
try {
    result = await execute(npm, ["pack", "--json", "--ignore-scripts", "--pack-destination", outputDirectory], {
        cwd: packageDirectory, env: { ...process.env, npm_config_cache: cacheDirectory },
        maxBuffer: 20 * 1024 * 1024, timeout: 120000
    });
}
finally {
    await rm(cacheDirectory, { recursive: true, force: true });
}
var packed = JSON.parse(result.stdout)[0];
var inventory = validatePackageManifest(packageJson, packed);
var reportPath = join(outputDirectory, `${packed.filename.slice(0, -4)}.manifest.json`);
await writeFile(reportPath, JSON.stringify({ ...inventory, entryCount: inventory.files, filename: packed.filename,
    integrity: packed.integrity, shasum: packed.shasum, files: packed.files }, null, 2) + "\n");
console.log(`Created ${join(outputDirectory, packed.filename)}`);
console.log(`Manifest ${reportPath}`);
console.log(`${inventory.files} files; ${inventory.packedBytes} compressed bytes; ${inventory.unpackedBytes} unpacked bytes.`);
