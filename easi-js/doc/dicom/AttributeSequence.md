# AttributeSequence

Represents a DICOM&reg; Attribute Sequence — a collection of items (each containing DICOM&reg; attributes), supporting operations such as adding items, searching for attributes, and checking for attribute existence.

---

## Constructor

### `constructor(tag, valueLength, data, transferSyntax)`

Constructs an empty new DICOM&reg; Attribute Sequence instance.

#### Parameters

| Parameter        | Type    | Description                                      |
|------------------|---------|--------------------------------------------------|
| `tag`            | `any`   | The DICOM&reg; tag of this sequence.                  |
| `valueLength`    | `any`   | The value length of the sequence data.           |
| `data`           | `any`   | The raw sequence data (usually empty at init).   |
| `transferSyntax` | `any`   | The transfer syntax used for encoding.           |

#### Returns

| Type        | Description            |
|-------------|------------------------|
| `AttributeSequence` | New instance of `AttributeSequence`. |

---

## Methods

### `add(item)`

Adds a new item to the sequence.

#### Parameters

| Parameter | Type  | Description                   |
|-----------|-------|-------------------------------|
| `item`    | `Item` | The item to add to the sequence.|

#### Returns

| Type  | Description            |
|-------|------------------------|
| `void`| No return value.        |

---

### `addAll(items)`

Adds an array of items to the sequence.

#### Parameters

| Parameter | Type    | Description                         |
|-----------|---------|-------------------------------------|
| `items`   | `Array<Item>` | Array of items to add to the sequence.|

#### Returns

| Type  | Description            |
|-------|------------------------|
| `void`| No return value.        |

---

### `find(tag)`

Finds all items in the sequence that contain the specified tag.

#### Parameters

| Parameter | Type  | Description                          |
|-----------|-------|--------------------------------------|
| `tag`     | `Tag` | The DICOM&reg; tag to search for.          |

#### Returns

| Type    | Description                                      |
|---------|--------------------------------------------------|
| `Array` | Array of matching items, or empty array if none.  |

---

### `has(tag)`

Determines if the specified tag exists in any of the sequence items.

#### Parameters

| Parameter | Type  | Description                 |
|-----------|-------|-----------------------------|
| `tag`     | `Tag` | The DICOM&reg; tag to check for.  |

#### Returns

| Type    | Description                            |
|---------|----------------------------------------|
| `boolean`| `true` if tag exists, `false` otherwise.|

---

## Properties

| Property | Type      | Description                                      |
|----------|-----------|--------------------------------------------------|
| `items`  | `Array`   | The collection of sequence items. Each item is typically a set of DICOM&reg; attributes. |

---

## Example Usage

```js
// Create a new empty AttributeSequence
const sequence = new AttributeSequence(tag, valueLength, data, transferSyntax);

// Add an item to the sequence
sequence.add(item);

// Add multiple items
sequence.addAll([item1, item2, item3]);

// Search for a tag
const results = sequence.find(someTag);

// Check if tag exists in sequence
if (sequence.has(someTag)) {
    console.log("Tag found in sequence");
}
```