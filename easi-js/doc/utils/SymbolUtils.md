# `SymbolUtils` Class

The `SymbolUtils` class provides static utility methods for working with JavaScript `Symbol` values.  

It currently includes a method to convert a `Symbol` into a JSON-serializable string representation.

---

## Static Methods

### `SymbolUtils.toJSON(value)`

Converts the specified `Symbol` value to a JSON-serializable string.

#### Parameters

| Parameter | Type    | Description                           |
|-----------|---------|---------------------------------------|
| `value`   | `*`     | The `Symbol` value to convert.         |

#### Returns

| Type              | Description                                     |
|-------------------|-------------------------------------------------|
| `string` or `undefined` | The string representation, or `undefined` if input is `null` or `undefined`. |

---

## Usage Example

```js
import SymbolUtils from 'easi-dicom';

const mySymbol = Symbol('Example');
const jsonValue = SymbolUtils.toJSON(mySymbol);

console.log(jsonValue); // "example"
```