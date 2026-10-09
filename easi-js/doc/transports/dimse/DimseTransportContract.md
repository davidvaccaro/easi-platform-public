# DIMSE Transport Contracts

EASI separates DIMSE protocol transport concerns from pipeline composition.

Two transport contracts are used:

## Source Transport Contract

Used by `fromDimseAssociation(...)` through `DimseAssociationReader`.

Required function:

```js
read(association, options?)
```

The transport is responsible for executing DIMSE source operations (for example C-FIND, C-GET, or C-MOVE retrieval orchestration) and returning streamable payloads to the reader path.

An empty success must return an envelope with `empty: true`, zero-length byte `source`, and `metadata.count: 0` (and zero/absent `contentLength`). The reader returns no objects and skips parsing. Zero bytes without that explicit envelope are invalid. The reader exposes envelope metadata through `lastMetadata` and forwards an AbortSignal to transport reads. An undefined envelope `onEmit` preserves the caller's callback; `null` explicitly disables it.

## Destination Transport Contract

Used by `intoDimseAssociation(...)` through `DimseAssociationWriter`.

Required function:

```js
write(association, payload, options?)
```

The transport is responsible for destination DIMSE writes (typically C-STORE SCU).

## Built-in Node DIMSE Transports

- `NodeDimseQueryRetrieveSourceTransport` (source: C-FIND/C-GET/C-MOVE)
- `NodeDimseCStoreScpSourceTransport` (source: inbound C-STORE SCP)
- `NodeDimseCStoreScuTransport` (destination: outbound C-STORE SCU)

## Validation

`PipelineBuilder.build()` fails fast when:

- DIMSE reader is configured without a source transport.
- DIMSE writer is configured without a destination transport.
- DIMSE writer is used without a terminal DICOM&reg; byte handler (`toDicomData(...)`).
