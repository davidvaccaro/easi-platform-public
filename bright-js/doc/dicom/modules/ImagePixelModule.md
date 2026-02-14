# ImagePixelModule Class

Provides access to the **Image Pixel Module** of a DICOM object, exposing key attributes related to pixel structure, image dimensions, and photometric interpretation.

---

## Inheritance

```text
ImagePixelModule → Module
```

## Constructor

### `new ImagePixelModule(attributeSet)`

Creates a new instance of the `ImagePixelModule`.

#### Parameters

| Name           | Type           | Description                                     |
|----------------|----------------|-------------------------------------------------|
| `attributeSet` | `AttributeSet` | The attribute set containing pixel-related tags.|

---

## Properties

### `samplesPerPixel`

Gets the number of samples per pixel. Defaults to `1` for MONOCHROME if not specified.

**Returns:** `number`

---

### `photometricInterpretation`

Gets the photometric interpretation type.

**Returns:** `PhotometricInterpretationType`

---

### `planarConfiguration`

Gets the planar configuration value.

**Returns:** `number`

---

### `rows`

Gets the number of image rows.

**Returns:** `number`

---

### `columns`

Gets the number of image columns.

**Returns:** `number`

---

### `pixelAspectRatio`

Gets the pixel aspect ratio.

**Returns:** `number[]` — array of two integers `[horizontal, vertical]`

---

### `bitsAllocated`

Gets the number of bits allocated per pixel sample.

**Returns:** `number`

---

### `bitsStored`

Gets the number of bits actually stored per sample.

**Returns:** `number`

---

### `highBit`

Gets the high bit position.

**Returns:** `number`

---

### `pixelRepresentation`

Gets the pixel representation (0 = unsigned, 1 = signed).

**Returns:** `number`

---

### `smallestImagePixelValue`

Gets the smallest pixel value in the image.

**Returns:** `number`

---

### `largestImagePixelValue`

Gets the largest pixel value in the image.

**Returns:** `number`

---

### `pixelData`

Gets the actual pixel data.

**Returns:** `any`

---

### `imageSize`

Calculates the total image size in bytes using:  
`rows * columns * samplesPerPixel * (bitsAllocated / 8)`

**Returns:** `number`

---

## Example Usage

```javascript
import ImagePixelModule from './ImagePixelModule';
import AttributeSet from './AttributeSet';
import Tag from './Tag';

const attributes = new AttributeSet();
attributes.add({ tag: Tag.Rows, value: 512 });
attributes.add({ tag: Tag.Columns, value: 512 });
attributes.add({ tag: Tag.BitsAllocated, value: 16 });
attributes.add({ tag: Tag.SamplesPerPixel, value: 1 });

const pixelModule = new ImagePixelModule(attributes);

console.log(pixelModule.imageSize); // 524288 bytes (512 × 512 × 1 × 2)
```