# `DateUtils` Class

The `DateUtils` class provides static utility methods for working with date values.  

It currently includes a method to format a `Date` object to a `YYYY-MM-DD` string.

---

## Static Methods

### `DateUtils.formatToYYYYMMDD(value)`

Formats the specified `Date` value to a `YYYY-MM-DD` string.

#### Parameters

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `value`   | `Date`  | The Date value to format.         |

#### Returns

| Type    | Description                                      |
|---------|--------------------------------------------------|
| `string` or `undefined` | Formatted `YYYY-MM-DD` string, or `undefined` if input is `null`. |

---

## Usage Example

```js
import DateUtils from 'easi-dicom';

const date = new Date(2025, 5, 21); // June 21, 2025
const formatted = DateUtils.formatToYYYYMMDD(date);

console.log(formatted); // "2025-06-21"
```