# `Status` Enum

The `Status` enum defines a set of symbolic constants representing the result or action directive of a parsing operation. Each value is a unique `Symbol` and is intended to guide the control flow during DICOM&reg; parsing or similar data stream processing.

---

## Members

| Name     | Description |
|----------|-------------|
| `CONTINUE` | Continue processing. |
| `HOP`      | The current parsed "element" data should be hopped through. Parse whatever remaining data is required to hop through the current data by a specified number of bytes. |
| `SKIP`     | The current parsed data "element" should be skipped over entirely. Parse whatever remaining data is required to skip over the current data "element". |
| `JUMP`     | The current parsed data "part" should be jumped over entirely. Parse whatever remaining data is required to jump over the current data "part". |
| `STOP`     | The current parsed objective is complete. Stop reading and parsing additional data. |
| `FAIL`     | The current parse session failed. Stop reading and parsing additional data. |
| `SUCCESS`  | The current parse session succeeded in parsing all available data. |

---

## Example Usage

```javascript
import { Status } from './Status.js';

function parseElement(element) {
    if (element.shouldSkip) {
        return Status.SKIP;
    } else if (element.isCorrupt) {
        return Status.FAIL;
    } else {
        return Status.CONTINUE;
    }
}
```