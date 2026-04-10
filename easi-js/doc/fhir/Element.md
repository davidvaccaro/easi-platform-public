# `Element` Class

The `Element` class models a FHIR&reg; resource or element used by EASI DICOM&reg; mapping workflows.

---

## Inheritance

```text
Element → Base
```

## Constructor

```js
new Element(data)
```

### Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `data` | `*` | `—` | — |

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `id` | `*` | Accessor property. |

## Methods

### `addMultiValue(name, value)`

Add a specified value to the potentially multi-vaued property identified by the specified name.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `name` | `string` | The specified name of the multi-valued property to append to. |
| `value` | `*` | The value to append. |

#### Returns

*(None — return value not explicitly documented.)*

---
