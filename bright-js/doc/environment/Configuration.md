# `Configuration` Class

The `Configuration` class provides global configuration for EASI DICOM including configurable elements such as which encoders/decoders to use when processing encoded pixel data.  

Decoding is manageed as a mapping between DICOM Transfer Syntaxes and their corresponding decoder instances, allowing dynamic control of how pixel data is interpreted and decoded.

---

## Constructor

(None — this is a utility class with static members.)

## Static Accessors

### `Configuration.global`

```js
Configuration.global
```
### Returns

| Type    | Description                                          |
|---------|------------------------------------------------------|
| `Configuration`  | Global `Configuration` singleton instance. |

## Properties

| Property            | Type    | Description                                   |
|---------------------|---------|-----------------------------------------------|
| `encoderPrototypes` | `Object`| Map of encoder prototypes (default: empty).    |
| `decoderPrototypes` | `Object`| Map of decoder prototypes by Transfer Syntax.  |

## Methods

### `getDecoderFor(transferSyntax, dicomObject)`

Returns a new decoder instance appropriate for the specified DICOM Transfer Syntax.

#### Parameters

| Parameter        | Type    | Description                          |
|------------------|---------|--------------------------------------|
| `transferSyntax` | `*`     | The Transfer Syntax object.           |
| `dicomObject`    | `*`     | The DICOM object to decode.           |

#### Returns

| Type     | Description                          |
|----------|--------------------------------------|
| `Object` | A newly created decoder instance.    |

---

### `setDecoderFor(transferSyntax, decoderPrototype)`

Associates a decoder prototype with a specified Transfer Syntax.

#### Parameters

| Parameter           | Type    | Description                             |
|---------------------|---------|-----------------------------------------|
| `transferSyntax`    | `*`     | The Transfer Syntax to associate.        |
| `decoderPrototype`  | `*`     | The prototype decoder instance to use.   |

#### Returns

*(None — setter method.)*

## Preconfigured Decoders

By default, `Configuration` pre-registers the following decoders:

| Transfer Syntax                     | Decoder Class                        |
|-------------------------------------|--------------------------------------|
| `TransferSyntax.JPEGBaseline8Bit`   | `jpegDecoder`                        |
| `TransferSyntax.JPEGLossless`       | `jpegLosslessDecoder`                |
| `TransferSyntax.JPEGLosslessSV1`    | `jpegLosslessDecoder`                |
| `TransferSyntax.NONE`               | `DicomNativePixelDataToRGBADecoder`  |

## Usage Example

```js
import Configuration from 'easi-dicom';
import TransferSyntax from 'easi-dicom/dicom/TransferSyntax.js';

// Obtain the global Configuration instance
const config = Configuration.global;

// Get a decoder for a specific Transfer Syntax
const decoder = config.getDecoderFor(TransferSyntax.JPEGBaseline8Bit, dicomObject);

// Use decoder...
decoder.decode();
```