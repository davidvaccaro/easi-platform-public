# `EncodedData` Class

The `EncodedData` class represents a DICOM data buffer with an associated Transfer Syntax.  

It extends the `Data` class and adds transfer-syntax awareness, including automatic byte-swapping when appending or converting data.

## Inheritance

```text
EncodedData → Data
```

## Constructor

```js
new EncodedData(raw = null, transferSyntax = TransferSyntax.NONE)
```

#### Parameters

| Parameter        | Type                   | Description                                       |
|------------------|------------------------|---------------------------------------------------|
| `raw`            | `Uint8Array` or `null`  | The initial raw data buffer. Defaults to an empty buffer. |
| `transferSyntax` | `TransferSyntax`        | The associated Transfer Syntax. Defaults to `TransferSyntax.NONE`. |

## Properties

| Property         | Type             | Description                                       |
|------------------|------------------|---------------------------------------------------|
| `transferSyntax` | `TransferSyntax`  | The current Transfer Syntax associated with the data buffer. |

## Methods

### `convert(newTransferSyntax)`

Converts the current data buffer to a new Transfer Syntax, performing byte swapping if necessary.

#### Parameters

| Parameter             | Type            | Description                                      |
|-----------------------|-----------------|--------------------------------------------------|
| `newTransferSyntax`    | `TransferSyntax` | The new Transfer Syntax to convert to.           |

#### Returns

*(None — modifies buffer state.)*

### `append(raw)`

Appends raw bytes to the data buffer, with optional byte swapping based on Transfer Syntax.

#### Parameters

| Parameter | Type    | Description                              |
|-----------|---------|------------------------------------------|
| `raw`     | `Uint8Array`     | The raw bytes to append.                  |

#### Returns

*(None — modifies buffer state.)*

## Usage Example

```js
import EncodedData from 'easi-dicom';
import TransferSyntax from 'easi-dicom/dicom/TransferSyntax.js';

const encodedData = new EncodedData(initialBytes, TransferSyntax.JPEGBaseline8Bit);

// Append more data
encodedData.append(new Uint8Array([0x01, 0x02, 0x03]));

// Convert to a new Transfer Syntax (with byte swapping if needed)
encodedData.convert(TransferSyntax.JPEGLossless);
```