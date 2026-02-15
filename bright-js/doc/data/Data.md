# `Data` Class

The `Data` class provides a dynamic byte buffer used as the base of the EASI DICOM stream reading process.  

It supports appending, consuming, peeking, and searching byte sequences — optimized for streaming scenarios.

## Design Notes

The `Data` class serves as the foundational dynamic byte buffer for the entire EASI DICOM streaming reading architecture.

### Goals

- **Optimized for streaming:** Efficient appending, consuming, peeking, and searching in a dynamic byte stream.
- **Zero-copy where possible:** Uses `Uint8Array.subarray()` for peeking and consuming to avoid unnecessary memory allocations.
- **No fixed size:** The buffer grows as needed to accommodate incoming data.
- **State-safe:** Clear handling of empty, zero-filled, and uninitialized states.
- **Minimal API surface:** Only essential operations exposed, keeping usage simple and predictable.
- **Re-entrant safe:** Buffer operations are designed to safely handle partial reads, peeks, and repeated consumption.

### Rationale

Many DICOM file formats — especially streamed formats like WADO-RS — require partial and progressive reading of potentially large data sets. This class enables:

- Safe and efficient parsing of DICOM tags, sequences, and pixel data blocks.
- On-demand reading of stream segments without having to load the entire file in memory.
- Support for high-performance browser or server-side processing of streaming DICOM data.

The design avoids the complexity of larger buffer abstractions (like Node.js streams or BufferList) in favor of a minimal, high-performance core primitive tailored to DICOM parsing needs.

### Typical Use Cases

- Feeding data from a streaming source (XHR, fetch, socket).
- Peeking ahead in the stream to identify tags or sequence boundaries.
- Consuming known-size structures from the buffer.
- Searching for tag or delimiter sequences in a byte stream.
- Supporting resynchronization after partial reads.

---

## Constructor

```js
new Data()
```
## Properties

| Property      | Type    | Description                                      |
|---------------|---------|--------------------------------------------------|
| `isEmpty`     | `bool`  | Returns `true` if the data buffer is empty.      |
| `isZeroSpace` | `bool`  | Returns `true` if the data buffer is filled with zeroes. |
## Methods

### `access()`

Returns the current data buffer.

#### Returns

| Type           | Description                      |
|----------------|----------------------------------|
| `Uint8Array` | The current data buffer. |

---

### `length()`

Determines the length (in bytes) of the data buffer.

#### Returns

| Type    | Description                      |
|---------|----------------------------------|
| `number`| Length in bytes of the data buffer. |

---

### `append(raw)`

Appends raw bytes to the data buffer.

#### Parameters

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `raw`     | `Uint8Array`     | The raw bytes to append.          |

#### Returns

*(None — modifies buffer state.)*

---

### `consume(count)`

Consumes a specified number of bytes from the data buffer.

#### Parameters

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `count`   | `number`| Number of bytes to consume.      |

#### Returns

| Type         | Description                      |
|--------------|----------------------------------|
| `Uint8Array` | Array of consumed bytes.          |

---

### `peek(begin, count)`

Peeks at a range of bytes in the buffer without consuming.

#### Parameters

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `begin`   | `number`| Offset to start peeking.          |
| `count`   | `number`| Number of bytes to peek.          |

#### Returns

| Type         | Description                      |
|--------------|----------------------------------|
| `Uint8Array` | Array of peeked bytes.            |

---

### `peekOne(begin)`

Peeks at a single byte in the buffer.

#### Parameters

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `begin`   | `number`| Offset to peek.                   |

#### Returns

| Type    | Description                      |
|---------|----------------------------------|
| `number`| The byte value at the specified position. |

---

### `skip(count)`

Skips a specified number of bytes in the data buffer without returning them.

#### Parameters

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `count`   | `number`| Number of bytes to skip.         |

#### Returns

*(None — advances the buffer position.)*

---

### `indexOf(begin, sequence)`

Finds the index of a specified byte sequence in the buffer.

#### Parameters

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `begin`   | `number`| Offset to start searching.        |
| `sequence`| `Uint8Array`| Byte sequence to find.        |

#### Returns

| Type    | Description                      |
|---------|----------------------------------|
| `number`| Index of the sequence, or `-1` if not found. |

---

### `clear()`

Clears the buffer contents.

#### Returns

*(None — resets buffer to empty.)*

## Usage Example

```js
import Data from 'easi-dicom';

const buffer = new Data();

// Append some bytes
buffer.append(new Uint8Array([0x01, 0x02, 0x03, 0x04]));

// Peek at first 2 bytes
const peeked = buffer.peek(0, 2);
console.log(peeked);

// Consume 2 bytes
const consumed = buffer.consume(2);
console.log(consumed);

// Check if buffer is empty
if (buffer.isEmpty) {
    console.log('Buffer is empty.');
}

// Clear the buffer
buffer.clear();
```