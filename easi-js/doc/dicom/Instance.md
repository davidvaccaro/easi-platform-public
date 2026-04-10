# `Instance` Class

The `Instance` class represents a complete DICOM&reg; object, including its preamble, prefix, metadata (MetaSet), and main dataset (DataSet).

---

## Constructor

### `constructor()`

Creates a new, empty DICOM&reg; instance.

#### Parameters

_None_

---

## Properties

| Property        | Type      | Description                                  |
|-----------------|-----------|----------------------------------------------|
| `preamble`      | `*`       | Gets or sets the 128-byte DICOM&reg; preamble.    |
| `prefix`        | `*`       | Gets or sets the 4-byte DICOM&reg; prefix ("DICM"). |
| `metaSet`       | `MetaSet` | Gets or sets the DICOM&reg; metadata group.       |
| `dataSet`       | `DataSet` | Gets or sets the main DICOM&reg; dataset.         |
| `sopInstanceUid`| `string`  | Gets the SOP Instance UID from the dataset.  |

---

## Usage Example

```javascript
import Instance from './Instance.js';
import MetaSet from './MetaSet.js';
import DataSet from './DataSet.js';

const instance = new Instance();

// Set preamble and prefix
instance.preamble = new Uint8Array(128);
instance.prefix = "DICM";

// Assign MetaSet and DataSet
instance.metaSet = new MetaSet();
instance.dataSet = new DataSet();

// Access SOP Instance UID
const sopUID = instance.sopInstanceUid;
console.log("SOP Instance UID:", sopUID);
```