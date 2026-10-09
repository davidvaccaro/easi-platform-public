# `ImagingSeries` Class

The `ImagingSeries` class models the FHIR R4 ImagingStudy series backbone. JSON uses `instance` (singular) for the repeating instance list, one `Coding` for `modality`, and a repeating array of `Reference` values for `endpoint`. The JavaScript `.instances` property remains an alias for `.instance`. Empty optional values are omitted. See the [mapping guide](../handlers/mappings/DicomToFHIRImagingStudyMapping.md).

---

## Inheritance

```text
ImagingSeries → BackboneElement
```

## Constructor

```js
new ImagingSeries()
```

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `description` | `*` | Accessor property. |
| `endpoint` | `*` | Accessor property. |
| `instance` | `Array<ImagingInstance>` | Canonical instance list. |
| `instances` | `Array<ImagingInstance>` | Compatibility alias for `instance`. |
| `modality` | `*` | Accessor property. |
| `number` | `*` | Accessor property. |
| `numberOfInstances` | `*` | Accessor property. |
| `started` | `*` | Accessor property. |
| `uid` | `*` | Accessor property. |

## Methods

### `toJSON()`

Convert to JSON data

#### Returns

*(None — return value not explicitly documented.)*

---
