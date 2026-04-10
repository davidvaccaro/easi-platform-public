# `Prefix` Class

The `Prefix` class represents the DICOM&reg; Part-10 File Meta Information "Prefix" field.  

It extends the `DataElement` class and is used to parse and encapsulate the Prefix from a DICOM&reg; file header.

## Notes

- The Prefix field is a **fixed-length field** — length = `Constants.PrefixLength` (4 bytes).
- The DICOM&reg; standard value for Prefix is `'DICM'`.
- The Prefix immediately follows the Preamble in a Part-10 compliant DICOM&reg; file.
- Used when reading and writing DICOM&reg; Part-10 file headers.
- Inherits all methods and properties from `DataElement`, `EncodedData`, and `Data`.

---

## Inheritance

```text
Prefix → DataElement → EncodedData → Data
```

## Constructor

```js
new Prefix(data)
```

### Parameters

| Parameter | Type                   | Description                              |
|-----------|------------------------|------------------------------------------|
| `data`    | `Uint8Array` or `null`  | The raw data buffer containing the Prefix. |

## Usage Example

```js
import Prefix from 'easi-dicom/dicom/Prefix.js';

const prefix = new Prefix(byteData);

// Access inherited methods from DataElement
const rawBytes = prefix.access();
const length = prefix.length();

if (prefix.isComplete) {
    console.log('Prefix is complete.');
}
```