# `StreamingDicomSelectingHandler` Class

The `StreamingDicomSelectingHandler` class handles parser lifecycle callbacks to build or transform stream parse results.

---

## Inheritance

```text
StreamingDicomSelectingHandler → (none)
```

## Constructor

```js
new StreamingDicomSelectingHandler(selection)
```

### Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `selection` | `*` | `—` | The specified selection to apply when processing the DICOM Data. |

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `selection` | `*` | Instance property initialized in constructor. |

## Methods

### `skipAttribute(context, attribute)`

Determine if the current attribute should be skipped based on the current context and attribute data.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | The current context. |
| `attribute` | `*` | The current attribute. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `stopAttribute(context, attribute)`

Determine if the current attribute should be skipped based on the current context and attribute data.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | The current context. |
| `attribute` | `*` | The current attribute. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onReset()`

Performs class-specific behavior.

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartInstance(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartPreamble(context, preamble)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `preamble` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartPrefix(context, prefix)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `prefix` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartAttribute(context, attribute)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `attribute` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartSequence(context, sequence)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `sequence` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartItem(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onAppendAttribute(context, attribute)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `attribute` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartMetaSet(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartDataSet(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndPreamble(context, preamble)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `preamble` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndPrefix(context, prefix)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `prefix` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndAttribute(context, attribute)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `attribute` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndSequence(context, sequence)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `sequence` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndItem(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndMetaSet(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndDataSet(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndInstance(context)`

Returns the current data product constructed by this handler.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The current data product. |

---

### `onError(context, error)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `error` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onProgress(context, progress)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `progress` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

## Usage Example

```js
import StreamingDicomSelectingHandler from '../../src/handlers/StreamingDicomSelectingHandler.js';
import DicomSelection from '../../src/handlers/selections/DicomSelection.js';
import Tag from '../../src/dicom/Tag.js';

const selection = new DicomSelection();
selection.addTag(Tag.PatientID);
selection.addTag(Tag.StudyInstanceUID);

const handler = new StreamingDicomSelectingHandler(selection);
```
---
