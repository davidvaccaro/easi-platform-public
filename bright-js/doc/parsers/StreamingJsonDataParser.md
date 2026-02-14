# `StreamingJsonDataParser` Class

A streaming, event-driven JSON parser that extends `StreamingDataParser`. It enables parsing of large or chunked JSON data by emitting SAX-style events during traversal. Useful for memory-efficient processing of large JSON payloads.

---

## Inheritance

```text
StreamingJsonDataParser → StreamingDataParser
```
---

## Table of Contents

- [Constructor](#constructor)
- [Public Methods](#public-methods)
  - [`isNumberCharacter(ch)`](#isnumbercharacterch)
  - [`peekCurrent()`](#peekcurrent)
  - [`pushCurrent(element)`](#pushcurrentelement)
  - [`replaceCurrent(element)`](#replacecurrentelement)
  - [`popCurrent()`](#popcurrent)
  - [`reset()`](#reset)
  - [`peekNextDataElement()`](#peeknextdataelement)
  - [`parseNextDataElement(isDone)`](#parsenextdataelementisdone)
  - [`parse(chunk, isDone, totalRead, totalLength)`](#parsechunk-isdone-totalread-totallength)
- [Event Callbacks](#event-callbacks)
- [Internal State](#internal-state)

---

## Constructor

### `constructor()`

Initializes a new instance of `StreamingJsonDataParser`.

| Property        | Type         | Description                    |
|----------------|--------------|--------------------------------|
| `decoder`      | `TextDecoder`| Used for decoding UTF-8 text   |

---

## Public Methods

### `isNumberCharacter(ch)`

Determines if the provided character code is valid in a JSON number.

| Parameter | Type    | Description                    |
|-----------|---------|--------------------------------|
| `ch`      | `*`     | Character code to check        |

| Returns   | Type    | Description              |
|-----------|---------|--------------------------|
|           | `boolean` | `true` if numeric char, otherwise `false` |

---

### `peekCurrent()`

Returns the current (top) element on the parsing stack.

| Returns   | Type    | Description                     |
|-----------|---------|---------------------------------|
|           | `object \| null` | Top stack element or `null` if stack is empty |

---

### `pushCurrent(element)`

Pushes a new element onto the stack.

| Parameter  | Type    | Description        |
|------------|---------|--------------------|
| `element`  | `object`| JSON token to push |

| Returns    | Type    | Description        |
|------------|---------|--------------------|
|            | `object`| The pushed element |

---

### `replaceCurrent(element)`

Replaces the top stack element with a new one.

| Parameter  | Type    | Description            |
|------------|---------|------------------------|
| `element`  | `object`| Replacement token      |

| Returns    | Type    | Description            |
|------------|---------|------------------------|
|            | `object`| The replaced element   |

---

### `popCurrent()`

Pops and returns the top stack element.

| Returns    | Type              | Description                       |
|------------|------------------|-----------------------------------|
|            | `object \| null` | The popped element or `null` if empty |

---

### `reset()`

Resets the parser to its initial state.

| Returns | Type | Description |
|---------|------|-------------|
|         | `void` | —         |

---

### `peekNextDataElement()`

Peeks the next token in the data stream.

| Returns | Type                | Description                                          |
|---------|---------------------|------------------------------------------------------|
|         | `object \| false`   | JSON token if complete, or `false` if data incomplete |

---

### `parseNextDataElement(isDone)`

Parses the next token from the data stream.

| Parameter | Type     | Description                             |
|-----------|----------|-----------------------------------------|
| `isDone`  | `boolean`| Whether this is the final data chunk    |

| Returns   | Type     | Description                             |
|-----------|----------|-----------------------------------------|
|           | `boolean`| `true` if parsing can continue, else `false` |

---

### `parse(chunk, isDone = false, totalRead = null, totalLength = null)`

Feeds a new data chunk into the parser and advances parsing.

| Parameter      | Type              | Description                                     |
|----------------|-------------------|-------------------------------------------------|
| `chunk`        | `Uint8Array \| null` | New data chunk to parse                      |
| `isDone`       | `boolean`         | If this is the final chunk                      |
| `totalRead`    | `number \| null`  | (Optional) Total bytes read                     |
| `totalLength`  | `number \| null`  | (Optional) Total expected length                |

| Returns | Type         | Description                                  |
|---------|--------------|----------------------------------------------|
|         | `Status`     | `Status.SUCCESS` if complete, else `Status.CONTINUE` |

---

## Event Callbacks

These are expected to be defined by the user to receive parsing events:

| Event                  | Description                                           |
|------------------------|-------------------------------------------------------|
| `onStart(context)`     | Triggered before parsing begins                       |
| `onEnd(context)`       | Triggered after parsing ends                          |
| `onStartObject()`      | Start of JSON object (`{`)                            |
| `onEndObject()`        | End of JSON object (`}`)                              |
| `onStartArray()`       | Start of JSON array (`[`)                             |
| `onEndArray()`         | End of JSON array (`]`)                               |
| `onStartString(value)` | When a string token begins                            |
| `onEndString()`        | When a string token ends                              |
| `onAppendString(value)`| Called for partial/incomplete strings                 |
| `onStartNumber(value)` | When a number token begins                            |
| `onEndNumber(value)`   | When a number token ends                              |
| `onStartAttribute(key)`| Start of an object key (attribute name)              |
| `onEndAttribute(key)`  | End of an object key                                  |
| `onError(error)`       | Called if parsing fails or is invalid                 |

---

## Internal State

| Property             | Type          | Description                                          |
|----------------------|---------------|------------------------------------------------------|
| `decoder`            | `TextDecoder` | UTF-8 decoder for incoming byte chunks              |
| `dataElements`       | `Array`       | Stack of currently open JSON tokens                |
| `context`            | `any`         | Optional context passed between events              |
| `status`             | `Status`      | Current parsing status (`CONTINUE`, `STOP`, etc.)   |
| `totalBytesConsumed` | `number`      | Number of bytes consumed during parse               |
| `bytesRead`          | `number`      | Optional number of bytes read so far                |
| `bytesTotal`         | `number`      | Optional total length of stream                     |
| `isStarted`          | `boolean`     | Flag indicating if parsing has started              |
| `result`             | `any`         | Final result returned from `onEnd` handler          |

---
