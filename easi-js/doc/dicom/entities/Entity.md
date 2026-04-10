# `Entity` Class

Provides an accessor interface for high-level DICOM&reg; modules from a given attribute set. This class acts as a wrapper to expose module-specific functionality for structured DICOM&reg; data access.

---

## Constructor

### `new Entity(attributeSet)`

Creates a new instance of the `Entity` class.

#### Parameters

| Name           | Type           | Description                                  |
|----------------|----------------|----------------------------------------------|
| `attributeSet` | `AttributeSet` | The attribute set representing a DICOM&reg; object.|

---

## Properties

### `generalSeriesModule`

Provides access to the **General Series Module**, which exposes series-level metadata such as Modality, Series Number, etc.

**Returns:** `GeneralSeriesModule`

---

## Example Usage

```javascript
import Entity from './Entity.js';
import AttributeSet from './AttributeSet.js';
import Tag from './Tag.js';

// Example setup
const attributes = new AttributeSet();
attributes.add({ tag: Tag.Modality, value: 'CT' });

const entity = new Entity(attributes);

// Access the General Series Module
const seriesModule = entity.generalSeriesModule;
console.log(seriesModule.modality.ID); // Outputs: 'CT'
```