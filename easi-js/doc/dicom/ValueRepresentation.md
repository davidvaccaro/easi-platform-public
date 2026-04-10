# `ValueRepresentation` Class

A DICOM&reg; Value Representation (VR) defines the data type and format of the value(s) contained in a DICOM&reg; data element, ensuring consistent interpretation across systems.

The EASI DICOM&reg; `ValueRepresentation` class is a static accessor class that defines all known DICOM&reg; Value Representations. 

It represents the full set of Value Representations values as a static map of `ValueRepresentation` instances and provides static access via well-known Names through dynamic lookup as well as exposing a full complement of static Value Representation accessor properties.

For further details on Value Representations in the DICOM&reg; Standard, see:  
[Official DICOM&reg; Standard - Value Representation (VR)](https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_6.2)

---

## Properties

Each `ValueRepresentation` instance provides:

| Property  | Type     | Description                               |
|-----------|----------|-------------------------------------------|
| `ID`      | `string` | The VR code (e.g. `'LO'`, `'SS'`).         |
| `Name`    | `string` | Full name of the VR.                       |
| `Length`  | `number` or `null` | Standard length (if fixed) or `null` for variable length. |
| `IsFixed` | `bool`   | Whether the VR has a fixed byte length.    |

## Static Methods

### `find(name)`

Finds the value representation by its name (VR string, e.g. `'LO'`, `'SS'`, `'OB'`).

#### Parameters

| Parameter | Type    | Description                              |
|-----------|---------|------------------------------------------|
| `name`    | `string`| The VR name to look up.                   |

#### Returns

| Type                     | Description                               |
|--------------------------|-------------------------------------------|
| `ValueRepresentation` or `undefined` | The matching VR instance, or `undefined` if not found. |

## Static Properties (Common VRs)

| Property | VR Name |
|----------|---------|
| `AE`     | Application Entity |
| `AS`     | Age String |
| `AT`     | Attribute Tag |
| `CS`     | Code String |
| `DA`     | Date |
| `DS`     | Decimal String |
| `DT`     | Date Time |
| `FL`     | Floating Point Single |
| `FD`     | Floating Point Double |
| `IS`     | Integer String |
| `LO`     | Long String |
| `LT`     | Long Text |
| `OB`     | Other Byte |
| `OD`     | Other Double |
| `OF`     | Other Float |
| `OL`     | Other Long |
| `OV`     | Other 64-bit Very Long |
| `OW`     | Other Word |
| `PN`     | Person Name |
| `SH`     | Short String |
| `SL`     | Signed Long |
| `SQ`     | Sequence of Items |
| `SS`     | Signed Short |
| `ST`     | Short Text |
| `SV`     | Signed 64-bit Very Long |
| `TM`     | Time |
| `UC`     | Unlimited Characters |
| `UI`     | Unique Identifier (UID) |
| `UL`     | Unsigned Long |
| `UN`     | Unknown |
| `UR`     | URI/URL |
| `US`     | Unsigned Short |
| `UT`     | Unlimited Text |
| `UV`     | Unsigned 64-bit Very Long |
| `NONE`   | None |

## Usage Example

```js
import ValueRepresentation from 'easi-dicom/dicom/ValueRepresentation.js';

// Lookup by name
const vr = ValueRepresentation.find('LO');

if (vr) {
    console.log(`VR: ${vr.ID}, Name: ${vr.Name}, Fixed: ${vr.IsFixed}, Length: ${vr.Length}`);
}

// Access the "Person Name" static VR directly
const pn = ValueRepresentation.PN;
console.log(pn.Name);
```