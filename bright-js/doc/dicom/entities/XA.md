# XA Class

The `XA` class extends the `Image` class and represents a DICOM X-Ray Angiographic (XA) object. It inherits all functionality from the `Image` class and is used to model XA-specific DICOM images.

---

## Inheritance

```text
XA → Image → Entity
```

## Constructor

### `new XA(attributeSet)`

Constructs a new `XA` instance from a DICOM attribute set.

#### Parameters

| Name           | Type           | Description                                  |
|----------------|----------------|----------------------------------------------|
| `attributeSet` | `AttributeSet` | The DICOM attribute set used by this XA object. |

---

## Example Usage

```javascript
import XA from './dicom/object/XA.js';
import Tag from './dicom/Tag.js';
import AttributeSet from './dicom/AttributeSet.js';

const attrs = new AttributeSet();
attrs.add({ tag: Tag.Modality, value: 'XA' });

const xa = new XA(attrs);

console.log('Is Multi-Frame:', xa.isMultiFrame);
```