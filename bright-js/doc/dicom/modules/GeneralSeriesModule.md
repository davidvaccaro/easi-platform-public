# `GeneralSeriesModule` Class

Represents the DICOM *General Series Module*, providing access to key attributes such as `Modality` from a DICOM data set.

## Inheritance

```text
GeneralSeriesModule → Module
```

## Constructor

### `new GeneralSeriesModule(attributeSet)`

Creates a new instance of `GeneralSeriesModule`.

#### Parameters

| Name          | Type             | Description                          |
|---------------|------------------|--------------------------------------|
| `attributeSet`| `AttributeSet`   | The set of DICOM attributes to access. |

---

## Properties

### `modality`

Gets the value of the Modality (DICOM Tag `0008,0060`) in the series.

#### Returns

| Type       | Description                                                  |
|------------|--------------------------------------------------------------|
| `Modality` | The corresponding `Modality` object, or `Modality.NONE` if undefined or unrecognized. |

---

## Example Usage

```javascript
import GeneralSeriesModule from './GeneralSeriesModule';
import AttributeSet from './AttributeSet';
import Tag from './Tag';

// Sample attribute set with Modality
const attributeSet = new AttributeSet();
attributeSet.add({
  tag: Tag.Modality,
  value: 'CT'
});

// Create GeneralSeriesModule instance
const seriesModule = new GeneralSeriesModule(attributeSet);

// Access the modality
console.log(seriesModule.modality.ID);  // Output: CT
```