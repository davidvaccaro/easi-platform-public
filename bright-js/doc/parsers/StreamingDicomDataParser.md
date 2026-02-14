# StreamingDicomDataParser Class

The `StreamingDicomDataParser` class is a streaming parser for DICOM Part-10 formatted data, capable of processing standard DICOM structures such as the file preamble, prefix, metadata, and dataset. It is event-driven and supports asynchronous handlers for each parsing stage.

---

## Constructor

### `new StreamingDicomDataParser()`

Creates a new instance of the parser. Initializes internal states and sets the default DICOM Part-10 specification sequence.

---

## Properties

| Property        | Type     | Description |
|-----------------|----------|-------------|
| `isStrict`      | `boolean` | Whether strict parsing rules are enforced based on DICOM structural specifications. |
| `handler`       | `object`  | An event handler that responds to parsing events such as `onReset`, `onStartInstance`, etc. |
| `context`       | `any`     | A user-defined context object passed through stream events. |
| `status`        | `Status`  | Current parser status. |
| `data`          | `EncodedData` | Buffer storing parsed DICOM byte stream. |
| `bytesRead`     | `number`  | Total bytes read from input. |
| `bytesProcessed`| `number`  | Total bytes processed so far. |
| `bytesTotal`    | `number`  | Expected total byte size (if known). |
| `dataElement`   | `Attribute` or `null` | The currently parsed data element. |
| `dataElements`  | `Array`   | Stack of elements being parsed, typically for sequences. |
| `partType`      | `string`  | Current part of the DICOM stream being parsed. |
| `partSpecification` | `Array` | The ordered parts to be parsed (e.g., preamble, prefix, metadata, dataset). |
| `dataSetTransferSyntax` | `TransferSyntax` | Transfer syntax for the dataset (e.g., Explicit VR Little Endian). |

---

## Methods

### `reset()`

Resets the parser state. Prepares for parsing a new DICOM instance.

---

### `async parse(chunk, isDone = false, totalRead = null, totalLength = null)`

Main parsing entry point. Parses a chunk of DICOM data and invokes appropriate methods for each DICOM part.

- **Parameters:**
  - `chunk`: A `Buffer` or `Uint8Array` containing DICOM data.
  - `isDone`: Boolean indicating if this is the final chunk.
  - `totalRead`: Number of bytes read so far.
  - `totalLength`: Total size of the data.
- **Returns:** `Promise<Status>`

---

### `async parseNextPreamble()`

Parses the 128-byte DICOM file preamble.

- **Returns:** `Promise<Status>`

---

### `async parseNextPrefix()`

Parses the 4-byte DICOM prefix (`"DICM"`).

- **Returns:** `Promise<Status>`

---

### `async parseNextMetaSet(isDone)`

Parses the metadata portion (group `0002`) using Explicit VR Little Endian syntax.

- **Returns:** `Promise<Status>`

---

### `async parseNextDataSet(isDone)`

Parses the main dataset portion of the DICOM instance.

- **Returns:** `Promise<Status>`

---

### `async parseNextDataElement(isDone)`

Parses an individual DICOM data element from the current chunk.

- **Returns:** `Promise<boolean>`

---

### `async fireStreamEvent(name, param, currentStatus)`

Fires an event if supported by the handler, handling both sync and async event methods.

- **Parameters:**
  - `name`: Name of the event to fire.
  - `param`: Parameter to pass to the handler.
  - `currentStatus`: Current parse status.
- **Returns:** `Promise<Status>`

---

### `peekTagDetails(bytesPeeked = 0)`

Returns tag information without advancing the parser position.

- **Returns:** `object|null`

---

### `get isParsingSequence`

Returns whether a sequence is currently being parsed.

- **Returns:** `boolean`

---

### `peekSequence()`

Returns the top-level sequence from the element stack, if present.

- **Returns:** `object|null`

---

### `peekItem()`

Returns the topmost item in the stack of parsed sequence elements.

- **Returns:** `object|null`

---

## Event Handlers

The parser supports the following stream handler events (if provided):

- `onReset`
- `onStartInstance`
- `onEndInstance`
- `onStartDataSet`
- `onProgress`

Each is triggered at appropriate stages of the parsing lifecycle.

---

## DICOM Part Types

| Constant Name | Value     | Description                                      |
|---------------|-----------|--------------------------------------------------|
| Preamble      | 'Preamble'| 128-byte optional preamble at the start of file |
| Prefix        | 'Prefix'  | 'DICM' marker following the preamble             |
| MetaSet       | 'MetaSet' | File Meta Information (Group 0002 elements)      |
| DataSet       | 'DataSet' | Main dataset containing SOP instance data        |

---

## DICOM Part Specifications

### Part-10 Specification (File Format)

| Order | Part Type  |
|-------|------------|
| 1     | DataSet    |
| 2     | MetaSet    |
| 3     | Prefix     |
| 4     | Preamble   |

### Part-5 Specification (Standard Dataset)

| Order | Part Type  |
|-------|------------|
| 1     | DataSet    |

## Example Usage

```javascript
import StreamingDicomDataParser from './StreamingDicomDataParser.js';

// Create a new parser instance
const parser = new StreamingDicomDataParser();

// Assign a stream handler to respond to parsing events
parser.handler = {
  onReset: () => {
    console.log('Parser reset');
  },
  onStartInstance: (context) => {
    console.log('DICOM instance started');
    return context;
  },
  onEndInstance: (context) => {
    console.log('DICOM instance completed');
    return context;
  },
  onStartDataSet: () => {
    console.log('Started parsing Data Set');
  },
  onProgress: (context, progress) => {
    console.log(`Progress: ${progress.bytesProcessed} / ${progress.bytesTotal}`);
  }
};

// Simulated function to stream DICOM data chunks
async function streamDicomData(chunks) {
  for (let i = 0; i < chunks.length; i++) {
    const isLast = (i === chunks.length - 1);
    await parser.parse(chunks[i], isLast, i + 1, chunks.length);
  }
}

// Example DICOM byte chunks (replace with actual Uint8Array chunks)
const dicomChunks = [
  new Uint8Array([/* ... bytes ... */]),
  new Uint8Array([/* ... bytes ... */])
];

// Stream the data
streamDicomData(dicomChunks);
```