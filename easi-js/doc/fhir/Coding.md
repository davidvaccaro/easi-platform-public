# `Coding` Class

The `Coding` class models a FHIR&reg; resource or element used by EASI DICOM&reg; mapping workflows.

---

## Inheritance

```text
Coding → Element
```

## Constructor

```js
new Coding(data)
```

### Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `data` | `*` | `—` | — |

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `code` | `*` | Accessor property. |
| `display` | `*` | Accessor property. |
| `system` | `*` | Accessor property. |
| `userSelected` | `*` | Accessor property. |
| `version` | `*` | Accessor property. |

## Methods

### `static create(system, code)`

Create a new Coding instance.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `system` | `string` | The specified system. |
| `code` | `string` | The specified system. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `toJSON()`

Convert to JSON data

#### Returns

*(None — return value not explicitly documented.)*

---
