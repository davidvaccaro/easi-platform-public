# MultiFrameModule Class

Provides access to DICOM **Multi-frame Module** attributes, including number of frames and stereo pair presence.

## Inheritance

```text
MultiFrameModule → Module
```

## Constructor

### `new MultiFrameModule(attributeSet)`

Creates a new instance of `MultiFrameModule`.

#### Parameters

| Name           | Type           | Description                                     |
|----------------|----------------|-------------------------------------------------|
| `attributeSet` | `AttributeSet` | The DICOM attribute set to extract values from. |

---

## Properties

### `stereoPairsPresent`

Gets the **Stereo Pairs Present** value (`Tag.StereoPairsPresent`).

#### Returns

| Type     | Description                          |
|----------|--------------------------------------|
| `string` | A string value, typically "YES" or "NO". |

---

### `numberOfFrames`

Gets the **Number of Frames** value (`Tag.NumberOfFrames`).

#### Returns

| Type     | Description                      |
|----------|----------------------------------|
| `number` | The number of frames as an integer. |

---

## Example Usage

```javascript
import MultiFrameModule from './MultiFrameModule';
import AttributeSet from './AttributeSet';
import Tag from './Tag';

const attributeSet = new AttributeSet();
attributeSet.add({ tag: Tag.StereoPairsPresent, value: 'NO' });
attributeSet.add({ tag: Tag.NumberOfFrames, value: '30' });

const multiFrame = new MultiFrameModule(attributeSet);

console.log(multiFrame.stereoPairsPresent);  // 'NO'
console.log(multiFrame.numberOfFrames);      // 30
```