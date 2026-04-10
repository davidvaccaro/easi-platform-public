# `Reference` Class

The `Reference` class models a FHIR&reg; resource or element used by EASI DICOM&reg; mapping workflows.

---

## Inheritance

```text
Reference → Element
```

## Constructor

```js
new Reference(reference)
```

### Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `reference` | `string` | `—` | The reference value. |

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `_reference` | `*` | Instance property initialized in constructor. |
| `display` | `*` | Accessor property. |
| `identifier` | `*` | Accessor property. |
| `reference` | `*` | Accessor property. |
| `type` | `*` | Accessor property. |

## Methods

### `toJSON()`

Convert to JSON data

#### Returns

*(None — return value not explicitly documented.)*

---
