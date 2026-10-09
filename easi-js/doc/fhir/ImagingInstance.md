# `ImagingInstance` Class

The `ImagingInstance` class models the FHIR R4 ImagingStudy instance backbone. Its JSON contains `uid`, Coding-valued `sopClass`, and optional `number`/`title`. SOP class UIDs serialize as `urn:oid:` codes in the `urn:ietf:rfc:3986` system. R4 defines no instance endpoint, so the legacy JavaScript endpoint property is omitted from JSON.

---

## Inheritance

```text
ImagingInstance → BackboneElement
```

## Constructor

```js
new ImagingInstance()
```

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `number` | `*` | Accessor property. |
| `sopClass` | `*` | Accessor property. |
| `title` | `*` | Accessor property. |
| `uid` | `*` | Accessor property. |

## Methods

### `toJSON()`

Convert to JSON data

#### Returns

*(None — return value not explicitly documented.)*

---
