# `DicomInstanceHandler` Class

The `DicomInstanceHandler` class handles parser lifecycle callbacks to build or transform stream parse results.

---

## Inheritance

```text
DicomInstanceHandler → (none)
```

## Constructor

```js
new DicomInstanceHandler()
```

## Methods

### `onReset()`

Called when the parser is reset.

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartInstance(context)`

Called at the beginning of a new DICOM&reg; instance.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartPreamble(context, preamble)`

Called when the parser encounters the 128-byte preamble.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `object` | The same context object that was returned by the implementor from the onStartInstance event method. |
| `preamble` | `object` | An object that holds the 128-byte preamble data. |

#### Returns

The implementor can optionally return any of the following:
- null or Status.CONTINUE: Indicates that the parser should simply continue parsing.
- Status.SKIP: Indicates that the parser should SKIP the Preamble and continue parsing.
- Status.STOP: Indicates that the parser should STOP parsing entierly and relinquish control back to the caller.
- Status.FAIL: Indicates that the parser should STOP parsing entierly and return an error back to the caller.

---

### `onStartPrefix(context, prefix)`

Called when the parser encounters the 4-byte prefix.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `object` | The same context object that was returned by the implementor from the onStartInstance event method. |
| `prefix` | `object` | PAn object that holds the 4-byte prefix data. |

#### Returns

The implementor can optionally return any of the following:
- null or Status.CONTINUE: Indicates that the parser should simply continue parsing.
- Status.SKIP: Indicates that the parser should SKIP the Prefix and continue parsing.
- Status.STOP: Indicates that the parser should STOP parsing entierly and relinquish control back to the caller.
- Status.FAIL: Indicates that the parser should STOP parsing entierly and return an error back to the caller.

---

### `onStartAttribute(context, attribute)`

Called when the parser encounters a new attribute.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `object` | The same context object that was returned by the implementor from the onStartInstance event method. |
| `attribute` | `object` | An attribute object that hosts a "tag" field and a "data" field. |

#### Returns

The implementor can optionally return any of the following:
- null or Status.CONTINUE: Indicates that the parser should simply continue parsing.
- Status.SKIP: Indicates that the parser should SKIP the Attribute and continue parsing.
- Status.STOP: Indicates that the parser should STOP parsing entierly and relinquish control back to the caller.
- Status.FAIL: Indicates that the parser should STOP parsing entierly and return an error back to the caller.

---

### `onStartSequence(context, sequence)`

Called when the parser encounters a new sequence.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `object` | The same context object that was returned by the implementor from the onStartInstance event method. |
| `sequence` | `object` | A sequence attribute object, derived from the attribute, representing a DICOM&reg; sequence. |

#### Returns

The implementor can optionally return any of the following:
- null or Status.CONTINUE: Indicates that the parser should simply continue parsing.
- Status.SKIP: Indicates that the parser should SKIP the Sequence (and all child Items) and continue parsing.
- Status.STOP: Indicates that the parser should STOP parsing entierly and relinquish control back to the caller.
- Status.FAIL: Indicates that the parser should STOP parsing entierly and return an error back to the caller.

---

### `onStartItem(context)`

Called when the parser encounters a new item within a sequence.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `object` | The same context object that was returned by the implementor from the onStartInstance event method. |

#### Returns

The implementor can optionally return any of the following:
- null or Status.CONTINUE: Indicates that the parser should simply continue parsing.
- Status.SKIP: Indicates that the parser should SKIP the Item and continue parsing.
- Status.STOP: Indicates that the parser should STOP parsing entierly and relinquish control back to the caller.
- Status.FAIL: Indicates that the parser should STOP parsing entierly and return an error back to the caller.

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
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';

const parser = new DicomDataParser();
parser.handler = new DicomInstanceHandler();

// Parser lifecycle events now build Instance/MetaSet/DataSet output.
```
---
