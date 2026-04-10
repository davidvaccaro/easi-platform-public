# `Module` Class

A DICOM&reg; Module is a logical grouping of attributes (data elements) that describe a specific aspect of a DICOM&reg; entity (e.g., Patient, Study, Series, Image, etc.). Modules define which attributes are required, optional, or conditional in a given context and are used as building blocks in Information Object Definitions (IODs). Each IOD is composed of multiple modules appropriate to its purpose (e.g., CT Image IOD includes Patient Module, General Study Module, CT Image Module, etc.).

The EASI DICOM&reg; `Module` class provides accesst to the `AttributeSet` as well as a number of accessor methods used to access and parse DICOM&reg; string-based number representations while respecting value multiplicity (VM).

For further details on Modality in the DICOM&reg; Standard, see: 

[Official DICOM&reg; Standard — Modules](https://dicom.nema.org/medical/dicom/current/output/chtml/part03/chapter_A.html#sect_A.1.3.1)

---

## Constructor

### `constructor(attributeSet)`

Creates a new instance of the `Module` class with the specified `AttributeSet` set.

#### Parameters

| Parameter     | Type | Description                        |
|---------------|------|------------------------------------|
| `attributeSet` | `AttributeSet`  | The associated EASI DICOM&reg; `AttributeSet` |

---

## Methods

### `accessIntegerString(value, vm)`

Parses a DICOM&reg; IS (Integer String) value, considering the value multiplicity.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `tag`   | `Tag`  | The `Tag` identiying an IS value (e.g., `"1\\2\\3"`) |
| `vm`      | `number | string`  | The value multiplicity object (e.g., `{ Exact: 1 }`) |

#### Returns

- A single integer if `vm.Exact == 1`
- An array of integers if `vm.Exact > 1`
- `null` if the value is empty

---

### `(value, vm)`

Parses a DICOM&reg; DS (Decimal String) value, considering the value multiplicity.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `value`   | `Tag`  | The `Tag` identifying an DS value (e.g., `"3.14\\2.71"`) |
| `vm`      | `number | string`  | The value multiplicity object (e.g., `{ Exact: 1 }`) |

#### Returns

- A single float if `vm.Exact == 1`
- An array of floats if `vm.Exact > 1`
- `null` if the value is empty

---

## Usage Example

```javascript
import Module from './Module';
import Tag from './Tag';
import AttributeSet from './AttributeSet';

// Create a new AttributeSet and add a sample integer string attribute
let attributeSet = new AttributeSet();
attributeSet.add({
  tag: Tag.NumberOfSlices, // Example tag
  value: '5\\10\\15'
});

// Initialize the Module with the AttributeSet
let module = new Module(attributeSet);

// Access an integer string value with VM = 1 (default)
let sliceCount = module.(Tag.NumberOfSlices);
console.log(sliceCount); // Output: 15

// Access an integer string value with VM = N
let sliceCounts = module.accessIntegerString(Tag.NumberOfSlices, { Exact: 3 });
console.log(sliceCounts); // Output: [5, 10, 15]

// Add a sample decimal string attribute
attributeSet.add({
  tag: Tag.PixelSpacing, // Example tag
  value: '0.5\\0.5'
});

// Access a decimal string value
let pixelSpacing = module.accessDecimalString(Tag.PixelSpacing, { Exact: 2 });
console.log(pixelSpacing); // Output: [0.5, 0.5]
```