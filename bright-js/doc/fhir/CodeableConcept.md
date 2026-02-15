# `CodeableConcept` Class

The `CodeableConcept` class models a FHIR resource or element used by EASI DICOM mapping workflows.

---

## Inheritance

```text
CodeableConcept → Element
```

## Constructor

```js
new CodeableConcept(data)
```

### Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `data` | `*` | `—` | — |

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `coding` | `*` | Accessor property. |
| `text` | `*` | Accessor property. |

## Methods

### `static create(system, code)`

Create a new CodeableConcept instance.

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
