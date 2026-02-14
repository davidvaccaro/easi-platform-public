# `Constants` Class

The `Constants` class defines standard values used throughout the EASI DICOM system.  

These constants correspond to official values defined in the DICOM Part 10 (File Format) and Part 5 (Data Structures) specifications.

---

## Properties (Static Constants)

| Property                    | Type    | Value         | Description |
|-----------------------------|---------|---------------|-------------|
| `PreambleLength`            | `number`| `128`         | Standard length of DICOM preamble. [(Part 10, Chapter 7)](https://dicom.nema.org/medical/dicom/current/output/html/part10.html#chapter_7) |
| `PrefixLength`              | `number`| `4`           | Standard length of DICOM prefix. [(Part 10, Chapter 7)](https://dicom.nema.org/medical/dicom/current/output/html/part10.html#chapter_7) |
| `PrefixValue`               | `string`| `'DICM'`      | Standard DICOM prefix string value. [(Part 10, Chapter 7)](https://dicom.nema.org/medical/dicom/current/output/html/part10.html#chapter_7) |
| `GroupLength`               | `number`| `2`           | Length of DICOM Data Element "Group". [(Part 5, 7.1.1)](https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1) |
| `ElementLength`             | `number`| `2`           | Length of DICOM Data Element "Element". [(Part 5, 7.1.1)](https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1) |
| `ValueRepresentationLength` | `number`| `2`           | Length of DICOM Data Element "Value Representation". [(Part 5, 7.1.1)](https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1) |
| `ReservedLength`            | `number`| `2`           | Length of DICOM Data Element "Reserved". [(Part 5, 7.1.1)](https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1) |
| `ValueLength32`             | `number`| `4`           | Length of DICOM Data Element "Value Length" (32-bit). [(Part 5, 7.1.1)](https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1) |
| `ValueLength16`             | `number`| `2`           | Length of DICOM Data Element "Value Length" (16-bit). [(Part 5, 7.1.1)](https://dicom.nema.org/medical/dicom/current/output/html/part05.html#sect_7.1.1) |
| `UndefinedLength`           | `number`| `4294967295`  | Value representing "Undefined Length" for sequences. [(Part 5, 7.5.2)](https://dicom.nema.org/medical/dicom/current/output/chtml/part05/sect_7.5.2.html) |

## Usage Example

```js
import Constants from 'easi-dicom/dicom/Constants.js';

// Access the DICOM preamble length
const preambleLength = Constants.PreambleLength;

// Use UndefinedLength constant
if (element.valueLength === Constants.UndefinedLength) {
    console.log('Element has undefined length');
}
```