# `PipelineBuilder` Class

The `PipelineBuilder` class provides a fluent API for composing and configuring `PartStreamReader` instances.

---

## Inheritance

```text
PipelineBuilder → (none)
```

## Constructor

```js
new PipelineBuilder()
```

## Properties

| Property | Type    | Description |
|----------|---------|-------------|
| `handler` | `*` | Instance property initialized in constructor. |
| `isStrict` | `*` | Instance property initialized in constructor. |
| `reader` | `*` | Instance property initialized in constructor. |
| `parser` | `*` | Instance property initialized in constructor. |
| `onEmit` | `*` | Instance property initialized in constructor. |

## Methods

### `withParser(parser)`

Set the current parser.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `parser` | `DicomDataParser | JsonDataParser` | The parser used to parsed elements. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `withReader(reader)`

Set the current reader.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `reader` | `object` | The reader used to process source input. |

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
| `handler` | `DicomInstanceHandler | DicomJsonMetadataAdapter | DicomMappingHandler | DicomSelectingHandler` | The handler used to handle parsed elements. |

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `withOnEmit(onEmit)`

Sets the "onEmit" callback for the stream-read session.

#### Parameters

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `onEmit` | `Function` | The callback invoked whenever the pipeline emits a parsed result. |

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

### `fromPartStream()`

Sets the current build to use the part-stream reader source type.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `ofDicomData()`

Sets the current build to parse native DICOM byte data.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `ofDicomMetadata()`

Sets the current build to parse DICOM JSON metadata.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The reference to the current builder. |

---

### `ofDicomXmlMetadata()`

Sets the current build to parse DICOM XML metadata.

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

Build a new pipeline instance.

#### Returns

| Type | Description |
|------|-------------|
| `*` | The new pipeline instance. |

## Usage Example

```js
import EASI from '../../src/EASI.js';

const pipeline = EASI
  .pipelineBuilder()
  .fromPartStream().ofDicomData()
  .toInstances()
  .withIsStrict(true)
  .build();

const result = await pipeline.process('https://example.org/study/instance.dcm');
```
---
