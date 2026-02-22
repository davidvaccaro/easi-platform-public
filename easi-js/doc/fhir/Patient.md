# `Patient` Class

The `Patient` class models a FHIR resource or element used by EASI DICOM mapping workflows.

---

## Inheritance

```text
Patient → DomainResource
```

## Constructor

```js
new Patient()
```

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `active` | `*` | Accessor property. |
| `birthDate` | `*` | Accessor property. |
| `gender` | `*` | Accessor property. |
| `identifier` | `*` | Accessor property. |
| `name` | `*` | Accessor property. |
| `telcom` | `*` | Accessor property. |

## Methods

### `addName(name)`

Adds the name value.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `name` | `HumanName | string` | The name value to add. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `addTelcom(telcom)`

Adds the telcom value.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `telcom` | `ContactPoint | object | string` | The telcom value to add. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `toJSON()`

Convert to JSON data

#### Returns

*(None — return value not explicitly documented.)*

---
