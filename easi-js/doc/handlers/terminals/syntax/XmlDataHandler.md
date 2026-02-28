# `XmlDataHandler` Class

The `XmlDataHandler` class materializes generic XML parser events into a plain JavaScript XML tree (document, element, and text nodes).

---

## Inheritance

```text
XmlDataHandler → (none)
```

## Constructor

```js
new XmlDataHandler()
```

## Purpose

- Consumes `XmlDataParser` lifecycle events.
- Builds a simple XML object graph with element attributes and ordered children.
- Returns parsed document results from stream processing.

## Usage Example

```js
import XmlDataParser from '../../../../src/parsers/XmlDataParser.js';
import XmlDataHandler from '../../../../src/handlers/terminals/syntax/XmlDataHandler.js';

const parser = new XmlDataParser();
parser.handler = new XmlDataHandler();

// Parse XML and collect a simple JS document tree.
```
