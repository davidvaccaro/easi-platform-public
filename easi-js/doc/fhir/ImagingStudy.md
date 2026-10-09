# `ImagingStudy` Class

The `ImagingStudy` class models the FHIR R4 4.0.1 resource used by the [DICOM mapping](../handlers/mappings/DicomToFHIRImagingStudyMapping.md). JSON includes its resource ID when set, a string `status`, Coding-array `modality`, Reference-array `endpoint`, and R4-shaped series/instances. A new model defaults to `status: 'unknown'`; the mapper uses its configured source status (default `'available'`). Legacy `ImagingStudyStatus` Symbols normalize to their string descriptions. Empty optional values are omitted.

---

## Inheritance

```text
ImagingStudy → DomainResource
```

## Constructor

```js
new ImagingStudy()
```

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `_series` | `*` | Instance property initialized in constructor. |
| `_status` | `*` | Instance property initialized in constructor. |
| `_subject` | `*` | Instance property initialized in constructor. |
| `description` | `*` | Accessor property. |
| `encounter` | `*` | Accessor property. |
| `identifier` | `*` | Accessor property. |
| `modality` | `*` | Accessor property. |
| `numberOfInstances` | `*` | Accessor property. |
| `numberOfSeries` | `*` | Accessor property. |
| `series` | `*` | Accessor property. |
| `started` | `*` | Accessor property. |
| `status` | `*` | Accessor property. |
| `subject` | `*` | Accessor property. |

## Methods

### `toJSON()`

Convert to JSON data

#### Returns

*(None — return value not explicitly documented.)*

---
