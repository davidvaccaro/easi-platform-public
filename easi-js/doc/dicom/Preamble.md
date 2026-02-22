# `Preamble` Class

The `Preamble` class represents the DICOM Part-10 File Meta Information "Preamble" field.  

It extends the `DataElement` class and is used to parse and encapsulate the Preamble from a DICOM file header.

## Notes

- The Preamble field is a **fixed-length field** — length = `Constants.PreambleLength` (128 bytes).
- The Preamble precedes the Prefix (`'DICM'`) in a Part-10 compliant DICOM file.
- Used when reading and writing DICOM Part-10 file headers.
- Inherits all methods and properties from `DataElement`, `EncodedData`, and `Data`.

---

## Inheritance

```text
Preamble → DataElement → EncodedData → Data
```
## Constructor

```js
new Preamble(data)
```
### Parameters

| Parameter | Type                   | Description                              |
|-----------|------------------------|------------------------------------------|
| `data`    | `Uint8Array` or `null`  | The raw data buffer containing the Preamble. |

## Usage Example

```js
import Preamble from 'easi-dicom/dicom/Preamble.js';

const preamble = new Preamble(byteData);

// Access inherited methods from DataElement
const rawBytes = preamble.access();
const length = preamble.length();

if (preamble.isComplete) {
    console.log('Preamble is complete.');
}
```