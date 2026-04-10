# `Runtime` Class

The `Runtime` class provides static utilities for determining runtime characteristics.  
Currently, it is used to detect the endian-ness (byte order) of the execution environment.

This is important for ensuring correct parsing and serialization of DICOM&reg; binary data, which depends on endian-ness.

---

## Constructor

(None — this is a utility class with static members.)

## Static Accessors

### `Runtime.isLittleEndian`

```js
Runtime.isLittleEndian
```
### Returns

| Type    | Description                                          |
|---------|------------------------------------------------------|
| `bool`  | `true` if runtime is little-endian; `false` otherwise. |

## Usage Example

```js
import Runtime from 'easi-dicom';

if (Runtime.isLittleEndian) {
    console.log('Running in little-endian mode.');
} else {
    console.log('Running in big-endian mode.');
}
```