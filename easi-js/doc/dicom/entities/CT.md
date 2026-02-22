# CT Class

The `CT` class extends the `Image` class and represents a DICOM Computed Tomography (CT) object. It provides access to CT-specific modules such as the Image Plane Module.

---

## Inheritance

```text
CT → Image → Entity
```

## Constructor

### `new CT(attributeSet)`

Constructs a new `CT` instance from a DICOM attribute set.

#### Parameters

| Name           | Type           | Description                                  |
|----------------|----------------|----------------------------------------------|
| `attributeSet` | `AttributeSet` | The DICOM attribute set used by this CT object. |

---

## Properties

### `imagePlaneModule`

Returns an instance of the **Image Plane Module** associated with the CT image.

**Type:** `ImagePlaneModule`

**Description:** Provides access to spatial positioning, orientation, and pixel spacing of the CT image.

---

## Example Usage

```javascript
import CT from './dicom/object/CT.js';
import Tag from './dicom/Tag.js';
import AttributeSet from './dicom/AttributeSet.js';

const attrs = new AttributeSet();
attrs.add({ tag: Tag.Modality, value: 'CT' });

const ct = new CT(attrs);

const plane = ct.imagePlaneModule;
console.log('Slice Thickness:', plane.sliceThickness);
console.log('Pixel Spacing:', plane.pixelSpacing);
```