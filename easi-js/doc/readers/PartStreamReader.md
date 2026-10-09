# `PartStreamReader` Class

`PartStreamReader` routes byte sources and Web Streams to a configured parser. It supports single-part payloads and MIME multipart payloads. Use `HttpStreamReader` for URL sources and `NodeStreamAdapterReader` for Node streams or async iterables.

## Constructor and properties

```js
const reader = new PartStreamReader();
reader.parser = parser;
reader.onPart = onEmit;
```

`parser` is the parser used for the transaction. `onPart` is an optional result callback; per-read `options.onEmit` overrides it, including `null` to disable emission. Callbacks can return promises.

## Reading

| Method | Source | Options |
| --- | --- | --- |
| `read(source, options = null)` | Byte source, Web Stream, or reader with `read()` | Routes to the appropriate method below. |
| `readData(data, options = null)` | `Uint8Array`, `ArrayBuffer`, typed-array view, or numeric array | `onEmit` |
| `readStream(source, options = null)` | `ReadableStream` or reader with `read()` | `contentType`, `contentLength`, `onEmit` |
| `parseContentType(source)` | Content-Type string, headers, response, or parsed metadata | Returns normalized media type and parameters. |

Read methods return a promise for the parser result. `contentType` selects multipart handling; a multipart source must supply a nonempty boundary and a complete closing delimiter. Unless processing stops intentionally, EOF before the closing delimiter rejects the read, even when an inner payload is complete. Media types and parameter names are case insensitive, while boundary values preserve their case. At every multipart boundary the parser receives a final chunk, even when the last payload bytes arrived in an earlier network chunk.

The reader accepts parser `SUCCESS`, `STOP`, and single-part `JUMP` as completed read operations. Parser failures, read failures, and callback failures reject the promise. Multipart `JUMP` skips the current part, or the next part when returned by the emission callback.

## Source ownership and cleanup

Passing a Web `ReadableStream` transfers ownership of the read transaction to EASI. EASI cancels unread input on early completion, parser failure, read failure, or callback failure, then releases any acquired reader lock. A failure before acquisition also cancels the supplied stream without taking a lock. Normal EOF releases the lock without cancellation. If processing fails and cleanup also fails, the processing error remains the rejection reason.

Passing an already-created reader keeps ownership with the caller. EASI releases its lock when possible but does not cancel its unread input; the caller must decide whether to continue reading or cancel it. Option validation and session reset happen before EASI acquires a Web Stream reader.

`NodeStreamAdapterReader` follows the same distinction for supplied readers. When it creates an iterator for a Node stream or async iterable, it calls `return()` on early completion or failure and destroys the Node readable when necessary. An exhausted iterator needs no cancellation.

## Example

```js
import PartStreamReader from '../../src/readers/PartStreamReader.js';
import DicomDataParser from '../../src/parsers/DicomDataParser.js';
import DicomInstanceHandler from '../../src/handlers/terminals/DicomInstanceHandler.js';

const reader = new PartStreamReader();
const parser = new DicomDataParser();
parser.handler = new DicomInstanceHandler();
reader.parser = parser;

const result = await reader.readStream(stream, {
  contentType: 'application/dicom'
});
```
