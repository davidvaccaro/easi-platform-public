# `DumpParser` Class

The `DumpParser` class provides tooling support for parsing or generating diagnostic DICOM dumps.

---

## Inheritance

```text
DumpParser → (none)
```

## Constructor

```js
new DumpParser(dicomEmitter)
```

### Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `dicomEmitter` | `*` | `—` | The emitter used to emit dumped elements of the DICOM data. |

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `emitter` | `*` | Instance property initialized in constructor. |

## Methods

### `reset()`

Reset the current state of the parser.

#### Returns

*(None — return value not explicitly documented.)*

---

### `parseTagDetails(line)`

Peek the next, transfer-syntax independent, base tag details.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `line` | `*` | Parameter accepted by method. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The peeked local tag details. |

---

### `peekSequence()`

Peek the top sequence of the stack of sequence elements.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The sequence at the top of the sequence element stack. |

---

### `peekItem()`

Peek the top item of the stack of sequence elements.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The item at the top of the sequence element stack. |

---

### `parse(data)`

Parse the specified dump data to a dump instance.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `data` | `*` | — |

#### Returns

*(None — return value not explicitly documented.)*

## Usage Example

```js
import fs from 'node:fs';
import DumpParser from '../../../src/tools/dicom/DumpParser.js';

const dumpText = fs.readFileSync('./data/dumps/dump1.txt', 'utf8');
const parser = new DumpParser();
const attributeSet = parser.parse(dumpText);
```
---
