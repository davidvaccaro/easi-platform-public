# `Reference` Class

The `Reference` class models a FHIR resource or element used by EASI DICOM mapping workflows.

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
| `reference` | `*` | `—` | The reference value. |

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
