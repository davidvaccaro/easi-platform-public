# DataParser Class

The `DataParser` class is responsible for parsing streamed binary data in a DICOM&reg;-compatible or similarly structured format. It provides event-driven parsing logic with support for asynchronous event handlers.

---

## Constructor

### `new DataParser()`

Creates a new instance of `DataParser`.

---

## Properties

| Property       | Type    | Description |
|----------------|---------|-------------|
| `handler`      | object  | The handler used to process parsing events like `onReset`, `onProgress`, etc. |
| `context`      | any     | Parsing session context, user-defined. |
| `data`         | `Data`  | An internal buffer that stores parsed binary data. |
| `status`       | `Status` | The current status of the parsing session. |
| `bytesRead`    | number  | Number of bytes read so far. |
| `bytesProcessed` | number | Number of bytes processed so far. |
| `bytesTotal`   | number  | Total number of bytes expected to be processed. |
| `totalBytesConsumed` | number | Internal counter for bytes consumed during parsing. |

---

## Methods

### `async fireStreamEvent(name, param, currentStatus)`

Fires a stream event, invoking the appropriate handler function if it exists.

#### Parameters

| Parameter | Type  | Description                                             |
|-----------|-------|---------------------------------------------------------|
| `name`   | `string` | The name of the event to fire.   |
| `param`   | `*` | The parameter to pass to the event handler.   |
| `currentStatus`   | `Status` | The current processing status.   |

#### Returns

| Type  | Description            |
|-------|------------------------|
| `Promise<Status>`| The current status.        |

---

### `reset()`

Resets the internal state of the parser, including byte counters, internal buffers, and status.

#### Returns

| Type  | Description            |
|-------|------------------------|
| `void`| No return value.        |

---

### `async parse(chunk, isDone = false, totalRead = null, totalLength = null)`

Parses a chunk of streamed data. *(Method stub — implementation not shown in current source.)*

#### Parameters

| Parameter | Type  | Description                                             |
|-----------|-------|---------------------------------------------------------|
| `chunk`   | `Uint8Array` | Data to parse.   |
| `isDone`   | `boolean` | Whether this is the final chunk. *(Optional)*.   |
| `totalRead`   | `number` | Number of total bytes read. *(Optional)*   |
| `totalLength`   | `number` | Total length of the data. *(Optional)*   |

#### Returns

| Type  | Description            |
|-------|------------------------|
| `Promise<Status>`| The current status.        |

---

## Example Usage

```javascript
import DataParser from './DataParser.js';
import { Status } from './Status.js';

const parser = new DataParser();

parser.handler = {
  onReset: () => console.log('Reset'),
  onProgress: (context, info) => {
    console.log(`Progress: ${info.bytesProcessed}/${info.bytesTotal}`);
    return Status.CONTINUE;
  }
};
parser.reset();
```