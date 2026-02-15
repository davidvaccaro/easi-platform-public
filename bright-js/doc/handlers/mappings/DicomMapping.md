# `DicomMapping` Class

The `DicomMapping` class defines DICOM-to-target mapping behavior used by streaming mapping handlers.

---

## Inheritance

```text
DicomMapping → Mapping
```

## Constructor

```js
new DicomMapping()
```

## Methods

### `addTag(tag, property)`

Add a mapping for the specified DICOM Tag.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `tag` | `*` | The specified DICOM Tag. |
| `property` | `*` | The property The property name or path to a property within an object hierarchy. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `hasTag(tag)`

Determine if the mapping has the current DICOM Tag.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `tag` | `*` | The specified DICOM Tag. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | TRUE if the mapping maps the DICOM Tag, FALSE otherwise. |

---

### `mapAttribute(context, attribute)`

Map the attribute to the destination property.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | — |
| `attribute` | `*` | — |

#### Returns

*(None — return value not explicitly documented.)*

## Usage Example

```js
import DicomMapping from '../../../src/handlers/mappings/DicomMapping.js';
import Tag from '../../../src/dicom/Tag.js';

const mapping = new DicomMapping();
mapping.addTag(Tag.PatientID, 'result.patientId');

const context = { result: {} };
const attribute = { tag: Tag.PatientID, value: 'P-0001' };
mapping.mapAttribute(context, attribute);
```
---
