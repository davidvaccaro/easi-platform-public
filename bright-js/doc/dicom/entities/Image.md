# `Image` Class

The `Image` class extends the `Entity` class and provides high-level accessors and functionality specific to DICOM image objects, including multi-frame support, windowing parameters, and pixel data decoding.

---

## Inheritance

```text
Image → Entity
```

## Constructor

### `new Image(attributeSet)`

Constructs a new DICOM `Image` instance.

#### Parameters

| Name           | Type           | Description                                  |
|----------------|----------------|----------------------------------------------|
| `attributeSet` | `AttributeSet` | The DICOM attribute set used by this image.  |

---

## Properties

### `imagePixelModule`

Returns an instance of the **Image Pixel Module**.

**Type:** `ImagePixelModule`

---

### `multiFrameModule`

Returns an instance of the **Multi Frame Module**.

**Type:** `MultiFrameModule`

---

### `visualizationFunctionModule`

Returns an instance of the **Visualization Function Module**.

**Type:** `VisualizationFunctionModule`

---

### `modalityLookUpTableModule`

Returns an instance of the **Modality Look-Up Table Module**.

**Type:** `ModalityLookUpTableModule`

---

### `isMultiFrame`

Indicates whether the image is a **multi-frame** DICOM object.

**Type:** `boolean`

**Returns:** `true` if the image contains more than one frame and the modality supports multi-frame, otherwise `false`.

---

## Methods

### `decodeFrame(destination, decoder = null, frame = 0, windowCenter = null, windowWidth = null)`

Decodes one frame of pixel data into the given destination array.

#### Parameters

| Name           | Type             | Description                                                                 |
|----------------|------------------|-----------------------------------------------------------------------------|
| `destination`  | `Uint8Array`     | The buffer to write decoded pixel values into.                             |
| `decoder`      | `Decoder`        | (Optional) A custom decoder. Defaults to a global decoder via configuration. |
| `frame`        | `number`         | (Optional) The frame index to decode (multi-frame). Defaults to `0`.       |
| `windowCenter` | `number`         | (Optional) Window center override.                                          |
| `windowWidth`  | `number`         | (Optional) Window width override.                                           |

**Returns:** `boolean` indicating success or failure of decoding.

---

## Example Usage

```javascript
import Image from './dicom/object/Image.js';
import Tag from './dicom/Tag.js';
import AttributeSet from './dicom/AttributeSet.js';

const attrs = new AttributeSet();
attrs.add({ tag: Tag.Modality, value: 'CT' });
attrs.add({ tag: Tag.PixelData, value: new Uint8Array([/* ... */]) });

const image = new Image(attrs);

// Access modules
const pixels = image.imagePixelModule;
const multiFrame = image.multiFrameModule;

// Decode frame
const output = new Uint8Array(pixels.imageSize);
const success = image.decodeFrame(output);

console.log(`Decoded: ${success}, Width: ${pixels.columns}, Height: ${pixels.rows}`);
```