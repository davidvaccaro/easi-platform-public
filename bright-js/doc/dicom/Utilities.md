# `Utilities` Class

The `Utilities` class provides a collection of static helper functions used in DICOM parsing and manipulation — including byte manipulation, string parsing, date parsing, and endian-handling.

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

Returns the **byte buffer** for a DICOM *Item* marker.

| Parameters | None |

| Returns   | Description                    |
|-----------|-------------------------------|
| `Array`   | The byte buffer for the Item.   |

---

### `getEndSequence()`

Returns the **byte buffer** for a DICOM *End Sequence* marker.

| Parameters | None |

| Returns   | Description                             |
|-----------|----------------------------------------|
| `Array`   | The byte buffer for End Sequence.       |

---

### `parseDA(value)`

Parses a DICOM **DA (Date)** value string into a `Date` object.

| Parameter | Type    | Description                          |
|-----------|---------|--------------------------------------|
| `value`   | `string`| DICOM DA format: `YYYYMMDD`.          |

| Returns   | Description              |
|-----------|--------------------------|
| `Date` \| `null` | Parsed Date instance or `null`. |

---

### `parseDT(value)`

Parses a DICOM **DT (DateTime)** value string into a `Date` object.

| Parameter | Type    | Description                                             |
|-----------|---------|---------------------------------------------------------|
| `value`   | `string`| DICOM DT format: `YYYYMMDDHHMMSS.FFFFFF&ZZXX`.            |

| Returns   | Description              |
|-----------|--------------------------|
| `Date` \| `null` | Parsed Date instance or `null`. |

---

### `parseTM(value)`

Parses a DICOM **TM (Time)** value string into a `Date` object.

| Parameter | Type    | Description                               |
|-----------|---------|-------------------------------------------|
| `value`   | `string`| DICOM TM format: `HHMMSS.FFFFFF`.          |

| Returns   | Description              |
|-----------|--------------------------|
| `Date` \| `null` | Parsed Date instance or `null`. |

---