# VisualizationFunctionModule Class

Provides access to DICOM **Visualization Function Module** attributes, such as window center and window width for image display configuration.

---

## Inheritance

```text
VisualizationFunctionModule → Module
```

## Constructor

### `new VisualizationFunctionModule(attributeSet)`

Creates a new instance of `VisualizationFunctionModule`.

#### Parameters

| Name           | Type           | Description                                     |
|----------------|----------------|-------------------------------------------------|
| `attributeSet` | `AttributeSet` | The DICOM attribute set to extract values from. |

---

## Properties

### `windowCenter`

Gets the **Window Center** value (`Tag.WindowCenter`).

#### Returns

| Type            | Description                                 |
|-----------------|---------------------------------------------|
| `number` or `number[]` | A single numeric value or array of values depending on value multiplicity. |

---

### `windowWidth`

Gets the **Window Width** value (`Tag.WindowWidth`).

#### Returns

| Type            | Description                                 |
|-----------------|---------------------------------------------|
| `number` or `number[]` | A single numeric value or array of values depending on value multiplicity. |

---

## Example Usage

```javascript
import VisualizationFunctionModule from './VisualizationFunctionModule';
import AttributeSet from './AttributeSet';
import Tag from './Tag';

const attributeSet = new AttributeSet();
attributeSet.add({ tag: Tag.WindowCenter, value: '40' });
attributeSet.add({ tag: Tag.WindowWidth, value: '400' });

const visModule = new VisualizationFunctionModule(attributeSet);

console.log(visModule.windowCenter);  // 40
console.log(visModule.windowWidth);   // 400
```