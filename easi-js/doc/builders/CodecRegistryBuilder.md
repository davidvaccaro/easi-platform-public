# `CodecRegistryBuilder` Class

`CodecRegistryBuilder` provides a fluent API for creating validated codec registries.

It is exposed from `EASI`:

- `EASI.codecRegistryBuilder()`
- `EASI.CodecRegistry.builder()`

## Core Flow

```js
import EASI from "../../src/EASI.js";

const codecRegistry = EASI
  .CodecRegistry
  .builder()
  .withDefaultCodecs()
  .withEncoder("custom-format", customEncoder)
  .build(); // internally calls assertValid(...)
```

## Methods

- `withBaseCodecRegistry(codecRegistry, clone = true)`
- `withDefaultCodecs(enabled = true)`
- `withDecoderForTransferSyntax(transferSyntax, decoderPrototypeOrConstructor)`
- `withEncoder(format, encoder)`
- `withValidation(validationOptions)`
- `withAssertValid(enabled = true)`
- `build()`

## Notes

- `build()` enforces `codecRegistry.assertValid(...)` by default.
- To skip assert-valid at build-time, call `withAssertValid(false)`.
- `withBaseCodecRegistry(..., true)` clones the base registry before applying changes.
