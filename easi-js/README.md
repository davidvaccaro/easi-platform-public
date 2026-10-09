# EASI JS

**Read, inspect, select, map, and write DICOM data through a fluent JavaScript pipeline.**

EASI JS is the JavaScript implementation of the Expressive API Standard for Imaging. It accepts native DICOM bytes, DICOM JSON/XML metadata, files, and streams. Its main outputs are DICOM instance objects, selected attributes, custom objects, serialized DICOM bytes, and FHIR R4 `ImagingStudy` resources. Node.js transports add DIMSE Verification, Store, and Study Root Query/Retrieve.

This guide is used both in the source repository and in the npm package. The published version is **`@xinonix/easi-js@1.0.0-rc.1`**, a release candidate available under `next`. Later source changes remain unreleased until a new package version is published. It uses native ES modules, supports **Node.js 22 and 24**, and has **no required npm runtime dependencies**. Browser applications can use the core pipeline and browser-compatible sources; DIMSE and filesystem paths require Node.js.

## Contents

- [Install and import](#install-and-import)
- [Runnable quick start](#runnable-quick-start)
- [How a pipeline works](#how-a-pipeline-works)
- [Read files, bytes, and streams](#read-files-bytes-and-streams)
- [Read HTTP and DICOMweb responses](#read-http-and-dicomweb-responses)
- [Understand results and DICOM attributes](#understand-results-and-dicom-attributes)
- [Read DICOM JSON and XML metadata](#read-dicom-json-and-xml-metadata)
- [Select attributes](#select-attributes)
- [Map to FHIR R4](#map-to-fhir-r4)
- [Create a custom mapping](#create-a-custom-mapping)
- [Write DICOM and handle bulk data](#write-dicom-and-handle-bulk-data)
- [Use Node.js DIMSE](#use-nodejs-dimse)
- [Decode pixels and configure codecs](#decode-pixels-and-configure-codecs)
- [Public imports and environment support](#public-imports-and-environment-support)
- [Troubleshooting](#troubleshooting)
- [Source checkout, documentation, and validation](#source-checkout-documentation-and-validation)
- [License and commercial enquiries](#license-and-commercial-enquiries)

## Install and import

Install the published release candidate:

```bash
npm install @xinonix/easi-js@next
```

To test a separately prepared local candidate, replace the archive path:

```bash
npm install /path/to/artifacts/xinonix-easi-js-VERSION.tgz
```

Use an ES module: save Node.js examples as `.mjs`, or set `"type": "module"` in your application's `package.json` and use `.js`. Top-level `await` in this guide assumes an ES module.

The first npm publication also received the automatic `latest` tag. Both tags currently select `1.0.0-rc.1`; this does not establish a stable v1 release. Pin `1.0.0-rc.1` if you need that exact candidate.

```js
import EASI, { Tag } from '@xinonix/easi-js';
```

For a browser application, resolve package imports with your bundler or an import map. Opening a script that contains a bare npm import directly in a browser does not configure package resolution. The package contains native JavaScript modules; a CommonJS build and TypeScript declarations are not included in this candidate.

## Runnable quick start

This example needs no PACS, Orthanc server, patient file, or optional codec. It creates synthetic DICOM JSON, serializes it to native DICOM bytes, and reads those bytes back into an instance.

Save it as `quickstart.mjs` in your application, then run:

```bash
node quickstart.mjs
```

<!-- easi-example: quickstart -->
```js
import { writeFile } from 'node:fs/promises';
import EASI, { Tag } from '@xinonix/easi-js';

const metadata = {
    '00080016': { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.7'] },
    '00080018': { vr: 'UI', Value: ['2.25.123.1.1'] },
    '00080060': { vr: 'CS', Value: ['OT'] },
    '00100020': { vr: 'LO', Value: ['SYNTHETIC-PATIENT'] },
    '0020000D': { vr: 'UI', Value: ['2.25.123'] },
    '0020000E': { vr: 'UI', Value: ['2.25.123.1'] },
    '00280002': { vr: 'US', Value: [1] },
    '00280004': { vr: 'CS', Value: ['MONOCHROME2'] },
    '00280010': { vr: 'US', Value: [2] },
    '00280011': { vr: 'US', Value: [2] },
    '00280100': { vr: 'US', Value: [8] },
    '00280101': { vr: 'US', Value: [8] },
    '00280102': { vr: 'US', Value: [7] },
    '00280103': { vr: 'US', Value: [0] },
    '7FE00010': { vr: 'OB', InlineBinary: 'AAECAw==' }
};
const jsonBytes = new TextEncoder().encode(JSON.stringify(metadata));

const written = await EASI.pipelineBuilder()
    .fromByteStream()
    .ofDicomMetadata()
    .toDicomData()
    .build()
    .process({ source: jsonBytes });
const bytes = written.first();

const result = await EASI.pipelineBuilder()
    .fromByteStream()
    .ofDicomData()
    .toInstances()
    .build()
    .process({ source: bytes });
const instance = result.first();

console.log(JSON.stringify({
    instances: result.count,
    patientId: instance.dataSet.value(Tag.PatientID),
    studyUid: instance.dataSet.value(Tag.StudyInstanceUID),
    sopInstanceUid: instance.dataSet.value(Tag.SOPInstanceUID),
    rows: instance.dataSet.value(Tag.Rows),
    columns: instance.dataSet.value(Tag.Columns)
}, null, 2));

await writeFile('./example.dcm', bytes);
await writeFile('./metadata.json', JSON.stringify(metadata, null, 2));
```

Expected output:

```json
{
  "instances": 1,
  "patientId": "SYNTHETIC-PATIENT",
  "studyUid": "2.25.123",
  "sopInstanceUid": "2.25.123.1.1",
  "rows": 2,
  "columns": 2
}
```

The example writes `example.dcm` and `metadata.json` into the current directory. Subsequent local examples use those files; run the quick start first, or supply your own files at those paths. Save each example in its own module. The generated DICOM bytes are a small **raw dataset for learning**, not a complete clinical image or a Part 10 file. The DIMSE Store example later requires a separate, complete Part 10 file.

## How a pipeline works

Build a pipeline in this order:

```text
source → input format → output product → optional destination → build → process
```

| Stage | What you choose | Common methods |
| --- | --- | --- |
| Source | Where bytes arrive | `fromByteStream()`, `fromFileStream()`, `fromPartStream()`, `fromHttpStream()`, `fromNodeStreamAdapter()`, `fromDimseAssociation()` |
| Format | How to parse them | `ofDicomData()`, `ofDicomMetadata()`, `ofDicomXmlMetadata()` |
| Product | What to produce | `toInstances()`, `toSelection(selection)`, `toMapping(mapping)`, `toFHIRImagingStudy(options)`, `toDicomData(options)` |
| Destination | Where serialized output goes | `intoFileStream(path)`, `intoNodeStreamAdapter(writable)`, `intoWritableStream(writable)`, `intoHttpStream(request)`, `intoDimseAssociation(association, options)` |
| Execution | Build once, process input | `build()`, then `await pipeline.process({ source, sourceOptions })` |

`build()` configures the reader, parser, and handler. `process()` performs the work. Source and destination options can be bound in the builder or supplied at execution time. This guide uses explicit invocation objects so request options are easy to identify:

```js
await pipeline.process({
    source: input,
    sourceOptions: readOptions,
    destination: outputTarget,
    destinationOptions: writeOptions
});
```

Only include fields your workflow needs. A source bound with `.fromFileStream('./example.dcm')` can be processed with `await pipeline.process()`. Repeated calls on one built pipeline are serialized and reset per-call result state. Use separate pipeline instances when independent inputs must execute concurrently.

## Read files, bytes, and streams

### Node.js file

The file reader streams a filesystem path, avoiding an initial `readFile()` of the entire input:

<!-- easi-example: read-file -->
```js
import EASI, { Tag } from '@xinonix/easi-js';

const pipeline = EASI.pipelineBuilder()
    .fromFileStream()
    .ofDicomData()
    .toInstances()
    .build();

const result = await pipeline.process({ source: './example.dcm' });
for (const instance of result.toArray()) {
    console.log(instance.dataSet.value(Tag.SOPInstanceUID));
}
```

For bytes already in memory, replace `.fromFileStream()` with `.fromByteStream()` and pass a `Uint8Array` or `ArrayBuffer` as `source`. Native parsing accepts Part 10 input and supported raw datasets. Raw datasets lack the file metadata that normally declares a transfer syntax; use them only when their encoding is known and supported.

### Node.js readable stream

<!-- easi-example: read-node-stream -->
```js
import { createReadStream } from 'node:fs';
import EASI, { Tag } from '@xinonix/easi-js';

const result = await EASI.pipelineBuilder()
    .fromNodeStreamAdapter()
    .ofDicomData()
    .toInstances()
    .build()
    .process({ source: createReadStream('./example.dcm') });

console.log(result.first().dataSet.value(Tag.StudyInstanceUID));
```

The Node adapter also accepts async iterables of byte chunks. Treat stream inputs as consumed after processing; create a fresh stream for another run. Readers clean up their owned adapters, while callers retain responsibility for the lifecycle of resources they supply.

### Browser File or Blob

Use this in a bundled browser module alongside an HTML file input:

```html
<input id="dicom-file" type="file" accept=".dcm,application/dicom">
<pre id="output"></pre>
```

```js
import EASI, { Tag } from '@xinonix/easi-js';

const pipeline = EASI.pipelineBuilder()
    .fromFileStream()
    .ofDicomData()
    .toInstances()
    .build();

const input = document.querySelector('#dicom-file');
const output = document.querySelector('#output');
input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
        const result = await pipeline.process({ source: file });
        output.textContent = JSON.stringify(result.toArray().map(instance => ({
            sopInstanceUid: instance.dataSet.value(Tag.SOPInstanceUID)
        })), null, 2);
    } catch (error) {
        output.textContent = error.message;
    }
});
```

A browser `File`/`Blob` supplies bytes; a filesystem path string does not grant browser access to your disk. To use a Web `ReadableStream<Uint8Array>` directly, choose `.fromPartStream()` and pass the stream as `source`. With a `fetch()` response, provide `sourceOptions: { contentType: response.headers.get('content-type') }` so multipart boundaries are available, or use the HTTP reader below.

## Read HTTP and DICOMweb responses

The HTTP reader fetches a URL and uses the response's Content-Type to handle a single part or multipart payload. Choose the parser for the response body you requested.

This runnable example starts a temporary local server that serves the quick start's synthetic metadata. It also shows where fetch headers and an AbortSignal belong:

<!-- easi-example: read-http -->
```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import EASI, { Tag } from '@xinonix/easi-js';

const json = await readFile('./metadata.json');
const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/dicom+json' });
    response.end(json);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

try {
    const url = `http://127.0.0.1:${server.address().port}/metadata`;
    const result = await EASI.pipelineBuilder()
        .fromHttpStream()
        .ofDicomMetadata()
        .toInstances()
        .build()
        .process({
            source: url,
            sourceOptions: {
                headers: { Accept: 'application/dicom+json' },
                signal: AbortSignal.timeout(10000)
            }
        });
    console.log(result.first().dataSet.value(Tag.StudyInstanceUID));
} finally {
    await new Promise(resolve => server.close(resolve));
}
```

For a real archive, replace the URL and request headers with your application's endpoint and authentication. These URL patterns illustrate the usual parser choice; replace every example UID:

| Request | Example path below the archive's DICOMweb base URL | Format |
| --- | --- | --- |
| WADO-RS instance | `/studies/{study}/series/{series}/instances/{instance}` | `ofDicomData()`; request `application/dicom` or the archive's DICOM multipart format |
| WADO-RS metadata | `/studies/{study}/metadata` | `ofDicomMetadata()`; request `application/dicom+json` |
| QIDO-RS study search | `/studies?PatientID=RESEARCH-*` | `ofDicomMetadata()`; request `application/dicom+json` |

Use `sourceOptions.headers` for HTTP request headers. For the `fromDicomweb()` convenience reader, use `sourceOptions.request` for fetch settings to keep them separate from mode/query options; its modes are `wado-instance`, `wado-metadata`, and `qido-search`. An explicitly supplied URL is already the complete request URL. QIDO returns metadata identifiers, not image pixels; map a study search with `toFHIRImagingStudy('study-summary')`.

In browsers, the archive must allow your application's origin and requested headers through CORS. DIMSE does not use HTTP and cannot be sent directly from a browser; a Node service must perform those operations.

## Understand results and DICOM attributes

`await pipeline.process(...)` returns a **result collection**, even for one product. Access it explicitly:

| Expression | Meaning |
| --- | --- |
| `result.count` | Number of products |
| `result.isEmpty` | Whether no products were produced |
| `result.first()` | First product, or `null` when empty |
| `result.at(index)` | Product at an index |
| `result.toArray()` | Plain array of products |

Use `count` and `toArray()` for predictable behavior. Compatibility forwarding can make `result.length`, numeric indexing, or direct iteration reflect the contents of a single iterable product, such as a `Uint8Array`, rather than the number of products. A DICOM writer returns bytes with `.first()`; a destination writer can return an operation receipt instead.

`toInstances()` produces objects with `instance.dataSet` and, when available, `instance.metaSet`, `instance.preamble`, and `instance.prefix`. Study, series, and SOP Instance UIDs identify the imaging hierarchy. Access attributes with **Tag objects**:

```js
const instance = result.first();
if (instance) {
    const uid = instance.dataSet.value(Tag.SOPInstanceUID, 'missing');
    const attribute = instance.dataSet.find(Tag.PatientID);
    const present = instance.dataSet.has(Tag.PatientID);
    const rawBytes = attribute?.access();
}
```

`find()` searches immediate attributes and returns `undefined` if absent. `value()` accepts a fallback. Resolve an explicit tag with `Tag.find('0020000D')`; use that Tag in the dataset API. Sequences expose `.items`, whose items contain their own attributes; walk those items for nested values.

An attribute's `.value` depends on VR and input: it can be a string, number, Date, byte array, or metadata value such as an array/person-name object. `.access()` obtains retained raw bytes. Native `Attribute.value` is not a complete DICOM character-set conversion layer; the FHIR mapper has its own bounded decoding support. Retaining a PixelData attribute also does not mean its bytes were materialized or decoded into pixels.

## Read DICOM JSON and XML metadata

The metadata adapters let the same instance, selection, mapping, and DICOM writer targets work with DICOM JSON or XML. DICOM JSON uses tag keys and VR/value fields, rather than ordinary arbitrary application JSON.

<!-- easi-example: read-json -->
```js
import { readFile } from 'node:fs/promises';
import EASI, { Tag } from '@xinonix/easi-js';

const source = new Uint8Array(await readFile('./metadata.json'));
const result = await EASI.pipelineBuilder()
    .fromByteStream()
    .ofDicomMetadata()
    .toInstances()
    .build()
    .process({ source });

console.log(result.first().dataSet.value(Tag.PatientID));
```

For XML, pass encoded `NativeDicomModel` XML to `.ofDicomXmlMetadata()`:

<!-- easi-example: read-xml -->
```js
import EASI, { Tag } from '@xinonix/easi-js';

const xml = `<NativeDicomModel>
  <DicomAttribute tag="0020000D" vr="UI" keyword="StudyInstanceUID">
    <Value number="1">2.25.123</Value>
  </DicomAttribute>
</NativeDicomModel>`;
const result = await EASI.pipelineBuilder()
    .fromByteStream()
    .ofDicomXmlMetadata()
    .toInstances()
    .build()
    .process({ source: new TextEncoder().encode(xml) });

console.log(result.first().dataSet.value(Tag.StudyInstanceUID));
```

JSON/XML metadata can describe bulk data through `BulkDataURI`; that URI does not automatically fetch or decode the referenced bytes. `InlineBinary` represents base64-encoded bytes. JSON study/series searches may omit the instance-level fields needed for full FHIR mapping; choose the summary profile for those results.

## Select attributes

Choose selection when you need a few attributes rather than a complete instance. A selection returns an **AttributeSet**; access it directly, without `.dataSet`:

<!-- easi-example: selection -->
```js
import EASI, { Tag } from '@xinonix/easi-js';

const selection = EASI.selectionBuilder()
    .include(Tag.StudyInstanceUID)
    .include('SeriesInstanceUID')
    .include('(0008,0018)')
    .build();

const result = await EASI.pipelineBuilder()
    .fromFileStream()
    .ofDicomData()
    .toSelection(selection)
    .build()
    .process({ source: './example.dcm' });

console.log(result.toArray().map(attributes => ({
    studyUid: attributes.value(Tag.StudyInstanceUID),
    seriesUid: attributes.value(Tag.SeriesInstanceUID),
    instanceUid: attributes.value(Tag.SOPInstanceUID)
})));
```

`include()` accepts a Tag, a recognized keyword, an eight-digit hexadecimal tag, or a parenthesized tag. These are tag selections, not nested property-path expressions. Missing selected attributes remain absent. The same selection works with `ofDicomMetadata()` or `ofDicomXmlMetadata()`.

## Map to FHIR R4

Use `toFHIRImagingStudy()` for the built-in FHIR R4 4.0.1 mapping. It produces model objects that serialize with `toJSON()` or `JSON.stringify()`. It creates resources **in memory**; it does not write to a FHIR server, resolve patient identity, or create server-side Patient/Endpoint resources.

### Full ImagingStudy

<!-- easi-example: fhir-full -->
```js
import { readFile } from 'node:fs/promises';
import EASI from '@xinonix/easi-js';

const result = await EASI.pipelineBuilder()
    .fromByteStream()
    .ofDicomMetadata()
    .toFHIRImagingStudy()
    .build()
    .process({ source: new Uint8Array(await readFile('./metadata.json')) });

const study = result.first();
console.log(JSON.stringify(study, null, 2));
```

The synthetic fixture produces one study, one series, and one instance. `study.subject` references the contained Patient as `#patient`. FHIR uses **`series[].instance[]`** (singular `instance`), and `subject` is a Reference, not a Patient object containing demographic properties.

### Reference an existing Patient and Endpoints

Resolve identifiers through your application before choosing a Patient reference. This example names existing FHIR resources; replace its references and namespaces:

<!-- easi-example: fhir-configured -->
```js
import { readFile } from 'node:fs/promises';
import EASI from '@xinonix/easi-js';

const result = await EASI.pipelineBuilder()
    .fromByteStream()
    .ofDicomMetadata()
    .toFHIRImagingStudy({
        profile: 'full',
        status: 'available',
        subject: { reference: 'Patient/example' },
        identifierSystems: {
            patient: 'https://example.org/patient-ids',
            accession: 'https://example.org/accessions',
            study: 'https://example.org/study-ids'
        },
        endpoints: {
            study: 'Endpoint/dicomweb',
            series: ['Endpoint/dicomweb']
        }
    })
    .build()
    .process({ source: new Uint8Array(await readFile('./metadata.json')) });

console.log(JSON.stringify(result.first(), null, 2));
```

`subject` selects reference mode unless explicitly overridden. Endpoint references identify FHIR `Endpoint` resources; a WADO URL belongs in an Endpoint's address, not in an ImagingStudy Reference. `identifierSystems.study` applies to StudyID; StudyInstanceUID uses `urn:dicom:uid`.

### Choose the correct profile

| Profile | Required imaging fields | Output and counts |
| --- | --- | --- |
| `full` (default) | StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID, SOPClassUID, and one Modality | Aggregates represented series/instances. Counts reflect the unique instances observed in this process call. |
| `study-summary` | StudyInstanceUID | Study metadata without a series list. Uses NumberOfStudyRelatedSeries/Instances when supplied; unknown counts are omitted. |

Both profiles require a subject. Contained mode can produce a Patient with only a local `id` when demographics are absent. Full mapping rejects missing required fields and inconsistent identities/counts instead of inventing them. Input instances for the same study aggregate **within one `process()` call**; separate calls do not accumulate a study across requests.

To map study-level search results, replace the target with `.toFHIRImagingStudy('study-summary')`. To extend the mapping, import `DicomToFHIRImagingStudyMapping` from `@xinonix/easi-js/fhir`, construct it with options, and pass it to `.toMapping(mapping)`.

Native-text FHIR mapping supports ASCII, UTF-8, and Latin-1 with explicit errors for unsupported character-set declarations. The mapper checks required fields and documented semantics; tests validate serialized resources against the pinned official R4 schema. It is not a general profile or terminology validator, and receiving servers can impose additional requirements. The [FHIR mapping guide](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/doc/handlers/mappings/DicomToFHIRImagingStudyMapping.md) details fields, templates, and conflict handling.

## Create a custom mapping

For your own plain objects, extend `DicomMapping` and define the per-instance output lifecycle. Returning the object from `end()` is essential:

<!-- easi-example: custom-mapping -->
```js
import EASI, { Tag } from '@xinonix/easi-js';
import { DicomMapping } from '@xinonix/easi-js/mappings';

class PlainObjectMapping extends DicomMapping {
    start(context) {
        context.current = {};
        return super.start(context);
    }
    end(context) {
        super.end(context);
        return context.current;
    }
}

const mapping = EASI.mappingBuilder()
    .withMapping(new PlainObjectMapping())
    .map(Tag.StudyInstanceUID, 'current.studyInstanceUID')
    .map('SOPInstanceUID').to('current.sopInstanceUID')
    .withComputed('current.label', { template: 'Study {dicom.StudyInstanceUID}' })
    .build();

const result = await EASI.pipelineBuilder()
    .fromFileStream()
    .ofDicomData()
    .toMapping(mapping)
    .build()
    .process({ source: './example.dcm' });

console.log(result.toArray());
```

This produces one plain object per input instance. It does not automatically aggregate studies. Dotted destination paths must have existing parent objects, which `start()` initializes here. Computed rules run at the end by default, after their source attributes can be captured. Mapping transforms and computed resolvers are synchronous.

## Write DICOM and handle bulk data

### Serialize to bytes or a file

`toDicomData()` returns one `Uint8Array` per emitted instance. The writer serializes parsed DICOM events, including available file headers; it does not automatically create missing Part 10 metadata or a complete DICOM object from an arbitrary dataset. It also does not transcode compressed pixels unless a separate configured transform does so.

<!-- easi-example: write-bytes -->
```js
import { writeFile } from 'node:fs/promises';
import EASI from '@xinonix/easi-js';

const result = await EASI.pipelineBuilder()
    .fromFileStream()
    .ofDicomData()
    .toDicomData()
    .build()
    .process({ source: './example.dcm' });

const outputBytes = result.first();
await writeFile('./copy.dcm', outputBytes);
console.log(outputBytes.byteLength);
```

To use a destination writer:

<!-- easi-example: write-destination -->
```js
import EASI from '@xinonix/easi-js';

const result = await EASI.pipelineBuilder()
    .fromFileStream()
    .ofDicomData()
    .toDicomData()
    .intoFileStream('./destination-copy.dcm')
    .build()
    .process({ source: './example.dcm' });

const receipt = result.first();
console.log(receipt.path, receipt.bytesWritten);
```

That result is a writer receipt, not an Instance or byte array. This recipe still materializes the terminal DICOM bytes before the destination writer receives them. For output produced during parsing, use the chunk callback below. Do not write multiple independent instances into one unframed file; use separate files or an appropriate multipart destination.

### Decide whether to retain bulk bytes

Streaming input does not guarantee constant memory use: an instance target can retain attributes, a bytes target collects output, and FHIR aggregation retains its resource hierarchy.

The native parser's default bulk policy is `auto`, with a **1 MiB candidate threshold** and **16 MiB known-length safety cap**. It streams undefined-length bulk candidates, including encapsulated PixelData, regardless of their eventual size. Large known-length bulk candidates can also be forwarded in chunks without being retained in the Instance. `DicomInstanceHandler` does not collect those chunks, so `PixelData.access()` may be empty even though the input contained pixel data.

For a bounded input whose pixel bytes must be retained:

<!-- easi-example: materialize-pixels -->
```js
import EASI, { Tag } from '@xinonix/easi-js';

const result = await EASI.pipelineBuilder()
    .fromFileStream()
    .ofDicomData()
    .withBulkDataPolicy({
        mode: 'materialize',
        hardSafetyCap: 64 * 1024 * 1024
    })
    .toInstances()
    .build()
    .process({ source: './example.dcm' });

const pixels = result.first().dataSet.find(Tag.PixelData);
console.log(Array.from(pixels.access())); // Synthetic fixture: [0, 1, 2, 3]
```

`hardSafetyCap` forces **known-length nonstructural values at or above the cap** to stay streamed, even in materialize mode. It is not an overall memory limit or a total bound for undefined-length PixelData. `stream` mode can stream ordinary nonstructural attribute values too; use `auto` when metadata should stay available while large bulk values stream. Parsing or copying compressed PixelData does not require decoding it.

### Write chunks without collecting the entire output

The writer awaits an async `onChunk` callback. This example writes each chunk to an open file, handles partial writes, and returns only an operation receipt:

<!-- easi-example: write-chunks -->
```js
import { open } from 'node:fs/promises';
import EASI from '@xinonix/easi-js';

const file = await open('./chunked-copy.dcm', 'w');
let position = 0;
try {
    const result = await EASI.pipelineBuilder()
        .fromFileStream()
        .ofDicomData()
        .withBulkDataPolicy({ mode: 'auto' })
        .toDicomData({
            collectOutput: false,
            onChunk: async chunk => {
                let offset = 0;
                while (offset < chunk.byteLength) {
                    const { bytesWritten } = await file.write(
                        chunk, offset, chunk.byteLength - offset, position
                    );
                    if (bytesWritten === 0) throw new Error('Output write made no progress.');
                    offset += bytesWritten;
                    position += bytesWritten;
                }
            }
        })
        .build()
        .process({ source: './example.dcm' });
    console.log(result.first().bytesWritten, position);
} finally {
    await file.close();
}
```

Consume each chunk before resolving the callback to apply backpressure. With `collectOutput: false`, `.first()` is an operation result with `bytesWritten` and a null payload; it cannot supply a later materialized Store payload. For custom parser/handler extensions, the builder also exposes `withReader`, `withParser`, and `withHandler`; see the [pipeline reference](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/doc/builders/PipelineBuilder.md) for their lifecycle contracts.

## Use Node.js DIMSE

The examples in this section require an actual DICOM peer. **Replace the address, port, AE titles, identifiers, and filenames with your configuration.** They are not part of the offline quick start. The source checkout's Kitchen Sink runs browser controls through its Node backend.

### Configure the peer and verify it

Use this shared setup in a Node.js module for the following DIMSE examples:

```js
import EASI from '@xinonix/easi-js';
import {
    DimseClientBuilder,
    NodeDimseQueryRetrieveSourceTransport,
    NodeDimseCStoreScuTransport,
    NodeDimseCStoreScpSourceTransport
} from '@xinonix/easi-js/dimse/node';

const association = {
    host: '127.0.0.1',
    port: 4242,
    calledAeTitle: 'ORTHANC',
    callingAeTitle: 'EASI_JS',
    associationTimeoutMs: 30000
};

const client = new DimseClientBuilder()
    .withAssociation(association)
    .withTransport(new NodeDimseQueryRetrieveSourceTransport())
    .build();
const verification = await client.echo({ operationTimeoutMs: 10000 });
console.log(verification.ok, verification.status); // Success status: 0
```

`host`/`port` locate the remote DICOM listener; `calledAeTitle` names that peer; `callingAeTitle` identifies your application. The peer may need to allow your calling AE and host. `DimseClient` provides `echo()`; FIND/GET/MOVE use the pipeline transports below.

### C-FIND studies and return FHIR summaries

```js
const find = EASI.pipelineBuilder()
    .fromDimseAssociation(association, new NodeDimseQueryRetrieveSourceTransport())
    .ofDicomData()
    .toFHIRImagingStudy('study-summary')
    .build();

const studies = await find.process({
    sourceOptions: {
        operation: 'c-find',
        queryRetrieveModel: 'study-root',
        queryRetrieveLevel: 'STUDY',
        keys: { PatientID: 'RESEARCH-*' },
        returnKeys: [
            'StudyInstanceUID', 'PatientID', 'PatientName', 'StudyDate',
            'ModalitiesInStudy', 'NumberOfStudyRelatedSeries',
            'NumberOfStudyRelatedInstances'
        ],
        operationTimeoutMs: 30000
    }
});
console.log(studies.toArray().map(study => study.toJSON()));
console.log(find.reader.lastMetadata.dimse.finalResponse);
```

Use matching `keys` to constrain the query and `returnKeys` to request fields needed by your output. Keywords and supported hexadecimal tag forms are accepted. A successful no-match FIND returns an empty collection. To obtain raw identifier instances instead, use `.toInstances()` as the target.

### C-GET an identified instance

```js
const get = EASI.pipelineBuilder()
    .fromDimseAssociation(association, new NodeDimseQueryRetrieveSourceTransport())
    .ofDicomData()
    .toInstances()
    .build();

const instances = await get.process({
    sourceOptions: {
        operation: 'c-get',
        performFind: false,
        queryRetrieveModel: 'study-root',
        queryRetrieveLevel: 'IMAGE',
        keys: {
            StudyInstanceUID: '2.25.123',
            SeriesInstanceUID: '2.25.123.1',
            SOPInstanceUID: '2.25.123.1.1'
        },
        operationTimeoutMs: 60000
    }
});
console.log(instances.count, get.reader.lastMetadata.dimse.finalResponse);
```

Replace all three UIDs with identifiers that exist at the peer. `performFind: false` avoids the default preliminary FIND when they are already known. GET receives Storage suboperations on the same association. Use `storageSopClassUids` and `storageTransferSyntaxUids` to restrict presentations your application accepts.

C-MOVE uses a separate temporary Store listener. The archive must already route your `moveDestinationAeTitle` to a reachable listener address and fixed `moveStorePort`. Local `moveStoreHost` controls binding and does not register that route. Using the same retrieval pipeline as GET:

```js
const moved = await get.process({
    sourceOptions: {
        operation: 'c-move',
        performFind: false,
        queryRetrieveModel: 'study-root',
        queryRetrieveLevel: 'STUDY',
        keys: { StudyInstanceUID: '2.25.123' },
        moveDestinationAeTitle: 'EASI_MOVE_DEST',
        moveStoreHost: '127.0.0.1',
        moveStorePort: 4104,
        moveStoreCalledAeTitle: 'EASI_MOVE_DEST',
        operationTimeoutMs: 60000
    }
});
console.log(moved.count, get.reader.lastMetadata.dimse.finalResponse);
```

Replace the UID and route/listener settings with your deployment's values. See the [DIMSE guide](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/doc/DIMSE_V1.md) for further MOVE options.

### C-STORE a complete Part 10 file

Use a valid Part 10 input with its file meta information; do not use the quick start's raw dataset as this file:

```js
import { readFile } from 'node:fs/promises';

const send = EASI.pipelineBuilder()
    .fromByteStream()
    .ofDicomData()
    .toDicomData()
    .intoDimseAssociation(association, {
        transport: new NodeDimseCStoreScuTransport()
    })
    .build();

const result = await send.process({
    source: new Uint8Array(await readFile('./part10-input.dcm')),
    destinationOptions: { signal: AbortSignal.timeout(30000) }
});
const sent = result.first();
if (!sent.ok) throw new Error(`C-STORE failed: 0x${sent.dimseStatus.toString(16)}`);
if (sent.dimseStatus !== 0) console.warn('C-STORE warning', sent);
console.log(sent);
```

Check `ok` and `dimseStatus`: a resolved Store call can report a peer failure, and `0xBxxx` warnings have `ok: true`. Outgoing Store requires materialized bytes and does not transcode to a peer-selected syntax. For batches, inspect the transport's per-object results and counters.

### Receive a batch of Store objects

```js
const listenerAssociation = {
    host: '127.0.0.1',
    port: 4104,
    calledAeTitle: 'EASI_STORE'
};
const storage = new NodeDimseCStoreScpSourceTransport();
const receive = EASI.pipelineBuilder()
    .fromDimseAssociation(listenerAssociation, storage)
    .ofDicomData()
    .toInstances()
    .build();

try {
    await storage.start(listenerAssociation);
    console.log('Listening', storage.listener);
    const batch = await receive.process({
        sourceOptions: { waitForFirstInstanceMs: 60000, batchIdleGraceMs: 250 }
    });
    console.log(batch.count);
} finally {
    await storage.close();
}
```

This receives one batch then closes. The sender must use this listener's address, port, and called AE. No incoming object before the deadline causes a timeout error. For a continuous source-bound service, `receive.start({ onResult, onError })` returns a run handle; stop it with `await run.stop()` and await `run.done` during shutdown. The first-object idle timeout stops that run by default. Choose an explicit retry policy: `continueOnError: true`, or return `true` from `onError` for errors you want to retry, including idle timeouts.

### Inspect status, cancel, and bound memory

For FIND/GET/MOVE, inspect `pipeline.reader.lastMetadata.dimse.finalResponse`: it includes `status`, `remaining`, `completed`, `failed`, `warning`, and failed SOP Instance UIDs where supplied. Warning responses can resolve with partial products; failure/cancel responses reject and expose peer details in `error.dimse`. Read metadata describes only the latest operation.

Pass `sourceOptions.signal` to query/retrieval reads, `destinationOptions.signal` to Store writes, or `signal` to `echo()`. Local abort closes the association; it does not perform a graceful C-CANCEL exchange. `associationTimeoutMs` is an idle timeout; query/ECHO operations additionally accept an absolute `operationTimeoutMs`. Use an AbortSignal deadline for outbound Store.

GET/MOVE and incoming Store buffer complete datasets; they do not offer constant-memory study retrieval. Default dataset and aggregate retained-dataset limits are 512 MiB; reduce them or retrieve smaller scopes for your deployment. Store success acknowledges receipt into memory before application parsing or durable persistence. The documented independent-peer profile covers Study Root with Orthanc; TLS/mTLS and deployment-specific security settings need their own peer configuration. Query/Retrieve SCP, worklist, and normalized DIMSE services are outside that profile.

## Decode pixels and configure codecs

Reading an instance or copying compressed PixelData preserves data without rendering an image. Pixel decoding is a separate step, requiring the image's dimensions, bit depth, photometric interpretation, frame boundaries, and a decoder for its transfer syntax.

Import codec classes from `@xinonix/easi-js/codecs`, or build a registry with `EASI.codecRegistryBuilder().withDefaultCodecs().build()`. The registry's default registrations do not establish that every transfer syntax is supported in every environment.

For a standalone supported PNG payload, this helper returns dimensions and RGBA bytes:

```js
import { PngDecoder } from '@xinonix/easi-js/codecs';

async function decodePng(sourceBytes) {
    return await new PngDecoder().decodeImage(sourceBytes);
    // { width, height, bytes: Uint8Array }
}
```

PNG support is bounded to the implemented noninterlaced 8-bit profiles; browsers need `DecompressionStream` for inflation. Native, baseline JPEG, lossless JPEG, and RLE have built-in decoding paths. JPEG2000, JPEG-LS, and HTJ2K require compatible application-provided backends for their respective profiles.

For JPEG2000, await provider initialization before using the synchronous decoder:

```js
import { OpenJpegRuntime } from '@xinonix/easi-js/codecs';

async function configureOpenJpeg(createOpenJpegModule, options = {}) {
    const module = await createOpenJpegModule(options);
    OpenJpegRuntime.setModule(module);
    return module;
}
```

The factory and its JavaScript/WASM assets come from your chosen compatible provider; they are not bundled with EASI JS. An unresolved asynchronous factory alone cannot satisfy `Jpeg2000Decoder.decode()`. Providers retain their own licenses. The [decoder guide](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/doc/codecs/Decoders.md) describes the required interface and registry usage. Transcoding, OCR/redaction, and advanced format utilities require their own supported-profile review; this guide does not promise universal or lossless conversion.

## Public imports and environment support

| Import | Purpose |
| --- | --- |
| `@xinonix/easi-js` | Default/named EASI factory, builders, key DICOM models, mapping/selection extensions |
| `@xinonix/easi-js/dicom` | Tags, transfer syntaxes, value representations, DICOM model classes |
| `@xinonix/easi-js/fhir` | FHIR R4 imaging/value models and ImagingStudy mapping |
| `@xinonix/easi-js/mappings` | Mapping extension classes |
| `@xinonix/easi-js/selections` | Selection extension classes |
| `@xinonix/easi-js/codecs` | Codec registry, decoder/encoder classes, optional runtime configuration |
| `@xinonix/easi-js/dimse/node` | Node DIMSE clients/transports; unavailable under browser export conditions |
| `@xinonix/easi-js/package.json` | Package metadata |

Use these exported paths. Internal `src/...` imports are not public package imports. The class identities are shared across the public entries, so a mapped ImagingStudy uses the same class exported from the FHIR entry.

| Capability | Node.js 22/24 | Modern browser |
| --- | --- | --- |
| In-memory bytes and Web streams | Yes | Yes |
| Local input | Filesystem path, streams, bytes | User-provided File/Blob, streams, bytes |
| HTTP/DICOMweb | Yes | Requires server CORS and browser fetch support |
| DICOM JSON/XML, selection, custom mapping, FHIR | Yes | Yes |
| Filesystem destination | File path or Node writable | Browser file destination or application download flow |
| DIMSE TCP/TLS sockets | Yes | Use a Node backend |
| Optional WASM codecs | Supply compatible provider/assets | Supply compatible provider/assets |

The v1 focus is finite DICOM I/O, selection/mapping, FHIR ImagingStudy, and the bounded Node DIMSE profile. The source tree contains additional workflows, including folder watching, document/assets, and image transforms; their individual APIs and limitations live in the reference docs. They should not be treated as a claim of complete DICOM/FHIR or codec conformance.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| npm reports the package is missing | Confirm the package/version is published and visible to your account. For an unpublished local candidate, install its `.tgz`. |
| `Cannot use import statement outside a module` | Use `.mjs` or `"type": "module"` in your application. |
| Browser cannot resolve `@xinonix/easi-js` | Configure your bundler/import map; npm specifiers are not browser URLs. |
| Import of `/src/...` or DIMSE fails | Use a public export; `/dimse/node` requires Node conditions. |
| `result.dataSet` or FHIR properties are confusing | Use `.first()` or `.toArray()`; products differ by target. Selection returns AttributeSet, FHIR `subject` is a Reference. |
| Study UID or other attribute is absent | Check the input's actual tags/VRs and requested query return keys. Missing data is not automatically fabricated. |
| PixelData exists but `.access()` is empty | The bulk policy may have streamed its bytes. Choose bounded materialization or a chunk consumer. |
| Native text is garbled | Check SpecificCharacterSet and the API's decoding support; native Attribute access and FHIR mapping have different limits. |
| FHIR mapping rejects study search results | Use `study-summary`; full mapping requires series/instance identity and Modality. |
| FHIR resources contain no server-created Patient | Mapping is local. Resolve references and perform server writes in your application. |
| DIMSE connection fails | Verify peer address/port, both AE titles, permissions, negotiated contexts, and timeout settings. |
| GET/MOVE resolves with incomplete data | Inspect the final response status, failed/warning counters, and failed SOP UIDs. |
| MOVE receives nothing | Configure the destination route at the remote archive; ensure its network can reach the fixed Store listener port. |
| Store listener times out | Confirm a sender actually sent to that listener; waiting for a first object has a deadline. |
| Store call resolves but data was rejected | Inspect `.first().ok` and `.dimseStatus`, including per-object batch results. |
| JPEG2000 decoder has no runtime | Initialize a compatible module and register it before decoding; serve its WASM assets separately. |

Use `try/catch` around `await pipeline.process(...)` to report transport and malformed-input errors. For DIMSE, include `error.dimse` when present. Do not infer successful retrieval merely from the absence of a thrown warning.

## Source checkout, documentation, and validation

The implementation lives in the `easi-js` directory of the [EASI platform repository](https://github.com/davidvaccaro/easi-platform). From a checkout:

```bash
cd easi-js
npm ci
npm run kitchen-sink
```

Open **http://127.0.0.1:8080** for the Kitchen Sink, then open the browser console to exercise and inspect the actions. Use the [Kitchen Sink guide](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/samples/kitchen-sink/README.md) for archive/Orthanc configuration and preview-server details. Stop the development server with Ctrl+C. The workbench and its optional demo dependencies stay in the source checkout; they are not shipped in the npm library.

Click **Use sample** in **Read DICOM** to generate an invented three-frame DICOM file for parsing, preview, FHIR mapping, and attribute selection. The XML metadata example also uses invented values. Public tests and default benchmarks generate their inputs independently, including real compressed-format test vectors; no original medical images are included in the source tree or required to run them. Your own files remain usable through file pickers and the optional local corpus harness. See the [local data guide](https://github.com/davidvaccaro/easi-platform/blob/main/data/README.md) and [synthetic fixture documentation](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/test/fixtures/dicom/README.md).

For an offline functional run, use `npm run harness:synthetic`. It generates eight formats, checks all six pipeline scenarios and exact transcoded pixels, and writes its report under ignored `test/output/`. The separate `harness:test-library` command remains available for an explicitly chosen local corpus.

Further reading:

- [Pipeline builder and extension contracts](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/doc/builders/PipelineBuilder.md)
- [FHIR ImagingStudy mapping options](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/doc/handlers/mappings/DicomToFHIRImagingStudyMapping.md)
- [DIMSE operations, routing, status, and limits](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/doc/DIMSE_V1.md)
- [Decoder/provider setup](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/doc/codecs/Decoders.md)
- [CI workflow](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/doc/CI.md) and [release checklist](https://github.com/davidvaccaro/easi-platform/blob/main/easi-js/doc/RELEASE_CHECKLIST.md)
- [Changelog](CHANGELOG.md)

From `easi-js`, validate and regenerate the candidate:

```bash
npm test -- --runInBand
npm run source:check
npm run docs:readme:check
npm run package:check
npm run package:check -- --browser
npm run package:pack
```

`docs:readme:check` installs the exact archive into a clean consumer, verifies that its README matches this file and its local links resolve, and executes the marked offline examples with synthetic data. `package:check` verifies public imports and DICOM/read/write/selection/FHIR workflows, builds a browser consumer, and checks that the Node-only entry is excluded in browsers. `--browser` also executes it in isolated Chrome; set `EASI_BROWSER_BIN` for a nonstandard executable path.

`package:pack` writes the archive and integrity/inventory manifest under `artifacts/`. The allowlist includes JavaScript runtime files, this README, changelog, and license/notices. Sample/patient data, tests, tools, the Kitchen Sink, coverage, and codec binaries are excluded. Packing and these validation commands do not publish to npm. Optional socket/Orthanc checks are described in CI; API-contract tests additionally need the companion canonical contracts checkout.

## License and commercial enquiries

EASI JS is **source-available under the EASI JS Community License**, with a separate paid commercial license. Qualifying individuals, research institutions, independent nonprofits, and organization groups with annual consolidated gross revenue **strictly below USD 5 million** may use the covered software without a license fee, subject to the full [LICENSE](LICENSE). Other organizations require commercial licensing outside the license's evaluation/transition allowances. A corporation's internal R&D does not automatically qualify as exempt academic research.

Commercial licensing enquiries: **[dvaccaro@xinonix.com](mailto:dvaccaro@xinonix.com)**.

Third-party components retain their original terms: see [NOTICE](NOTICE), the [Apache-2.0 text](licenses/Apache-2.0.txt), [jpeg-js terms](licenses/jpeg-js-BSD-3-Clause.txt), [lossless JPEG terms](licenses/jpeg-lossless-decoder-js-MIT.txt), and the optional provider's [OpenJPEG](licenses/OpenJPEG-BSD-2-Clause.txt)/[JavaScript wrapper](licenses/openjpegjs-MIT.txt) terms. This is not an OSI-approved open-source license. Sample/patient data and separately licensed specifications are outside this grant. DICOM and FHIR names identify standards and do not imply certification or endorsement.
