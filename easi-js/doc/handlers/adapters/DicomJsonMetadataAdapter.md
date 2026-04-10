# `DicomJsonMetadataAdapter` Class

The `DicomJsonMetadataAdapter` class adapts DICOMweb&trade; JSON metadata parser events into canonical DICOM&reg; semantic handler events so shared downstream handlers (instance, selection, mapping, de-identification, DICOM&reg; writer) can be reused.

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
| `nextHandler` | `object \| null` | Downstream canonical DICOM&reg; semantic handler that receives replayed DICOM&reg; lifecycle events. |

## Purpose

- Consumes JSON parser callbacks produced by `JsonDataParser`.
- Reconstructs DICOM&reg; `Instance`/`Attribute`/`AttributeSequence` objects from DICOMweb&trade; metadata.
- Replays canonical DICOM&reg; lifecycle events to `nextHandler`.
- Preserves handler-chain composition for shared DICOM&reg; handlers across native DICOM&reg; and DICOMweb&trade; metadata sources.

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

