# Image Decoders

EASI DICOM includes several decoder classes that convert DICOM pixel data into usable image buffers.  

All decoders implement a common public interface with a `decode()` method and a constructor that accepts a DICOM object.

---

## Shared Decoder Interface

### Constructor

```js
new Decoder(dicomObject)
```
#### Parameters

| Parameter      | Type    | Description                              |
|----------------|---------|------------------------------------------|
| `dicomObject`  | `*`     | The DICOM object associated with the pixel data. |
### `decode(source, sourceStart, sourceStop, destination, destinationStart, windowCenter, windowWidth)`

Decodes image pixel data from the source buffer to the destination buffer.

#### Parameters

| Parameter          | Type          | Description                                   |
|--------------------|---------------|-----------------------------------------------|
| `source`           | `Uint8Array`  | The input byte array containing encoded pixel data. |
| `sourceStart`      | `number`      | Index into `source` to start reading.         |
| `sourceStop`       | `number`      | Index into `source` to stop reading.          |
| `destination`      | `Uint8Array`  | The output byte array to receive decoded pixels. |
| `destinationStart` | `number`      | Index into `destination` to start writing.    |
| `windowCenter`     | `number`      | Window center (optional — for contrast adjustment). |
| `windowWidth`      | `number`      | Window width (optional — for contrast adjustment). |

#### Returns

| Type    | Description                         |
|---------|-------------------------------------|
| *(None)*| Writes output to the destination buffer. |
## Implementations

### `JpegDecoder`

Decodes JPEG Baseline (8-bit lossy) DICOM pixel data.  
Supports transfer syntax: `TransferSyntax.JPEGBaseline8Bit`.

---

### `JpegLosslessDecoder`

Decodes JPEG Lossless (14-bit) DICOM pixel data.  
Supports transfer syntaxes:

- `TransferSyntax.JPEGLossless`
- `TransferSyntax.JPEGLosslessSV1`

---

### `DicomNativePixelDataToRGBADecoder`

Decodes native, uncompressed DICOM pixel data into RGBA output.  
Supports transfer syntax: `TransferSyntax.NONE`.

## Usage Example

```js
import Configuration from 'easi-dicom';
import TransferSyntax from 'easi-dicom/dicom/TransferSyntax.js';

// Get a decoder for the specified transfer syntax
const decoder = Configuration.global.getDecoderFor(TransferSyntax.JPEGBaseline8Bit, dicomObject);

// Prepare buffers
const sourceBuffer = ...; // Uint8Array with compressed pixel data
const destinationBuffer = new Uint8Array(decodedLength);

// Perform decode
decoder.decode(
    sourceBuffer,
    0,
    sourceBuffer.length,
    destinationBuffer,
    0,
    windowCenter,
    windowWidth
);
```
