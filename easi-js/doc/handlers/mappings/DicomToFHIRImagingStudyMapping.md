# `DicomToFHIRImagingStudyMapping` Class

The `DicomToFHIRImagingStudyMapping` class defines DICOM&reg;-to-target mapping behavior used by streaming mapping handlers.

---

## Inheritance

```text
DicomToFHIRImagingStudyMapping → DicomMapping
```

## Constructor

```js
new DicomToFHIRImagingStudyMapping()
```

## Methods

### `start(context)`

Starts a class-specific processing step.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `end(context)`

Completes a class-specific processing step.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

## Usage Example

```js
import DicomToFHIRImagingStudyMapping from '../../../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js';

const mapping = new DicomToFHIRImagingStudyMapping();
const context = mapping.start({ sequences: [] });

// mapping.mapAttribute(context, attribute) is called by the mapping handler.
const study = mapping.end(context);
```
---
