# `Item` Class

The `Item` class represents a DICOM Part-10 Sequence Item, extending `AttributeSet` to encapsulate a group of attributes within a DICOM sequence.

---

## Inheritance

```text
Item → AttributeSet
```

## Constructor

### `constructor(valueLength)`

Constructs a DICOM Part-10 Sequence Item.

#### Parameters

| Name         | Type | Description                         |
|--------------|------|-------------------------------------|
| valueLength  | `*`  | The length of the item's data field. |

---

## Inheritance

This class extends: `AttributeSet`

---

## Usage Example

```javascript
import Item from './Item.js';

// Create a new sequence item with specified value length
const item = new Item(128);

// Check and add attributes to the item
if (!item.has(someTag)) {
    item.add(someAttribute);
}
```