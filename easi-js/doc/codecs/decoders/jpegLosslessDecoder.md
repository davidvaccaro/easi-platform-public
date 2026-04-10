# `JpegLosslessDecoder` Class

The `JpegLosslessDecoder` class provides pixel decoding functionality for DICOM&reg; image data processing.

---

## Inheritance

```text
JpegLosslessDecoder → (none)
```

## Constructor

```js
new JpegLosslessDecoder(dicomObject)
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
import JpegLosslessDecoder from '../../../src/codecs/decoders/JpegLosslessDecoder.js';

const decoder = new JpegLosslessDecoder(dicomObject);
const rgba = decoder.decode();
```
---
