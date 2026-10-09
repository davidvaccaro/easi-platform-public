# EASI Kitchen Sink

This page is the developer workbench for exercising EASI JavaScript features. Open the browser console, choose a feature, click **Run**, and inspect the result.

- Purpose: manual functional testing and example workflows.
- Scope: broad, mixed scenarios (DICOM native, metadata adapters, mapping, selection, assets, archive).
- Not intended as production UI code.

## Run

From `easi-js`:

```bash
npm run kitchen-sink
```

Then open:

`http://127.0.0.1:8080/easi-js/samples/kitchen-sink/index.htm`

You can also keep the page open in VS Code Live Server on port 5500. Its DIMSE panel automatically sets **Kitchen Sink server URL** to `http://127.0.0.1:8080` so requests reach the Node backend. Start that backend with `npm run kitchen-sink`. If you use a custom `PORT`, enter its URL in the field. When the page itself is served by Node, a blank backend URL uses the page’s server.

The Node backend accepts cross-origin DIMSE requests from local previews on port 5500 (`127.0.0.1`, `localhost`, and `::1`). For other preview origins, use the Node-served page. An unavailable backend shows **Blocked** with the attempted URL and startup instructions directly below the action; actual API failures show their error there.

## Use the workbench

1. Open DevTools and select the Console tab. On macOS Chrome, use **Option + Command + J**.
2. Start with **Run quick JSON check**, or open **Metadata & JSON** and run the local XML metadata example. These checks do not need Orthanc.
3. For a local DICOM file, choose the file in **Read DICOM**, then click **Run** beside **Parse file** or **Preview first frame**. Choosing a file never starts a parse or clears the console.
4. Use the sidebar to switch feature groups, or search for an action across all groups.

The workbench groups native reads, FHIR mapping, DIMSE, metadata/JSON, attribute selection, transformations, documents/assets, folder tools, and dump parsing. Each action displays its state and duration. **Passed** means the action completed; inspect the output and any validation concerns in the console. **Failed** shows the error. **Blocked** explains a missing file, required identifier, unsupported browser capability, or cancelled picker.

**Session results** keeps the latest 30 runs in memory. Click an earlier run to inspect its summary and bounded result preview; full model objects remain in the console. **Copy result** copies the selected summary/preview. Clearing session history does not clear the console. Automatic console clearing is off by default and can be enabled in **Console controls**.

## Configure Orthanc

Start Orthanc before remote operations. Expand **Connection settings** to set the DICOMweb base URL and Study/Series/SOP Instance UIDs. The initial identifiers are examples; replace them with values present in your archive. Missing or malformed required identifiers are reported before a remote request starts.

**DIMSE networking** has its own association settings because DIMSE uses the local Node server. FIND queries by modality. GET accepts a complete identifier set or discovers an Orthanc instance when all three fields are blank. MOVE requires the destination AE to be registered at the archive and writes the relayed copy to the configured C-STORE destination.

Local parsing/FHIR/selection use browser File inputs. Preview/asset actions require a suitable decoder. Folder tools require `showDirectoryPicker`; transformation, archive, and document-save actions may create downloads or output files. Advanced controls are folded until needed.

FHIR mapping defaults to a contained Patient. **External Reference** uses the editable Patient reference template, initially `Patient/{dicom.PatientID}`. Mapping produces the reference without contacting a FHIR server; use a reference appropriate to your integration.

## Files and validation

- `index.htm` and `kitchen-sink.css`: responsive layout, inputs, and feature panels.
- `harness-ui.js`: navigation, search, and file-selection labels.
- `actions.js`: the sample EASI pipelines and explicit action handlers.
- `dimse-api.js`: shared DIMSE API requests and missing-server diagnostics.
- `run-feedback.js`: action lifecycle, console groups, history, and result previews.
- `server.js`: existing local static server and DIMSE API endpoints.

Relevant regressions:

```bash
npx jest test/samples --runInBand --coverage=false
```

Include the local DIMSE API regressions:

```bash
RUN_DIMSE_SOCKET_TESTS=true npx jest test/samples test/integration/KitchenSinkDimseRelayApi.test.js test/integration/KitchenSinkDimsePreviewCors.test.js --runInBand --coverage=false
```

Browser verification covers navigation/search, JSON success/failure/recovery, XML metadata, missing-input feedback, explicit local DICOM/FHIR/selection, exact first-frame pixels, retained console/history, editable dump parsing, report-field wiring, and narrow-screen overflow. Reference-mode FHIR mapping is checked with a custom Patient reference and no DICOMweb connection.

DIMSE hosting checks cover successful C-FIND from Live Server through the Node backend, clear inline feedback for an unavailable backend, continued browser-only JSON parsing, and the Node-served page.

