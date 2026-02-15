# `jpegLosslessDecoder` Class

The `jpegLosslessDecoder` class provides pixel decoding functionality for DICOM image data processing.

---

## Inheritance

```text
jpegLosslessDecoder → (none)
```

## Constructor

```js
new jpegLosslessDecoder(dicomObject)
```

### Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `dicomObject` | `*` | `—` | — |

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `dicomObject` | `*` | Instance property initialized in constructor. |

## Methods

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
import jpegLosslessDecoder from '../../../src/codecs/decoders/jpegLosslessDecoder.js';

const decoder = new jpegLosslessDecoder(dicomObject);
const rgba = decoder.decode();
```
---
