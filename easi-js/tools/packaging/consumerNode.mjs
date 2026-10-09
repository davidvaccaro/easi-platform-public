import assert from "node:assert/strict";
import { runSmokeWorkflows } from "./smokeWorkflows.js";

var name = process.env.EASI_PACKAGE_NAME;
var subpaths = JSON.parse(process.env.EASI_PACKAGE_SUBPATHS);
var modules = new Map();
for (var subpath of subpaths) {
    var specifier = subpath === "." ? name : `${name}/${subpath.slice(2)}`;
    modules.set(subpath, await import(specifier,
        subpath === "./package.json" ? { with: { type: "json" } } : {}));
}

var report = await runSmokeWorkflows(modules.get("."), modules.get("./dicom"),
    modules.get("./fhir"), modules.get("./mappings"), modules.get("./selections"));
var node = modules.get("./dimse/node");
assert.equal(typeof node.NodeDimseCStoreScuTransport, "function");
assert.equal(typeof node.NodeDimseQueryRetrieveSourceTransport, "function");
assert.equal(typeof node.NodeDimseCStoreScpSourceTransport, "function");
assert.ok(new node.NodeDimseCStoreScuTransport());
assert.ok(new node.NodeDimseQueryRetrieveSourceTransport());
assert.ok(new node.NodeDimseCStoreScpSourceTransport());
console.log(JSON.stringify({ imports: subpaths.length, nodeDimseImports: true, ...report }));
