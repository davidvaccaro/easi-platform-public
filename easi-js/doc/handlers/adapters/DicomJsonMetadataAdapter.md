# `DicomJsonMetadataAdapter` Class

The `DicomJsonMetadataAdapter` class adapts DICOMweb JSON metadata parser events into canonical DICOM semantic handler events so shared downstream handlers (instance, selection, mapping, de-identification, DICOM writer) can be reused.

---

## Inheritance

```text
DicomJsonMetadataAdapter → (none)
```

## Constructor

```js
new DicomJsonMetadataAdapter(nextHandler = null)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `nextHandler` | `object \| null` | Downstream canonical DICOM semantic handler that receives replayed DICOM lifecycle events. |

## Purpose

- Consumes JSON parser callbacks produced by `JsonDataParser`.
- Reconstructs DICOM `Instance`/`Attribute`/`AttributeSequence` objects from DICOMweb metadata.
- Replays canonical DICOM lifecycle events to `nextHandler`.
- Preserves handler-chain composition for shared DICOM handlers across native DICOM and DICOMweb metadata sources.

## Usage Example

```js
import JsonDataParser from '../../../src/parsers/JsonDataParser.js';
import DicomJsonMetadataAdapter from '../../../src/handlers/adapters/DicomJsonMetadataAdapter.js';
import DicomInstanceHandler from '../../../src/handlers/terminals/DicomInstanceHandler.js';

const parser = new JsonDataParser();
parser.handler = new DicomJsonMetadataAdapter(
  new DicomInstanceHandler()
);
```

