# EASI Platform

The EASI platform repository contains implementations and development tools for the **Expressive API Standard for Imaging**. The current release focus is **EASI JS**, a JavaScript library for fluent, streaming DICOM reading, selection, mapping, and writing, with FHIR R4 ImagingStudy mapping and Node.js DIMSE.

## Start with EASI JS

**[Read the EASI JS usage guide](easi-js/README.md)** for installation, a runnable synthetic quick start, Node/browser examples, HTTP/DICOMweb, FHIR, DIMSE, pixel data, custom mappings, and troubleshooting. That same guide is included in the npm archive.

The published package is `@xinonix/easi-js@1.0.0-rc.1`, available with `npm install @xinonix/easi-js@next`. It uses native ES modules and supports Node.js 22/24 plus compatible browser workflows. Changes made after that release require a new package version.

From this checkout:

```bash
cd easi-js
npm ci
npm run kitchen-sink
```

Open **http://127.0.0.1:8080** and your browser console for the interactive developer workbench. See the [Kitchen Sink guide](easi-js/samples/kitchen-sink/README.md) for configuration.

To check the documentation and package:

```bash
npm run docs:readme:check
npm run source:check
npm run package:check
npm run package:pack
```

Archives and their integrity/inventory manifests are generated under `easi-js/artifacts/`. These commands perform local validation and packaging; publication is a separate release step.

## Repository layout

| Location | Purpose |
| --- | --- |
| `easi-js/` | Primary JavaScript implementation, tests, API documentation, and samples |
| `easi-cs/`, `easi-java/`, `easi-py/` | Other language implementation work; outside the first EASI JS release |
| `easi-ui/` | UI work outside the first library release |
| `easi-js/test/fixtures/dicom/` | Independent synthetic DICOM generators and known compressed pixel vectors |
| `data/` | Dictionary sources and [local developer data guide](data/README.md); original images are ignored and stay local |
| `ext/tools/` | Optional local external tools; ignored and excluded from public source and npm |

Language-neutral specification, conformance material, and canonical API contracts live in the separate [EASI specification repository](https://github.com/davidvaccaro/easi). EASI Studio is a separate project. Availability of those projects does not establish their first-release status.

## Licensing

The EASI JS package is source-available under its [Community License](easi-js/LICENSE), with paid commercial licensing for organizations outside community eligibility. The community revenue threshold is strictly below USD 5 million in annual consolidated group revenue, with qualifying research/nonprofit exceptions. Third-party components retain their own [notices and licenses](easi-js/NOTICE). Other packages, datasets, and specifications are governed by their respective terms.

Commercial licensing enquiries: [dvaccaro@xinonix.com](mailto:dvaccaro@xinonix.com).
