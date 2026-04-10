# `DicomNativePixelDataToRGBADecoder` Class

The `DicomNativePixelDataToRGBADecoder` class provides pixel decoding functionality for DICOM&reg; image data processing.

---

## Inheritance

```text
DicomNativePixelDataToRGBADecoder → (none)
```

## Constructor

```js
new DicomNativePixelDataToRGBADecoder(dicomObject)
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

### `generatePixelMask(bitsPerPixel, numUnmaskedBits)`

Generate a mask suitable for masking out unsued bits.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `bitsPerPixel` | `number` | The bits per pixel that this mask will be applied to. |
| `numUnmaskedBits` | `number` | The number of bits that should remain unmasked. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The pixel bit mask. |

---

### `decode8BitDICOMMonochromeToRGB(source, sourceStart, sourceStop, destination, destinationStart, bitsPerPixel, windowCenter, windowWidth)`

Decode the specified source 8-bit DICOM&reg; MONOCHROME pixel-data into the destination buffer as standard RGBA pixel-data.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `source` | `Uint8Array` | The source DICOM&reg; MONOCHROME pixel-data. |
| `sourceStart` | `number` | The index into the source pixel-data buffer to START processing. |
| `sourceStop` | `number` | The index into the source pixel-data buffer to STOP processin. |
| `destination` | `Uint8Array` | The destination buffer to store the decoded RGBA pixel-data. |
| `destinationStart` | `number` | The index into the destination pixel-data buffer to start processing. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | TRUE if the conversion succeeded, FALSE otherwise. |

---

### `decode16BitDICOMMonochromeToRGB(source, sourceStart, sourceStop, destination, destinationStart, bitsPerPixel, windowCenter, windowWidth)`

Decode the specified source 8-bit DICOM&reg; MONOCHROME pixel-data into the destination buffer as standard RGBA pixel-data.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `source` | `Uint8Array` | The source DICOM&reg; MONOCHROME pixel-data. |
| `sourceStart` | `number` | The index into the source pixel-data buffer to START processing. |
| `sourceStop` | `number` | The index into the source pixel-data buffer to STOP processin. |
| `destination` | `Uint8Array` | The destination buffer to store the decoded RGBA pixel-data. |
| `destinationStart` | `number` | The index into the destination pixel-data buffer to start processing. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | TRUE if the conversion succeeded, FALSE otherwise. |

---

### `decode(source, sourceStart, sourceStop, destination, destinationStart, windowCenter, windowWidth)`

Decode the specificed data to the output buffer.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `source` | `Uint8Array` | The Uint8Array that serves as the source of the decode operation. |
| `sourceStart` | `number` | The index into the input array to START reading decode input. |
| `sourceStop` | `number` | The index into the input array to STOP reading decode input. |
| `destination` | `Uint8Array` | The Uint8Array that serves as the destination of the decode operation. |
| `destinationStart` | `number` | The index into the output array to START writing decoded output. |

#### Returns

*(None — return value not explicitly documented.)*

## Usage Example

```js
import DicomNativePixelDataToRGBADecoder from '../../../src/codecs/decoders/DicomNativePixelDataToRGBADecoder.js';

const decoder = new DicomNativePixelDataToRGBADecoder(dicomObject);
const rgba = decoder.decode();
```
---
