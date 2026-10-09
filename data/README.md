# Local developer data

Original DICOM files and derived XML, dump, and raster samples stay in the local developer kit. Git ignores `data/dicoms/`, `data/mixed/`, `data/xml/`, `data/dumps/`, and `data/local-corpus/`. Existing files remain at their original paths; a fresh checkout does not contain them. Local native tools under `ext/tools/` are also ignored.

The public unit tests, deterministic integration tests, default benchmarks, and offline examples use [independently generated synthetic fixtures](../easi-js/test/fixtures/dicom/README.md). The generator imports no EASI production encoder and includes genuinely decodable RLE, JPEG, lossless JPEG, and JPEG 2000 vectors. No download or private imaging corpus is needed for those checks.

From `easi-js`:

```bash
npm ci
npm run source:check
npm test -- --runInBand
npm run bench:streaming
npm run bench:bulk-policy
npm run bench:peers -- --include easi-js
npm run harness:synthetic
```

In the Kitchen Sink, click **Use sample** in **Read DICOM**, then run the native, FHIR, or selection actions. Its XML metadata example and editable dump also contain invented values. ImageBridge generates a synthetic input by default; choosing your local corpus requires `--pick` or `--input`.

`npm run harness:synthetic` exercises eight generated formats through parsing, writing, de-identification, transcoding, FHIR, and asset extraction. It verifies all scenario results and exact output pixels; reports stay under ignored `easi-js/test/output/`. Temporary input files are removed after the run.

## Optional local corpus

Keep private inputs in an ignored directory or outside this checkout. The existing test-library harness can still exercise them explicitly:

```bash
cd easi-js
npm run harness:test-library -- --root ../data/dicoms --max-files 20
```

Harness reports and generated images stay in ignored `easi-js/test/output/`. They can contain values from the supplied inputs; review their contents before sharing them. Local originals are not automatically uploaded to peers by the public test suite.

The cleanup preserved a verified copy of each formerly tracked asset in `data/local-corpus/publication-backup-2026-10-09/`. Its local `manifest.json` records original relative paths, byte counts, and SHA-256 hashes; `easi-platform-before-cleanup.bundle` preserves the pre-cleanup Git refs and history. These backup files are ignored and must stay local. To restore an original, copy that asset from its matching relative path in this directory back to its original location.

The tracked `dictionaries/` directory contains dictionary source material used by tooling. It is separate from the local image corpus.

## Publication

`npm run source:check` rejects accidentally tracked imaging files, the private asset directories, and Part-10 binaries renamed without a DICOM extension. It allows ignored local assets. The npm package has its own runtime allowlist and includes no fixtures or test data.

Public source publication to [davidvaccaro/easi-platform-public](https://github.com/davidvaccaro/easi-platform-public) uses a copy of filtered Git history, with the original imaging assets and their older Git objects removed. The existing development repository and its original history remain private, as do the local asset backup and Git bundle. Filtering changes affected commit and tag IDs.

In the local developer kit, `origin` points to the clean public repository and `private-archive` retains the original private remote. Main, `v1x-routing`, and `pre-v1-finalization` use the filtered history. Other private local refs and tags remain local; publish the intended refs explicitly rather than using `--mirror`, `--all`, or `--tags` from this kit.
