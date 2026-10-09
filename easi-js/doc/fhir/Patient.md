# `Patient` Class

The `Patient` class supports contained FHIR R4 Patients in ImagingStudy mappings. Its JSON includes `id` and repeating `identifier`, `name`, and `telecom` arrays. The `.telcom` and `.addTelcom()` spellings remain JavaScript compatibility aliases for `.telecom` and `.addTelecom()`. Empty optional values are omitted; birth dates remain FHIR date strings. See the [mapping guide](../handlers/mappings/DicomToFHIRImagingStudyMapping.md).

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
| `telecom` | `Array<ContactPoint>` | Contact details. |
| `telcom` | `Array<ContactPoint>` | Compatibility alias for `telecom`. |

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
