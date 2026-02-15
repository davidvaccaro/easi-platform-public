# `DicomSelection` Class

The `DicomSelection` class defines DICOM tag selection behavior for selective stream extraction workflows.

---

## Inheritance

```text
DicomSelection → Selection
```

## Constructor

```js
new DicomSelection()
```

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `matching` | `*` | Instance property initialized in constructor. |
| `maximumTag` | `*` | Accessor property. |

## Methods

### `addTag(tag)`

Add a selection item for the specified DICOM Tag.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `tag` | `Tag` | The specified DICOM Tag. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `hasTag(tag)`

Determine if the selection item has the current DICOM Tag.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `tag` | `Tag` | The specified DICOM Tag. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | TRUE if the selection item contains the DICOM Tag, FALSE otherwise. |

---

### `matchAttribute(context, attribute)`

Match the specified attribute.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `object` | — |
| `attribute` | `Attribute | AttributeSequence` | — |

#### Returns

*(None — return value not explicitly documented.)*

---

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

---

### `isComplete(context)`

Gets the "complete" status of the current context.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

## Usage Example

```js
import DicomSelection from '../../../src/handlers/selections/DicomSelection.js';
import Tag from '../../../src/dicom/Tag.js';

const selection = new DicomSelection();
selection.addTag(Tag.PatientName);
selection.addTag(Tag.PatientID);

// Used by StreamingDicomSelectingHandler during parser callbacks.
```
---
