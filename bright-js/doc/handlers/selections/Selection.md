# `Selection` Class

The `Selection` class defines DICOM tag selection behavior for selective stream extraction workflows.

---

## Inheritance

```text
Selection → (none)
```

## Constructor

```js
new Selection()
```

## Methods

### `start(context)`

Start the selection session.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | The session context. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `end(context)`

End the selection session.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `*` | The session context. |

#### Returns

*(None — return value not explicitly documented.)*

## Usage Example

```js
import Selection from '../../../src/handlers/selections/Selection.js';

class CustomSelection extends Selection {
  start(context) { return context; }
  end(context) { return context; }
}

const selection = new CustomSelection();
```
---
