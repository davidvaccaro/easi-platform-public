# `JpegDecoder` Class

The `JpegDecoder` class provides pixel decoding functionality for DICOM&reg; image data processing.

---

## Inheritance

```text
JpegDecoder → (none)
```

## Constructor

```js
new JpegDecoder()
```

## Methods

### `static getonStartSequence()`

Returns the current `onStartSequence` value.

#### Returns

*(None — return value not explicitly documented.)*

---

### `static getEndSequence()`

Returns the current `EndSequence` value.

#### Returns

*(None — return value not explicitly documented.)*

---

### `indexOf(data, begin, sequence)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `data` | `*` | Parameter accepted by method. |
| `begin` | `*` | Parameter accepted by method. |
| `sequence` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `decode(source, sourceStart, sourceStop, destination, destinationStart)`

Performs class-specific behavior.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `source` | `*` | Parameter accepted by method. |
| `sourceStart` | `*` | Parameter accepted by method. |
| `sourceStop` | `*` | Parameter accepted by method. |
| `destination` | `*` | Parameter accepted by method. |
| `destinationStart` | `*` | Parameter accepted by method. |

#### Returns

*(None — return value not explicitly documented.)*

## Usage Example

```js
import JpegDecoder from '../../../src/codecs/decoders/JpegDecoder.js';

const decoder = new JpegDecoder(dicomObject);
const rgba = decoder.decode();
```
---
