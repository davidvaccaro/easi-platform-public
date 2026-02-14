# `TagSet` Class

The `TagSet` class represents a **collection of DICOM tags**, providing methods to add, find, and query tags within the set.

---

## Constructor

### `new TagSet()`

| Parameters | None |

| Returns   | Description                                  |
|-----------|----------------------------------------------|
| `TagSet`  | A new empty instance of the `TagSet` class.   |

---

## Methods

### `find(tag)`

Finds a tag within the tag set by tag identifier.

| Parameter | Type    | Description                |
|-----------|---------|----------------------------|
| `tag`     | `Tag`   | The DICOM tag to search for. |

| Returns   | Description                      |
|-----------|----------------------------------|
| `Tag` \| `null` | The tag if found, or `null` if not found. |

---

### `has(tag)`

Determines if a tag exists within the tag set.

| Parameter | Type    | Description              |
|-----------|---------|--------------------------|
| `tag`     | `Tag`   | The DICOM tag to test.    |

| Returns   | Description                                    |
|-----------|------------------------------------------------|
| `boolean` | `true` if the tag exists in the set, `false` otherwise. |

---

### `add(tag)`

Adds a new tag to the tag set.

| Parameter | Type    | Description                     |
|-----------|---------|---------------------------------|
| `tag`     | `Tag`   | The DICOM tag to add to the set. |

| Returns   | Description              |
|-----------|--------------------------|
| `void`    | No return value.          |

---

## Example Usage

```js
import TagSet from 'easi-dicom/dicom/TagSet.js';
import Tag from 'easi-dicom/dicom/Tag.js';

// Create a new TagSet instance
const tagSet = new TagSet();

// Example Tag
const exampleTag = Tag.FileMetaInformationVersion;

// Add tag to the set
tagSet.add(exampleTag);

// Check if the tag exists in the set
if (tagSet.has(exampleTag)) {
    console.log('Tag exists in the set.');
}

// Find the tag in the set
const foundTag = tagSet.find(exampleTag);
if (foundTag) {
    console.log('Found tag:', foundTag.Name);
}
```