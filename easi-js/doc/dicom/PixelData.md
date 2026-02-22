# `PixelData` Class

The `PixelData` class is responsible for parsing and interpreting raw DICOM Pixel Data from the encapsulated format, including handling Basic Offset Tables and sequence items.

---

## Constructor

### `constructor(attribute)`

Constructs a DICOM Pixel Data reader.

#### Parameters

| Name      | Type   | Description                                  |
|-----------|--------|----------------------------------------------|
| attribute | `Attribute`    | The specified raw Pixel Data attribute.       |

---

## Methods

### `refresh()`

Parses the pixel data stream and determines the frame data offsets.

#### Returns

| Type     | Description                                              |
|----------|----------------------------------------------------------|
| `Array`  | An array of offset objects, each with a `start` field.   |

---

## Usage Example

```javascript
import PixelData from './PixelData.js';

// Assume 'pixelAttr' is a DICOM Pixel Data attribute obtained from parsing
const pixelData = new PixelData(pixelAttr);

// Refresh and access frame offsets
const frameOffsets = pixelData.refresh();

console.log('First frame starts at offset:', frameOffsets[0].start);
```