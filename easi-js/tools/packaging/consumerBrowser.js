import EASI, { EASI as NamedEASI } from "@xinonix/easi-js";
import * as dicom from "@xinonix/easi-js/dicom";
import * as fhir from "@xinonix/easi-js/fhir";
import * as mappings from "@xinonix/easi-js/mappings";
import * as selections from "@xinonix/easi-js/selections";
import * as codecs from "@xinonix/easi-js/codecs";
import { runSmokeWorkflows } from "./smokeWorkflows.js";

try {
    var report = await runSmokeWorkflows({ default: EASI, EASI: NamedEASI }, dicom, fhir, mappings, selections);
    if (Object.keys(codecs).length === 0)
        throw new Error("Browser-safe codec entry is empty.");
    globalThis.__easiPackagingSmoke = { ok: true, browserPublicImports: 6, ...report };
}
catch (error) {
    globalThis.__easiPackagingSmoke = { ok: false, error: error.stack || String(error) };
}
document.getElementById("result").textContent = JSON.stringify(globalThis.__easiPackagingSmoke, null, 2);
