# `StreamingDicomJsonMetadataAdapter` Class

The `StreamingDicomJsonMetadataAdapter` class adapts DICOMweb JSON metadata parser events into canonical DICOM semantic handler events so shared downstream handlers (instance, selection, mapping, de-identification, DICOM writer) can be reused.

---

## Inheritance

```text
StreamingDicomJsonMetadataAdapter → (none)
```

## Constructor

```js
new StreamingDicomJsonMetadataAdapter(nextHandler = null)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `nextHandler` | `object \| null` | Downstream canonical DICOM semantic handler that receives replayed DICOM lifecycle events. |

## Purpose

- Consumes JSON parser callbacks produced by `StreamingJsonDataParser`.
- Reconstructs DICOM `Instance`/`Attribute`/`AttributeSequence` objects from DICOMweb metadata.
- Replays canonical DICOM lifecycle events to `nextHandler`.
- Preserves handler-chain composition for shared DICOM handlers across native DICOM and DICOMweb metadata sources.

## Usage Example

```js
import StreamingJsonDataParser from '../../../src/parsers/StreamingJsonDataParser.js';
import StreamingDicomJsonMetadataAdapter from '../../../src/handlers/adapters/StreamingDicomJsonMetadataAdapter.js';
import StreamingDicomInstanceHandler from '../../../src/handlers/StreamingDicomInstanceHandler.js';

const parser = new StreamingJsonDataParser();
parser.handler = new StreamingDicomJsonMetadataAdapter(
  new StreamingDicomInstanceHandler()
);
```

