# `Mapping` Class

The `Mapping` class defines DICOM&reg;-to-target mapping behavior used by streaming mapping handlers.

---

## Inheritance

```text
Mapping → (none)
```

## Constructor

```js
new Mapping()
```

## Methods

### `add(key, property)`

Add a maping from a key to an object property.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `key` | `string` | The specified key. |
| `property` | `string` | The property name or path to a property within an object hierarchy. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `has(key)`

Determine if the mapping has the current key.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `key` | `string` | The specified key. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | TRUE if the mapping maps the key, FALSE otherwise. |

---

### `start(context)`

Start the mapping session.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `object` | The session context. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `end(context)`

End the mapping session.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `object` | The session context. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `map(context, key, value)`

Map the key and value to the destination property.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `context` | `object` | The session context. |
| `key` | `string` | The specified key. |
| `value` | `unknown` | The value to set to the destination mapped attribute. |

#### Returns

*(None — return value not explicitly documented.)*

## Usage Example

```js
import Mapping from '../../../src/handlers/mappings/Mapping.js';

const mapping = new Mapping();
mapping.add('patientId', 'result.subject.identifier');

const context = { result: { subject: {} } };
mapping.map(context, 'patientId', '12345');

console.log(context.result.subject.identifier); // 12345
```
---
