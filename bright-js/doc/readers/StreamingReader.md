# `StreamingReader` Class

The `StreamingReader` class coordinates streamed data reading and forwards data into configured parsers/handlers.

---

## Inheritance

```text
StreamingReader → (none)
```

## Constructor

```js
new StreamingReader()
```

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `onPart` | `*` | Accessor property. |
| `parser` | `*` | Accessor property. |

## Methods

### `parseContentType(response)`

Parse the content-type from the response.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `response` | `Response` | The response. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The contentType header parsed as an object. |

---

### `readUrl(url)`

Read a DICOM instance from the response content of specified URL.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `url` | `string` | The specified URL to a DICOM instance. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | A Promise that resolves to the result from the DICOM parse operation. |

---

### `readData(data)`

Read a DICOM instance from the specified data.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `data` | `Uint8Array` | The specified data. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | A Promise that resolves to the result from the DICOM parse operation. |

---

### `read(source)`

Read a DICOM instance from the specified source of data.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `source` | `string | Uint8Array` | The specified source of data. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | A Promise that resolves to the result from the DICOM parse operation. |

## Usage Example

```js
import StreamingReader from '../../src/readers/StreamingReader.js';
import StreamingDicomDataParser from '../../src/parsers/StreamingDicomDataParser.js';
import StreamingDicomInstanceHandler from '../../src/handlers/StreamingDicomInstanceHandler.js';

const reader = new StreamingReader();
const parser = new StreamingDicomDataParser();
parser.handler = new StreamingDicomInstanceHandler();
reader.parser = parser;

const instance = await reader.read('https://example.org/instance.dcm');
```
---
