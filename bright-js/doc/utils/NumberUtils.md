# `NumberUtils` Class

The `NumberUtils` class provides static utility methods for working with numeric values.  

It currently includes a method to parse unsigned integer values from string inputs.

---

## Static Methods

### `NumberUtils.parseUnsignedInteger(value)`

Parses the specified string value into an unsigned integer.

#### Parameters

| Parameter | Type    | Description                                |
|-----------|---------|--------------------------------------------|
| `value`   | `*`     | The string value to parse as an integer.    |

#### Returns

| Type    | Description                              |
|---------|------------------------------------------|
| `number` or `null` | Parsed unsigned integer value, or `null` if input is empty or invalid. |

---

## Usage Example

```js
import NumberUtils from 'easi-dicom';

const value = NumberUtils.parseUnsignedInteger('1234');
console.log(value); // 1234

const invalid = NumberUtils.parseUnsignedInteger('');
console.log(invalid); // null
```