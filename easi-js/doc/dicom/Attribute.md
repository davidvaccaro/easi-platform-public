# `Attribute` Class

The `Attribute` class represents a single DICOM&reg; attribute, providing access to its parsed value from raw DICOM&reg; data based on the tag’s Value Representation (VR).

## Inheritance

```text
Attribute → DataElement → EncodedData → Data
```
---

## Constructor

```js
new Attribute(tag, valueLength, data, transferSyntax)
```

### Parameters

| Parameter         | Type             | Description                                          |
|-------------------|------------------|------------------------------------------------------|
| `tag`             | `Tag`            | The DICOM&reg; tag corresponding to this attribute.       |
| `valueLength`     | `number`         | The length in bytes of the attribute value.          |
| `data`            | `Uint8Array`     | The raw byte data for this attribute.                |
| `transferSyntax`  | `TransferSyntax` | The transfer syntax used to decode this attribute.   |

---

### `get value`

Retrieves the value of the attribute, automatically decoding the raw data based on the attribute's Value Representation (VR).

#### Returns

| Type            | Description |
|-----------------|-------------|
| `any`           | The decoded value of the attribute. Type depends on VR (e.g., number, string, `Date`, `Uint8Array`, etc.). |

---

### `set value(value)`

Sets an override value for the attribute, which takes precedence over the decoded value from the raw data.

#### Parameters

| Parameter | Type  | Description                                             |
|-----------|-------|---------------------------------------------------------|
| `value`   | `any` | The override value to set for this attribute instance.   |

#### Returns

| Type  | Description            |
|-------|------------------------|
| `void`| No return value.        |

## Example Usage

```js
import Attribute from 'easi-dicom/dicom/Attribute';
import Tag from 'easi-dicom/dicom/Tag';
import TransferSyntax from 'easi-dicom/dicom/TransferSyntax.js';

// Example: Construct a DICOM&reg; Attribute and get its value
const tag = Tag.FileMetaInformationVersion;
const valueLength = 2;
const data = new Uint8Array([0x00, 0x01]);

const attr = new Attribute(tag, valueLength, data, TransferSyntax.ExplicitVRLittleEndian);

console.log(attr.value);
```