# `Exception` Class

The `Exception` class provides a standardized way to represent error conditions in EASI DICOM. It encapsulates an error message, an identifying code, and an optional underlying error object. This class helps ensure consistent error handling across the EASI DICOM library.

---

## Constructor

```js
new Exception(message, code, error)
```

### Parameters

| Parameter | Type    | Default                                      | Description                                    |
|-----------|---------|----------------------------------------------|------------------------------------------------|
| `message` | `*`     | —                                            | A message describing the error condition.      |
| `code`    | `*`     | `GeneralErrorCodes.GeneralError`              | A code identifying the error condition.        |
| `error`   | `*`     | `null`                                       | An optional underlying error (chained error).  |

## Common Error Codes

### `GeneralErrorCodes`

| Code                | Description                              |
|---------------------|------------------------------------------|
| `GeneralError`      | General, unspecified error.               |
| `InvalidParameter`  | One or more parameters were invalid.      |
| `NotImplemented`    | Operation not implemented.                |

### `ParseErrorCodes`

| Code             | Description                                        |
|------------------|----------------------------------------------------|
| `InvalidToken`   | Invalid token encountered during parsing.           |
| `InvalidElement` | Invalid element encountered during parsing.         |

### `DicomErrorCodes`

| Code                              | Description                                   |
|-----------------------------------|-----------------------------------------------|
| `InvalidPart`                     | Invalid part in DICOM object.                 |
| `InvalidValueRepresentation`      | Invalid value representation (VR).            |
| `InvalidTag`                      | Invalid DICOM tag.                            |
| `UnknownTagAndValueRepresentation`| Unknown tag and VR combination.               |
| `InvalidDataElement`              | Invalid data element structure.               |
| `InvalidSequence`                 | Invalid sequence element.                     |
| `DuplicateAttribute`              | Duplicate attribute detected.                 |
| `InvalidMetaSet`                  | Invalid meta information set.                 |

## Usage Example

```js
import Exception, { DicomErrorCodes } from 'easi-dicom';

try {
    // Some operation that may fail
    throw new Exception('Invalid DICOM tag encountered.', DicomErrorCodes.InvalidTag);
} catch (ex) {
    console.error(`Error: ${ex.message}, Code: ${ex.code}`);
}
```