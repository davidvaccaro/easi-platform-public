# `Utilities` Class

The `Utilities` class provides a collection of static helper functions used in DICOM&reg; parsing and manipulation — including byte manipulation, string parsing, date parsing, and endian-handling.

---

## Static Methods

### `bytesToUnsignedInteger(bytes)`

Converts the specified byte array (2 or 4 bytes) into an **unsigned integer value**.

| Parameter | Type    | Description                             |
|-----------|---------|-----------------------------------------|
| `bytes`   | `Array` | The specified byte array (2 or 4 bytes). |

| Returns   | Description                             |
|-----------|-----------------------------------------|
| `number`  | The unsigned integer value of the bytes. |

---

### `bytesToString(bytes)`

Converts the specified byte array into a **string**.

| Parameter | Type    | Description              |
|-----------|---------|--------------------------|
| `bytes`   | `Array` | The specified byte array. |

| Returns   | Description                    |
|-----------|-------------------------------|
| `string`  | The string value of the array.  |

---

### `swapBytes(buf)`

Swaps bytes in the array to handle **endianness differences**.

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `buf`     | `Array` | The byte buffer to be swapped.    |

| Returns   | Description                    |
|-----------|-------------------------------|
| `Uint8Array` | The byte-swapped array.        |

---

### `deepCopyArray(arr)`

Performs a **deep copy** of the specified array.

| Parameter | Type    | Description         |
|-----------|---------|---------------------|
| `arr`     | `Array` | The array to copy.   |

| Returns   | Description                 |
|-----------|-----------------------------|
| `Array`   | The deep-copied array.      |

---

### `getItem()`

Returns the **byte buffer** for a DICOM&reg; *Item* marker.

| Parameters | None |

| Returns   | Description                    |
|-----------|-------------------------------|
| `Array`   | The byte buffer for the Item.   |

---

### `getEndSequence()`

Returns the **byte buffer** for a DICOM&reg; *End Sequence* marker.

| Parameters | None |

| Returns   | Description                             |
|-----------|----------------------------------------|
| `Array`   | The byte buffer for End Sequence.       |

---

### `parseDA(value)`

Parses a DICOM&reg; **DA (Date)** value string into a `Date` object.

| Parameter | Type    | Description                          |
|-----------|---------|--------------------------------------|
| `value`   | `string`| DICOM&reg; DA format: `YYYYMMDD`.          |

| Returns   | Description              |
|-----------|--------------------------|
| `Date` \| `null` | Parsed Date instance or `null`. |

---

### `parseDT(value)`

Parses a DICOM&reg; **DT (DateTime)** value string into a `Date` object.

| Parameter | Type    | Description                                             |
|-----------|---------|---------------------------------------------------------|
| `value`   | `string`| DICOM&reg; DT format: `YYYYMMDDHHMMSS.FFFFFF&ZZXX`.            |

| Returns   | Description              |
|-----------|--------------------------|
| `Date` \| `null` | Parsed Date instance or `null`. |

---

### `parseTM(value)`

Parses a DICOM&reg; **TM (Time)** value string into a `Date` object.

| Parameter | Type    | Description                               |
|-----------|---------|-------------------------------------------|
| `value`   | `string`| DICOM&reg; TM format: `HHMMSS.FFFFFF`.          |

| Returns   | Description              |
|-----------|--------------------------|
| `Date` \| `null` | Parsed Date instance or `null`. |

---