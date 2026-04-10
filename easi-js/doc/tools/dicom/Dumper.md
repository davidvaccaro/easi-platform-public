# `Dumper` Class

The `Dumper` class provides tooling support for parsing or generating diagnostic DICOM&reg; dumps.

---

## Inheritance

```text
Dumper → (none)
```

## Constructor

```js
new Dumper(parser)
```

### Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `parser` | `DumpParser` | `—` | The parser used to parse dumped DICOM&reg; data. |

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `parser` | `*` | Instance property initialized in constructor. |

## Methods

### `dump(dicomPath)`

Dump a specified DICOM&reg; file.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `dicomPath` | `string` | The file name OR full path to a specified DICOM&reg; file. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The dump of the DICOM&reg; file. |

## Usage Example

```js
import Dumper from '../../../src/tools/dicom/Dumper.js';

const dumper = new Dumper();
const text = dumper.dump(attributeSet);
console.log(text);
```
---
