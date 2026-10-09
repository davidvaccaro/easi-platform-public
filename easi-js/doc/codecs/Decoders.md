# Image Decoders

EASI JS includes decoder classes that convert DICOM&reg; pixel data and supported image payloads into usable RGBA buffers.

Import decoder classes from `@xinonix/easi-js/codecs`. DICOM pixel decoders accept an optional DICOM image context; standalone image decoders such as `PngDecoder` can be constructed without one. The `decode()` interface writes into a caller-supplied destination buffer. Some implementations are asynchronous, so use `await` when calling a decoder generically.

---

## Shared Decoder Interface

### Constructor

```js
new Decoder(dicomObject)
```
#### Parameters

| Parameter      | Type    | Description                              |
|----------------|---------|------------------------------------------|
| `dicomObject`  | `object \| null` | Optional DICOM&reg; image context associated with the pixel data. |
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
| `boolean \| Promise<boolean>` | Indicates whether decoding succeeded; output is written to the destination buffer. Invalid or unsupported input can throw an error. |
## Implementations

### `JpegDecoder`

Decodes JPEG Baseline (8-bit lossy) DICOM&reg; pixel data.  
Supports transfer syntax: `TransferSyntax.JPEGBaseline8Bit`.

---

### `JpegLosslessDecoder`

Decodes DICOM&reg; JPEG Lossless pixel data.
Supports transfer syntaxes:

- `TransferSyntax.JPEGLossless`
- `TransferSyntax.JPEGLosslessSV1`

---

### `DicomNativePixelDataToRGBADecoder`

Decodes native, uncompressed DICOM&reg; pixel data into RGBA output.  
Supports transfer syntax: `TransferSyntax.NONE`.

## Usage Example

```js
import EASI, { TransferSyntax } from '@xinonix/easi-js';

const registry = EASI.codecRegistryBuilder().withDefaultCodecs().build();

// sourceBuffer contains one encoded JPEG Baseline frame. Supply its dimensions
// and the DICOM image context when your decoder needs pixel metadata.
async function decodeJpegFrame(sourceBuffer, width, height, dicomObject = null) {
    const decoder = registry.getDecoderForTransferSyntax(
        TransferSyntax.JPEGBaseline8Bit,
        dicomObject
    );
    const destinationBuffer = new Uint8Array(width * height * 4);
    const success = await decoder.decode(
        sourceBuffer, 0, sourceBuffer.length, destinationBuffer, 0
    );
    if (success !== true) {
        throw new Error('JPEG frame decoding did not succeed.');
    }
    return destinationBuffer;
}
```

For standalone supported PNG payloads, `PngDecoder.decodeImage()` returns the dimensions and RGBA bytes together:

```js
import { PngDecoder } from '@xinonix/easi-js/codecs';

async function decodePng(sourceBytes) {
    return await new PngDecoder().decodeImage(sourceBytes);
    // { width, height, bytes: Uint8Array }
}
```

## Optional OpenJPEG runtime

The npm library does not load or bundle an OpenJPEG binary automatically. JPEG2000 decoding requires a compatible, initialized module with a `J2KDecoder` constructor. EASI calls the decoder's `getEncodedBuffer()`, `decode()`, `getFrameInfo()`, and `getDecodedBuffer()` methods. Encoding also requires the encoder methods used by `Jpeg2000RgbaEncoder`; an arbitrary JPEG2000 WebAssembly module may expose a different API.

Initialize your selected provider in your application and register the resolved module before decoding:

```js
import { OpenJpegRuntime } from '@xinonix/easi-js/codecs';

// createOpenJpegModule is supplied by your chosen compatible codec provider.
// moduleOptions may include its WASM URL/locateFile or wasmBinary configuration.
async function configureOpenJpeg(createOpenJpegModule, moduleOptions = {}) {
    const module = await createOpenJpegModule(moduleOptions);
    if (typeof module?.J2KDecoder !== 'function') {
        throw new Error('The provider must expose a compatible J2KDecoder.');
    }
    OpenJpegRuntime.setModule(module);
    return module;
}
```

`Jpeg2000Decoder.decode()` is synchronous. Registering an unresolved asynchronous factory with `OpenJpegRuntime.setFactory()` alone does not make its module available to that decoder. Await initialization and call `setModule()` as shown above. A decoder can also receive a preloaded module through its `openjpegModule` property.

The source checkout's Kitchen Sink demonstrates loading the optional OpenJPEG provider's script and WASM assets. Applications must install or serve their chosen provider and its assets separately and follow its license. JPEG-LS and HTJ2K require compatible backends for their respective profiles; an ordinary OpenJPEG module does not establish HTJ2K support.
