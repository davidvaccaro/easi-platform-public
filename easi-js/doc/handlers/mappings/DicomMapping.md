# `DicomMapping` Class

The `DicomMapping` class defines DICOM&reg;-to-target mapping behavior used by streaming mapping handlers.

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

Add a mapping for the specified DICOM&reg; Tag.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `tag` | `Tag` | The specified DICOM&reg; Tag. |
| `property` | `string` | The property The property name or path to a property within an object hierarchy. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `hasTag(tag)`

Determine if the mapping has the current DICOM&reg; Tag.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `tag` | `Tag` | The specified DICOM&reg; Tag. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | TRUE if the mapping maps the DICOM&reg; Tag, FALSE otherwise. |

---

### `mapAttribute(context, attribute)`

Map the attribute to the destination property.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `object` | — |
| `attribute` | `Attribute` | — |

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
