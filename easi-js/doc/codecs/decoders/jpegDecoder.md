# `jpegDecoder` Class

The `jpegDecoder` class provides pixel decoding functionality for DICOM image data processing.

---

## Inheritance

```text
jpegDecoder → (none)
```

## Constructor

```js
new jpegDecoder()
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
import jpegDecoder from '../../../src/codecs/decoders/jpegDecoder.js';

const decoder = new jpegDecoder(dicomObject);
const rgba = decoder.decode();
```
---
