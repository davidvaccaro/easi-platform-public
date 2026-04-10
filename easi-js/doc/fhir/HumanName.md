# `HumanName` Class

The `HumanName` class models a FHIR&reg; resource or element used by EASI DICOM&reg; mapping workflows.

---

## Inheritance

```text
HumanName → Element
```

## Constructor

```js
new HumanName()
```

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `family` | `*` | Accessor property. |
| `given` | `*` | Accessor property. |
| `period` | `*` | Accessor property. |
| `prefix` | `*` | Accessor property. |
| `suffix` | `*` | Accessor property. |
| `text` | `*` | Accessor property. |
| `use` | `*` | Accessor property. |

## Methods

### `addGiven(given)`

Add an name to the multi-value given name.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `given` | `string` | The specified given name. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `addPrefix(prefix)`

Add an prefix to the multi-value prefix.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `prefix` | `string` | The specified prefix. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `addSuffix(suffix)`

Add an suffix to the multi-value suffix.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `suffix` | `string` | The specified suffix. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `static coerce(value)`

Coerce the specified value into a complete HumanName.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `value` | `HumanName | string` | The specified value. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `toJSON()`

Convert to JSON data

#### Returns

*(None — return value not explicitly documented.)*

---
