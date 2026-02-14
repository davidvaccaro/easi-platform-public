# ImagePlaneModule Class

Provides access to DICOM **Image Plane Module** attributes such as slice thickness, image position, orientation, and pixel spacing.

## Inheritance

```text
ImagePlaneModule → Module
```

## Constructor

### `new ImagePlaneModule(attributeSet)`

Creates a new instance of `ImagePlaneModule`.

#### Parameters

| Name           | Type           | Description                                     |
|----------------|----------------|-------------------------------------------------|
| `attributeSet` | `AttributeSet` | The DICOM attribute set to extract values from. |

---

## Properties

### `sliceThickness`

Gets the **Slice Thickness** value (`Tag.SliceThickness`).

#### Returns

| Type     | Description                    |
|----------|--------------------------------|
| `string` | The slice thickness value.     |

---

### `imagePosition`

Gets the **Image Position (Patient)** value (`Tag.ImagePosition`).

#### Returns

| Type       | Description                                |
|------------|--------------------------------------------|
| `number[]` | Array of 3 decimal values (x, y, z).        |

---

### `imageOrientation`

Gets the **Image Orientation (Patient)** value (`Tag.ImageOrientation`).

#### Returns

| Type       | Description                                        |
|------------|----------------------------------------------------|
| `number[]` | Array of 6 decimal values describing orientation.  |

---

### `sliceLocation`

Gets the **Slice Location** value (`Tag.SliceLocation`).

#### Returns

| Type     | Description                          |
|----------|--------------------------------------|
| `number` | Slice location as a decimal value.   |

---

### `pixelSpacing`

Gets the **Pixel Spacing** value (`Tag.PixelSpacing`).

#### Returns

| Type       | Description                          |
|------------|--------------------------------------|
| `number[]` | Array containing row and column spacing. |

---

## Example Usage

```javascript
import ImagePlaneModule from './ImagePlaneModule';
import AttributeSet from './AttributeSet';
import Tag from './Tag';

const attributeSet = new AttributeSet();
attributeSet.add({ tag: Tag.SliceThickness, value: '5' });
attributeSet.add({ tag: Tag.ImagePosition, value: '0\\0\\-30' });
attributeSet.add({ tag: Tag.ImageOrientation, value: '1\\0\\0\\0\\1\\0' });
attributeSet.add({ tag: Tag.SliceLocation, value: '-30' });
attributeSet.add({ tag: Tag.PixelSpacing, value: '0.5\\0.5' });

const imagePlane = new ImagePlaneModule(attributeSet);

console.log(imagePlane.sliceThickness);       // '5'
console.log(imagePlane.imagePosition);        // [0, 0, -30]
console.log(imagePlane.imageOrientation);     // [1, 0, 0, 0, 1, 0]
console.log(imagePlane.sliceLocation);        // -30
console.log(imagePlane.pixelSpacing);         // [0.5, 0.5]
```