# `CharacterUtils` Class

The `CharacterUtils` class provides static utility methods for working with character data.  

It currently includes a method to test whether a character is considered "whitespace" according to the JSON specification.

---

## Static Methods

### `CharacterUtils.isWhitespace(byte)`

Tests whether the specified character (byte) is "whitespace" per the JSON definition.

#### Parameters

| Parameter | Type    | Description                                 |
|-----------|---------|---------------------------------------------|
| `byte`    | `*`     | The byte (character code) to test.           |

#### Returns

| Type    | Description                                  |
|---------|----------------------------------------------|
| `bool`  | `true` if the character is whitespace; `false` otherwise. |

---

## Usage Example

```js
import CharacterUtils from 'easi-dicom';

if (CharacterUtils.isWhitespace(0x20)) {
    console.log('It is whitespace!');
}
```