# `StreamingReaderBuilder` Class

The `StreamingReaderBuilder` class provides a fluent API for composing and configuring `StreamingReader` instances.

---

## Inheritance

```text
StreamingReaderBuilder → (none)
```

## Constructor

```js
new StreamingReaderBuilder()
```

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `handler` | `*` | Instance property initialized in constructor. |
| `isStrict` | `*` | Instance property initialized in constructor. |
| `parser` | `*` | Instance property initialized in constructor. |
| `resolveOnPart` | `*` | Instance property initialized in constructor. |

## Methods

### `withParser(parser)`

Set the current parser.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `parser` | `StreamingDicomDataParser | StreamingJsonDataParser` | The parser used to parsed elements. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `withHandler(handler)`

Set the current handler.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `handler` | `StreamingDicomInstanceHandler | StreamingDicomJsonMetadataAdapter | StreamingDicomMappingHandler | StreamingDicomSelectingHandler` | The handler used to handle parsed elements. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `withOnPart(onPart)`

Sets the "onPart" option for the stream-read session.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `onPart` | `Function` | The "onPart" function handler called to resolve each part of a multi-part stream. |

#### Returns

*(None — return value not explicitly documented.)*

---

### `withIsStrict(isStrict)`

Sets the the status indicating that this parser is perfomring "strict" parsing.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `isStrict` | `boolean` | Indicates that the parsing should be performed "strictly" |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `fromDicomData()`

Sets the current build to stream-parse DICOM Data.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `fromDicomMetadata()`

Sets the current build to stream-parse DICOM Metadata.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `toInstances()`

Sets the current build to stream-parse to DICOM instances.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `toMapping(mapping)`

Sets the current build to stream-parse to a mapping.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `mapping` | `*` | Parameter accepted by method. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `toSelection(selection)`

Sets the current build to stream-parse to a selection.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `selection` | `*` | Parameter accepted by method. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `toFHIRImagingStudies()`

Sets the current build to stream-parse to a FHIR ImagingStudy resource.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `build()`

Build a new reader instance.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The new reader instance. |

## Usage Example

```js
import EASI from '../../src/EASI.js';

const reader = EASI
  .newStreamingReaderBuilder()
  .fromDicomData()
  .toInstances()
  .withIsStrict(true)
  .build();

const result = await reader.read('https://example.org/study/instance.dcm');
```
---
