# `StreamingXmlDataHandler` Class

The `StreamingXmlDataHandler` class materializes generic XML parser events into a plain JavaScript XML tree (document, element, and text nodes).

---

## Inheritance

```text
StreamingXmlDataHandler → (none)
```

## Constructor

```js
new StreamingXmlDataHandler()
```

## Purpose

- Consumes `StreamingXmlDataParser` lifecycle events.
- Builds a simple XML object graph with element attributes and ordered children.
- Returns parsed document results from stream processing.

## Usage Example

```js
import StreamingXmlDataParser from '../../../../src/parsers/StreamingXmlDataParser.js';
import StreamingXmlDataHandler from '../../../../src/handlers/terminals/syntax/StreamingXmlDataHandler.js';

const parser = new StreamingXmlDataParser();
parser.handler = new StreamingXmlDataHandler();

// Parse XML and collect a simple JS document tree.
```
