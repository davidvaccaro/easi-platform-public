import { validatePackageManifest } from "../../tools/packaging/packageManifest.js";

var upstreamLicenses = ["licenses/Apache-2.0.txt", "licenses/jpeg-js-BSD-3-Clause.txt",
    "licenses/jpeg-lossless-decoder-js-MIT.txt", "licenses/openjpegjs-MIT.txt",
    "licenses/OpenJPEG-BSD-2-Clause.txt"];

function release(extraFiles = [], changes = {}) {
    var packageJson = {
        name: "@xinonix/easi-js", version: "1.0.0-rc.1", type: "module",
        main: "./src/index.js",
        exports: { ".": "./src/index.js", "./dicom": "./src/dicom/index.js", "./package.json": "./package.json" },
        ...changes
    };
    var packed = {
        name: packageJson.name, version: packageJson.version, size: 1000, unpackedSize: 5000,
        files: ["package.json", "README.md", "LICENSE", "NOTICE", "CHANGELOG.md",
            ...upstreamLicenses, "src/index.js", "src/dicom/index.js", ...extraFiles].
            map((path) => ({ path }))
    };
    return { packageJson, packed };
}

test("accepts a self-contained native ESM release with notices and concrete public exports", () => {
    var { packageJson, packed } = release();
    expect(validatePackageManifest(packageJson, packed)).toMatchObject({
        name: "@xinonix/easi-js", version: "1.0.0-rc.1", files: 12,
        publicSubpaths: [".", "./dicom", "./package.json"]
    });
});

test.each([
    "test/fixtures/image.dcm", "samples/kitchen-sink/actions.js", "tools/dev.js",
    "coverage/lcov.info", ".npmrc", ".env.production", "src/.env.js",
    "src/private/server.key", "artifacts/previous.tgz", "src/codec.wasm"
])("rejects accidental non-runtime or sensitive material: %s", (path) => {
    var { packageJson, packed } = release([path]);
    expect(() => validatePackageManifest(packageJson, packed)).toThrow(path);
});

test.each(["LICENSE", "NOTICE", "README.md", "CHANGELOG.md"])("requires release documentation: %s", (path) => {
    var { packageJson, packed } = release();
    packed.files = packed.files.filter((file) => file.path !== path);
    expect(() => validatePackageManifest(packageJson, packed)).toThrow(`Missing required package file: ${path}`);
});

test.each(upstreamLicenses)("requires the complete upstream license text: %s", (path) => {
    var { packageJson, packed } = release();
    packed.files = packed.files.filter((file) => file.path !== path);
    expect(() => validatePackageManifest(packageJson, packed)).toThrow(`Missing required package file: ${path}`);
});

test("rejects a public export missing from the actual tarball", () => {
    var { packageJson, packed } = release([], {
        exports: { ".": "./src/index.js", "./node": "./src/missing.js" }
    });
    expect(() => validatePackageManifest(packageJson, packed)).toThrow("missing package file");
});

test("checks every conditional export target", () => {
    var { packageJson, packed } = release([], {
        exports: { ".": { import: "./src/index.js", browser: "./src/missing-browser.js" } }
    });
    expect(() => validatePackageManifest(packageJson, packed)).toThrow("missing-browser.js");
});

test("rejects wildcard exports that would expose unreviewed internals", () => {
    var { packageJson, packed } = release([], { exports: { ".": "./src/index.js", "./*": "./src/*.js" } });
    expect(() => validatePackageManifest(packageJson, packed)).toThrow("concrete runtime file");
});

test("rejects exports escaping the runtime directory", () => {
    var { packageJson, packed } = release([], { exports: { ".": "./src/../../private.js" } });
    expect(() => validatePackageManifest(packageJson, packed)).toThrow("concrete runtime file");
});

test("rejects a mismatched packed identity before installation", () => {
    var { packageJson, packed } = release();
    packed.version = "0.0.1";
    expect(() => validatePackageManifest(packageJson, packed)).toThrow("declared package name and version");
});

test("rejects CommonJS or private metadata in the release artifact", () => {
    var { packageJson, packed } = release([], { type: "commonjs", private: true });
    expect(() => validatePackageManifest(packageJson, packed)).toThrow("native ES modules");
    expect(() => validatePackageManifest(packageJson, packed)).toThrow("marked private");
});
