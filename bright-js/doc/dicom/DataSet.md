# Class: `DataSet`

The `DataSet` class represents a DICOM data set, which is a specialized form of `AttributeSet` used to hold the full collection of attributes for a DICOM object.

---

## Inheritance

```text
DataSet → AttributeSet
```

## Constructor

### `constructor()`

Constructs an empty new DICOM data set.

```javascript
const dataSet = new DataSet();
```

### Usage Example

```javascript
import DataSet from './DataSet.js';
import Attribute from './Attribute.js';
import Tag from './Tag.js';
import ValueRepresentations from './ValueRepresentations.js';

// Create a new DataSet
const dataSet = new DataSet();

// Create and add a DICOM attribute
const tag = new Tag('00100010', ValueRepresentations.PN); // Patient Name
const attribute = new Attribute(tag, 0, new TextEncoder().encode('DOE^JOHN'));
attribute.value = 'DOE^JOHN';

dataSet.add(attribute);

// Access value
console.log('Patient Name:', dataSet.value(tag));  // Output: DOE^JOHN
```