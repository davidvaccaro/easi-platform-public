# `DataElement` Class

The `DataElement` class represents an individual DICOM data element.  

It extends the `EncodedData` class and adds data-element specific properties such as value length and completion state.

---

## Inheritance

```text
DataElement → EncodedData → Data
```

## Constructor

```js
new DataElement(data, transferSyntax, valueLength)
```

### Parameters

| Parameter        | Type                   | Description                                       |
|------------------|------------------------|---------------------------------------------------|
| `data`           | `Uint8Array` or `null`  | The initial raw data buffer for this element.     |
| `transferSyntax` | `TransferSyntax`        | The Transfer Syntax associated with the element.  |
| `valueLength`    | `number`                | The expected length (in bytes) of the element's value. |

## Properties

| Property          | Type                   | Description                                      |
|-------------------|------------------------|--------------------------------------------------|
| `valueLength`     | `number`               | The expected length of the data element value.    |
| `complete`        | `bool` or `null`       | Optional override of completeness state.         |
| `isComplete`      | `bool`                 | Returns `true` if the element is complete.       |
| `bytesRemaining`  | `number`               | Number of bytes still needed to complete the element. |

## Methods

### `isComplete`

Gets the completion state of the data element.

#### Returns

| Type    | Description                      |
|---------|----------------------------------|
| `bool`  | `true` if the element is complete; otherwise `false`. |

### `isComplete = value`

Sets the completion state of the data element, overriding automatic determination.

#### Parameters

| Parameter | Type    | Description                      |
|-----------|---------|----------------------------------|
| `value`   | `bool`  | The forced completion state.      |

### `bytesRemaining`

Gets the number of bytes remaining to complete this element.

#### Returns

| Type    | Description                      |
|---------|----------------------------------|
| `number`| Number of bytes remaining.       |


## Usage Example

```js
import DataElement from 'easi-dicom';

const element = new DataElement(rawData, transferSyntax, 128);

// Check if the element is complete
if (element.isComplete) {
    console.log('Element is complete.');
} else {
    console.log(`Bytes remaining: ${element.bytesRemaining}`);
}

// Override completion state
element.isComplete = true;
```