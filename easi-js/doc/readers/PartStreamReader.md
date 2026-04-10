# `PartStreamReader` Class

The `PartStreamReader` class coordinates streamed data reading and forwards data into configured parsers/handlers.

---

## Inheritance

```text
PartStreamReader → (none)
```

## Constructor

```js
new PartStreamReader()
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

Read a DICOM&reg; instance from the response content of specified URL.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `url` | `string` | The specified URL to a DICOM&reg; instance. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | A Promise that resolves to the result from the DICOM&reg; parse operation. |

---

### `readData(data)`

Read a DICOM&reg; instance from the specified data.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `data` | `Uint8Array` | The specified data. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | A Promise that resolves to the result from the DICOM&reg; parse operation. |

---

### `read(source)`

Read a DICOM&reg; instance from the specified source of data.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `source` | `string | Uint8Array` | The specified source of data. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | A Promise that resolves to the result from the DICOM&reg; parse operation. |

## Usage Example

```js
import PartStreamReader from '../../src/readers/PartStreamReader.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';

const reader = new PartStreamReader();
const parser = new DicomDataParser();
parser.handler = new DicomInstanceHandler();
reader.parser = parser;

const instance = await reader.read('https://example.org/instance.dcm');
```
---
