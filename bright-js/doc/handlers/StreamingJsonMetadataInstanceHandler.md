# `StreamingJsonMetadataInstanceHandler` Class

The `StreamingJsonMetadataInstanceHandler` class handles parser lifecycle callbacks to build or transform stream parse results.

---

## Inheritance

```text
StreamingJsonMetadataInstanceHandler → (none)
```

## Constructor

```js
new StreamingJsonMetadataInstanceHandler()
```

## Methods

### `onReset()`

Performs class-specific behavior.

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStart(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartObject(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartArray(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndArray(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartAttribute(context, name)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `name` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartNumber(context, value)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `value` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onStartString(context, value)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `value` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onAppendString(context, value)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `value` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndString(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndObject(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndAttribute(context, name)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `name` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEndNumber(context, value)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |
| `value` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `onEnd(context)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

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
import StreamingJsonDataParser from '../../src/parsers/StreamingJsonDataParser.js';
import StreamingJsonMetadataInstanceHandler from '../../src/handlers/StreamingJsonMetadataInstanceHandler.js';

const parser = new StreamingJsonDataParser();
parser.handler = new StreamingJsonMetadataInstanceHandler();

// Feed parser with DICOM JSON metadata chunks to build instance output.
```
---
