# `StringUtils` Class

The `StringUtils` class provides static utility methods for working with string values.  

It currently includes a method to test whether a string is valid (not `null`, not empty, and not whitespace).

---

## Static Methods

### `StringUtils.isValid(str)`

Tests whether the specified string value is "valid" (i.e. not `null`, not empty, and not only whitespace).

#### Parameters

| Parameter | Type    | Description                           |
|-----------|---------|---------------------------------------|
| `str`     | `*`     | The string value to test.              |

#### Returns

| Type    | Description                                   |
|---------|-----------------------------------------------|
| `bool`  | `true` if string is valid; `false` otherwise.  |

---

## Usage Example

```js
import StringUtils from 'easi-dicom';

if (StringUtils.isValid('Hello World')) {
    console.log('Valid string!');
}

if (!StringUtils.isValid('   ')) {
    console.log('Invalid string.');
}
```