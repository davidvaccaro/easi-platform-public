# EASI Transcoding Contract (Draft)

## Status

Draft normative extension for implementations that claim support for `withTranscoding(...)`.

This document is not part of the minimum EASI Core v0.1 set, but defines the expected contract for cross-language consistency when transcoding is implemented.

## Purpose

Define a standard pipeline option for native DICOM&reg; byte transcoding:

- source: native DICOM&reg;
- transform: transfer-syntax transcoding (and related pixel conversion decisions)
- output: native DICOM&reg;

This contract focuses on predictable behavior, streaming compatibility, and diagnostics.

## Builder Surface

Implementations that support transcoding SHOULD expose:

- `withTranscoding(options)`

Supported call forms:

- `withTranscoding(null)` or `withTranscoding(false)` disables transcoding
- `withTranscoding("1.2.840.10008.1.2.1")` shorthand for target transfer syntax
- `withTranscoding({...})` full options object

## Options Object Contract

| Property | Type | Required | Description |
|---|---|---|---|
| `targetTransferSyntax` | `string` | Yes | Target DICOM&reg; transfer syntax UID. |
| `goal` | `'compatibility' \| 'size' \| 'speed' \| 'fidelity'` | No | Optimization intent used to choose codecs/strategy. Default: implementation-defined. |
| `streaming` | `'auto' \| 'required' \| 'allow-buffer'` | No | Streaming requirement for payload processing. Default: `'auto'`. |
| `frames` | `'all' \| 'first' \| number[] \| { start:number, end:number, step?:number }` | No | Frame subset to transcode for multi-frame payloads. Default: `'all'`. |
| `codec` | `object` | No | Optional codec hints (`decode`, `encode`, `quality`, `subsampling`, `reversible`). |
| `metadata` | `object` | No | Optional metadata update strategy during transcode. |
| `fallback` | `'fail' \| 'skip-frame' \| 'passthrough'` | No | Behavior when a frame or payload cannot be transcoded. Default: `'fail'`. |
| `codecRegistry` | `object` | No | Optional registry override for decoder/encoder resolution. |
| `onFrame` | `function` | No | Callback invoked for each transcoded frame (or payload segment) completion. |
| `onConcern` | `function` | No | Callback invoked when anomalies, policy conflicts, or failures are detected. |

### `codec` Hints

`codec` MAY include:

- `decode`: source decode pipeline hint (for example `'native'`, `'rgba'`)
- `encode`: target encode pipeline hint (for example `'jpeg'`, `'jpeg2000'`, `'rle'`)
- `quality`: numeric quality hint when lossy encoding is selected
- `subsampling`: chroma subsampling hint (implementation-defined values)
- `reversible`: boolean hint for reversible/lossless preference

Implementations MAY ignore unsupported hints but SHOULD emit `onConcern` with category `Policy` when they do.

## Callback Contract

### `onFrame(frameInfo)`

`onFrame` receives a single object argument:

| Field | Type | Required | Description |
|---|---|---|---|
| `instanceUid` | `string \| null` | No | SOP Instance UID when available. |
| `frameIndex` | `number` | Yes | Zero-based frame index. |
| `frameCount` | `number \| null` | No | Total frame count when known. |
| `sourceTransferSyntax` | `string` | Yes | Source transfer syntax UID. |
| `targetTransferSyntax` | `string` | Yes | Target transfer syntax UID. |
| `decodeCodec` | `string \| null` | No | Decoder identifier selected for the frame. |
| `encodeCodec` | `string \| null` | No | Encoder identifier selected for the frame. |
| `sourceBytes` | `number \| null` | No | Input byte count for the frame when known. |
| `targetBytes` | `number \| null` | No | Output byte count for the frame when known. |
| `elapsedMs` | `number \| null` | No | Per-frame transcoding duration in milliseconds. |
| `rows` | `number \| null` | No | Frame rows when known. |
| `columns` | `number \| null` | No | Frame columns when known. |
| `samplesPerPixel` | `number \| null` | No | Samples-per-pixel when known. |
| `bitsAllocated` | `number \| null` | No | Bits allocated when known. |
| `isLossy` | `boolean \| null` | No | Whether resulting encoding is lossy. |
| `isFinalFrame` | `boolean \| null` | No | True when this is known to be final processed frame for the payload. |
| `warnings` | `string[]` | No | Non-terminal warnings associated with this frame. |

`onFrame` return handling:

- returning `undefined` MUST be treated as `CONTINUE`
- returning `CONTINUE`, `STOP`, `JUMP`, or `FAIL` MUST be honored using standard EASI status semantics

### `onConcern(concern)`

`onConcern` receives a single object argument:

| Field | Type | Required | Description |
|---|---|---|---|
| `severity` | `'info' \| 'warning' \| 'error'` | Yes | Concern severity level. |
| `category` | `'Decode' \| 'Encode' \| 'Policy' \| 'Compatibility' \| 'DataQuality' \| 'Streaming' \| 'I/O'` | Yes | Concern category. |
| `code` | `string` | Yes | Stable implementation concern code. |
| `message` | `string` | Yes | Human-readable summary. |
| `scope` | `'Instance' \| 'Attribute' \| 'Frame' \| 'Pipeline'` | Yes | Scope of concern. |
| `path` | `string \| null` | No | Canonical path (for example `/DataSet/(7FE0,0010)`). |
| `frameIndex` | `number \| null` | No | Frame index when concern is frame-scoped. |
| `sourceTransferSyntax` | `string \| null` | No | Source transfer syntax UID when known. |
| `targetTransferSyntax` | `string \| null` | No | Target transfer syntax UID when known. |
| `actionTaken` | `'continued' \| 'skipped-frame' \| 'passthrough' \| 'failed'` | Yes | Runtime action selected by policy. |
| `error` | `{ name?:string, message?:string } \| null` | No | Optional machine-readable error summary. |

`onConcern` return handling:

- returning `undefined` MUST be treated as `CONTINUE`
- returning `CONTINUE`, `STOP`, `JUMP`, or `FAIL` MUST be honored using standard EASI status semantics

## Compatibility Rules

Implementations SHOULD fail-fast at `build()` when `withTranscoding(...)` is configured with an incompatible pipeline.

Minimum compatibility expectations:

- parser MUST provide canonical DICOM&reg; semantic events required for pixel payload handling
- terminal/output MUST support native DICOM&reg; emission for round-trip transcoding claims
- missing required transcoding components (decoder/encoder/registry) MUST produce explicit errors

## Streaming Expectations

If `streaming` is set to `'required'`:

- implementation MUST avoid full payload materialization for transcoded payload paths where feasible
- if strict streaming cannot be honored, implementation MUST fail with a concern categorized as `Streaming`

If `streaming` is `'auto'`:

- implementation MAY materialize when required by codec/runtime constraints
- implementation SHOULD emit concerns when fallback buffering materially changes memory behavior

## Reference Example

```js
const pipeline = EASI.pipelineBuilder()
  .fromPartStream()
  .ofDicomData()
  .withDeIdentification()
  .withTranscoding({
    targetTransferSyntax: "1.2.840.10008.1.2.1",
    goal: "compatibility",
    streaming: "required",
    fallback: "fail",
    onFrame: (frame) => {
      console.log(`Frame ${frame.frameIndex} -> ${frame.targetBytes} bytes`);
    },
    onConcern: (concern) => {
      if (concern.severity === "error") {
        return Status.FAIL;
      }
      return Status.CONTINUE;
    }
  })
  .toDicomData({ collectOutput: false })
  .build();
```
