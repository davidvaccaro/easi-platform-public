# `AttributeSet` Class

Represents a collection of DICOM&reg; attributes that can be searched, queried, and extended dynamically. It provides utility functions to check for tag existence, retrieve values, and manage completeness state.

---

## Constructor

### `constructor()`

Initializes a new instance of `AttributeSet`.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| *(none)*  | —    | Constructs an empty attribute set. |

#### Returns

| Type         | Description                   |
|--------------|-------------------------------|
| `AttributeSet` | A new instance of `AttributeSet`. |

---

## Properties

| Property     | Type      | Description                                |
|--------------|-----------|--------------------------------------------|
| `attributes` | `Array`   | Internal array holding all attribute objects. |
| `complete`   | `boolean` | Indicates whether the set is marked complete. |

---

### `isComplete`

Gets or sets the complete status of the attribute set.

#### Getter

```js
attributeSet.isComplete
```
## Methods

---

### `find(tag)`

Finds a DICOM&reg; attribute within the set by its tag.

#### Parameters

| Parameter | Type  | Description                         |
|-----------|-------|-------------------------------------|
| `tag`     | `Tag` | The DICOM&reg; tag to search for.        |

#### Returns

| Type     | Description                                       |
|----------|---------------------------------------------------|
| `any`    | The matching attribute, or `undefined` if not found. |

---

### `has(tag)`

Checks whether a DICOM&reg; attribute with the specified tag exists in the set.

#### Parameters

| Parameter | Type  | Description                         |
|-----------|-------|-------------------------------------|
| `tag`     | `Tag` | The DICOM&reg; tag to check for.         |

#### Returns

| Type      | Description                          |
|-----------|--------------------------------------|
| `boolean` | `true` if tag exists, `false` otherwise. |

---

### `add(attribute)`

Adds a single attribute to the attribute set.

#### Parameters

| Parameter  | Type  | Description                    |
|------------|-------|--------------------------------|
| `attribute`| `Attribute` | The attribute to be added.     |

#### Returns

| Type  | Description      |
|-------|------------------|
| `void`| No return value. |

---

### `addAll(attributes)`

Adds an array of attributes to the attribute set.

#### Parameters

| Parameter   | Type    | Description                          |
|-------------|---------|--------------------------------------|
| `attributes`| `Array<Attribute>` | The array of attributes to add.      |

#### Returns

| Type  | Description      |
|-------|------------------|
| `void`| No return value. |

---

### `value(tag, defaultValue = null)`

Retrieves the value of an attribute by tag, or returns a default value if not found.

#### Parameters

| Parameter     | Type   | Description                                       |
|---------------|--------|---------------------------------------------------|
| `tag`         | `any`  | The DICOM&reg; tag whose value to retrieve.            |
| `defaultValue`| `any`  | The value to return if the tag is not found. *(optional)* |

#### Returns

| Type | Description                     |
|------|---------------------------------|
| `any`| The attribute value or default. |

## Usage Example

```javascript
import AttributeSet from './AttributeSet.js';
import Attribute from './Attribute.js';
import Tag from './Tag.js';
import ValueRepresentations from './ValueRepresentations.js';

// Create a new attribute set
const attrSet = new AttributeSet();

// Define a DICOM&reg; tag
const patientNameTag = new Tag('00100010', ValueRepresentations.PN);

// Create an attribute and set its value
const patientNameAttr = new Attribute(patientNameTag, 0, new TextEncoder().encode('DOE^JOHN'));
patientNameAttr.value = 'DOE^JOHN';

// Add the attribute to the set
attrSet.add(patientNameAttr);

// Check if the attribute exists
if (attrSet.has(patientNameTag)) {
    console.log('Patient Name:', attrSet.value(patientNameTag));
}

// Output:
// Patient Name: DOE^JOHN
```