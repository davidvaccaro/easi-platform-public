/** Validate the actual npm tarball inventory before exercising a clean consumer. */
export function validatePackageManifest(packageJson, packed) {
    var paths = new Set(packed.files.map((file) => file.path));
    var errors = [];
    var required = ["package.json", "README.md", "LICENSE", "NOTICE", "CHANGELOG.md",
        "licenses/Apache-2.0.txt", "licenses/jpeg-js-BSD-3-Clause.txt",
        "licenses/jpeg-lossless-decoder-js-MIT.txt", "licenses/openjpegjs-MIT.txt",
        "licenses/OpenJPEG-BSD-2-Clause.txt"];

    for (var path of required) {
        if (paths.has(path) == false)
            errors.push(`Missing required package file: ${path}`);
    }

    for (var path of paths) {
        if (/^(README\.md|LICENSE|NOTICE|CHANGELOG\.md|package\.json)$/.test(path) || /^licenses\/[a-z0-9_.-]+\.txt$/i.test(path))
            continue;
        if (/^src\/[^\\]+\.js$/.test(path) == false || path.split("/").some((segment) => segment.startsWith(".")))
            errors.push(`Unexpected package file: ${path}`);
        if (/\.(dcm|dicom|png|jpg|jpeg|gif|wasm|dylib|so|exe|tgz|pem|key)$/i.test(path))
            errors.push(`Non-runtime asset in package: ${path}`);
    }

    if (packageJson.type != "module")
        errors.push("Package must declare native ES modules.");
    if (packed.name !== packageJson.name || packed.version !== packageJson.version)
        errors.push("Packed artifact does not match the declared package name and version.");
    if (packageJson.private === true)
        errors.push("Release package cannot be marked private.");
    if (packageJson.exports == null || packageJson.exports["."] == null)
        errors.push("Package must define its public root export.");

    function inspectTarget(target, subpath) {
        if (typeof target === "string") {
            if (subpath === "./package.json" && target === "./package.json")
                return;
            if (target.startsWith("./src/") == false || target.includes("*") || target.includes("..", 2))
                errors.push(`Export ${subpath} must target a concrete runtime file: ${target}`);
            else if (paths.has(target.slice(2)) == false)
                errors.push(`Export ${subpath} points to a missing package file: ${target}`);
        }
        else if (target != null && typeof target === "object" && Array.isArray(target) == false) {
            for (var value of Object.values(target))
                inspectTarget(value, subpath);
        }
        else {
            errors.push(`Invalid export target for ${subpath}.`);
        }
    }

    for (var [subpath, target] of Object.entries(packageJson.exports || {})) {
        if (subpath != "." && subpath != "./package.json" && /^\.\/[a-z][a-z0-9/-]*$/.test(subpath) == false)
            errors.push(`Unexpected public subpath: ${subpath}`);
        inspectTarget(target, subpath);
    }

    if (packageJson.main != null && paths.has(packageJson.main.replace(/^\.\//, "")) == false)
        errors.push(`Main entry is missing: ${packageJson.main}`);
    if (errors.length > 0)
        throw new Error(`Package inventory validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);

    return {
        name: packed.name,
        version: packed.version,
        files: paths.size,
        packedBytes: packed.size,
        unpackedBytes: packed.unpackedSize,
        publicSubpaths: Object.keys(packageJson.exports)
    };
}
