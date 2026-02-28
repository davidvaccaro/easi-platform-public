//
// XmlDataParser.js - 1.0.0
//
// XML Data Parser Class
//

import DataParser from "./DataParser.js";
import Exception from "../environment/Exception.js";
import { ParseErrorCodes } from "../environment/Exception.js";
import { Status } from "./Status.js";

export default class XmlDataParser extends DataParser {

    /**
     * Split an XML qualified name into prefix/local parts.
     * @param {string} name The qualified name.
     * @returns {{ name: string, prefix: string | null, localName: string }}
     */
    splitQualifiedName(name) {

        const index = name.indexOf(":");
        if (index < 0) {
            return {
                name: name,
                prefix: null,
                localName: name
            };
        }

        return {
            name: name,
            prefix: name.substring(0, index),
            localName: name.substring(index + 1)
        };

    }

    /**
     * Decode common XML entities in text and attribute values.
     * @param {string} value The XML encoded text.
     * @returns {string} The decoded text.
     */
    decodeXmlEntities(value) {

        if ((value == null) || (value.indexOf("&") < 0))
            return value;

        return value.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (match, entity) => {

            switch (entity) {
                case "amp":
                    return "&";
                case "lt":
                    return "<";
                case "gt":
                    return ">";
                case "quot":
                    return "\"";
                case "apos":
                    return "'";
            }

            if (entity.startsWith("#x") == true) {
                const code = Number.parseInt(entity.substring(2), 16);
                if (Number.isFinite(code) == true)
                    return String.fromCodePoint(code);
            }
            else if (entity.startsWith("#") == true) {
                const code = Number.parseInt(entity.substring(1), 10);
                if (Number.isFinite(code) == true)
                    return String.fromCodePoint(code);
            }

            return match;

        });

    }

    /**
     * Normalize and track parser statuses returned by XML handler events.
     * @param {string} name The event name.
     * @param {*} param The event parameter.
     * @param {*} currentStatus The current status.
     * @returns {* | Promise<*>} The raw event result.
     */
    fireXmlEvent(name, param = null, currentStatus = null) {

        const result = super.fireStreamEvent(name, param, currentStatus);

        if (this.isThenable(result) == true) {
            return result.then((resolved) => {
                if ((resolved == Status.STOP) || (resolved == Status.JUMP) || (resolved == Status.FAIL))
                    this.status = resolved;
                return resolved;
            });
        }

        if ((result == Status.STOP) || (result == Status.JUMP) || (result == Status.FAIL))
            this.status = result;

        return result;

    }

    /**
     * Determine if the supplied character is XML whitespace.
     * @param {string} ch The character.
     * @returns {boolean} TRUE if whitespace.
     */
    isWhitespace(ch) {
        return ((ch === " ") || (ch === "\t") || (ch === "\r") || (ch === "\n"));
    }

    /**
     * Find the matching tag-end delimiter while respecting quoted attribute values.
     * @param {string} source The current XML buffer.
     * @returns {number} The tag-end index or -1 when incomplete.
     */
    findTagEnd(source) {

        var quote = null;

        for (var i = 1; i < source.length; i++) {

            const ch = source[i];

            if (quote != null) {
                if (ch === quote)
                    quote = null;
                continue;
            }

            if ((ch === "\"") || (ch === "'")) {
                quote = ch;
                continue;
            }

            if (ch === ">")
                return i;

        }

        return -1;

    }

    /**
     * Parse a start-tag inner payload (without angle brackets).
     * @param {string} raw The raw tag payload.
     * @returns {{ name: string, attributes: object, isSelfClosing: boolean }}
     */
    parseStartTag(raw) {

        var i = 0;
        const length = raw.length;

        while ((i < length) && (this.isWhitespace(raw[i]) == true))
            i++;

        if (i >= length)
            throw new Exception("Invalid XML: Missing element name.", ParseErrorCodes.InvalidElement);

        const start = i;
        while ((i < length) && (this.isWhitespace(raw[i]) == false) && (raw[i] !== "/"))
            i++;

        var name = raw.substring(start, i);
        if (name.length == 0)
            throw new Exception("Invalid XML: Missing element name.", ParseErrorCodes.InvalidElement);

        const attributes = {};
        var isSelfClosing = false;

        while (i < length) {

            while ((i < length) && (this.isWhitespace(raw[i]) == true))
                i++;

            if (i >= length)
                break;

            if (raw[i] === "/") {
                isSelfClosing = true;
                i++;
                while ((i < length) && (this.isWhitespace(raw[i]) == true))
                    i++;
                if (i < length)
                    throw new Exception("Invalid XML: Unexpected content after self-closing delimiter.", ParseErrorCodes.InvalidElement);
                break;
            }

            const attributeNameStart = i;
            while ((i < length)
                && (this.isWhitespace(raw[i]) == false)
                && (raw[i] !== "=")
                && (raw[i] !== "/")) {
                i++;
            }

            var attributeName = raw.substring(attributeNameStart, i);
            if (attributeName.length == 0)
                throw new Exception("Invalid XML: Invalid attribute name.", ParseErrorCodes.InvalidElement);

            while ((i < length) && (this.isWhitespace(raw[i]) == true))
                i++;

            if ((i >= length) || (raw[i] !== "="))
                throw new Exception("Invalid XML: Attribute is missing '='.", ParseErrorCodes.InvalidElement);

            i++;

            while ((i < length) && (this.isWhitespace(raw[i]) == true))
                i++;

            if (i >= length)
                throw new Exception("Invalid XML: Attribute is missing a quoted value.", ParseErrorCodes.InvalidElement);

            const quote = raw[i];
            if ((quote !== "\"") && (quote !== "'"))
                throw new Exception("Invalid XML: Attribute value must be quoted.", ParseErrorCodes.InvalidElement);

            i++;
            const attributeValueStart = i;
            while ((i < length) && (raw[i] !== quote))
                i++;

            if (i >= length)
                throw new Exception("Invalid XML: Unterminated attribute value.", ParseErrorCodes.InvalidElement);

            const attributeValue = raw.substring(attributeValueStart, i);
            attributes[attributeName] = this.decodeXmlEntities(attributeValue);

            i++;

        }

        return {
            name: name,
            attributes: attributes,
            isSelfClosing: isSelfClosing
        };

    }

    /**
     * Emit text content when non-empty.
     * @param {string} text The raw text content.
     */
    async emitText(text) {

        if ((text == null) || (text.length == 0))
            return Status.CONTINUE;

        return await this.fireXmlEvent("onText", {
            text: this.decodeXmlEntities(text)
        });

    }

    /**
     * Parse as much XML as possible from the current buffer.
     * @param {boolean} isDone Indicates that no more input will be provided.
     */
    async parseBufferedXml(isDone = false) {

        while (this.status == Status.CONTINUE) {

            if (this.buffer.length == 0)
                break;

            // Text node content (hold if the next tag boundary is not yet available).
            if (this.buffer[0] !== "<") {

                const nextTagIndex = this.buffer.indexOf("<");

                if (nextTagIndex < 0) {
                    if (isDone == true) {
                        await this.emitText(this.buffer);
                        this.buffer = "";
                    }
                    break;
                }

                await this.emitText(this.buffer.substring(0, nextTagIndex));
                this.buffer = this.buffer.substring(nextTagIndex);
                continue;

            }

            // Comments
            if (this.buffer.startsWith("<!--")) {

                const endComment = this.buffer.indexOf("-->");
                if (endComment < 0) {
                    if (isDone == true)
                        throw new Exception("Invalid XML: Unterminated comment.", ParseErrorCodes.InvalidElement);
                    break;
                }

                this.buffer = this.buffer.substring(endComment + 3);
                continue;

            }

            // XML declaration / processing instruction
            if (this.buffer.startsWith("<?")) {

                const endInstruction = this.buffer.indexOf("?>");
                if (endInstruction < 0) {
                    if (isDone == true)
                        throw new Exception("Invalid XML: Unterminated processing instruction.", ParseErrorCodes.InvalidElement);
                    break;
                }

                this.buffer = this.buffer.substring(endInstruction + 2);
                continue;

            }

            // CDATA
            if (this.buffer.startsWith("<![CDATA[")) {

                const endCData = this.buffer.indexOf("]]>");
                if (endCData < 0) {
                    if (isDone == true)
                        throw new Exception("Invalid XML: Unterminated CDATA section.", ParseErrorCodes.InvalidElement);
                    break;
                }

                await this.emitText(this.buffer.substring(9, endCData));
                this.buffer = this.buffer.substring(endCData + 3);
                continue;

            }

            const tagEnd = this.findTagEnd(this.buffer);
            if (tagEnd < 0) {
                if (isDone == true)
                    throw new Exception("Invalid XML: Unterminated tag.", ParseErrorCodes.InvalidElement);
                break;
            }

            // End-tag
            if (this.buffer.startsWith("</")) {

                const rawEndTag = this.buffer.substring(2, tagEnd).trim();
                if (rawEndTag.length == 0)
                    throw new Exception("Invalid XML: Missing end-tag name.", ParseErrorCodes.InvalidElement);

                const expected = this.elementStack.pop();
                if (expected == null)
                    throw new Exception(`Invalid XML: Unexpected end-tag </${rawEndTag}>.`, ParseErrorCodes.InvalidElement);

                if (expected !== rawEndTag)
                    throw new Exception(`Invalid XML: Mismatched end-tag </${rawEndTag}> for <${expected}>.`, ParseErrorCodes.InvalidElement);

                const element = this.splitQualifiedName(rawEndTag);
                await this.fireXmlEvent("onEndElement", element);

                this.buffer = this.buffer.substring(tagEnd + 1);
                continue;

            }

            // Start/self-closing tag
            const rawStartTag = this.buffer.substring(1, tagEnd);
            const startTag = this.parseStartTag(rawStartTag);
            const element = {
                ...this.splitQualifiedName(startTag.name),
                attributes: startTag.attributes,
                isSelfClosing: startTag.isSelfClosing
            };

            await this.fireXmlEvent("onStartElement", element);

            if (element.isSelfClosing == false) {
                this.elementStack.push(element.name);
            }
            else {
                await this.fireXmlEvent("onEndElement", {
                    name: element.name,
                    prefix: element.prefix,
                    localName: element.localName,
                    isSelfClosing: true
                });
            }

            this.buffer = this.buffer.substring(tagEnd + 1);

        }

    }

    /**
     * Reset the XML parser state.
     */
    reset() {

        super.reset();

        this.buffer = "";
        this.isStarted = false;
        this.documentStarted = false;
        this.elementStack = [];
    }

    /**
     * Parse the specified chunk of XML data.
     * @param {Uint8Array} chunk The specified chunk of XML data.
     * @returns {*} The parser status.
     */
    async parse(chunk, isDone = false, totalRead = null, totalLength = null) {

        try {

            if (this.data == null) {
                this.reset();
            }

            if ((chunk != null) && (chunk.length > 0)) {
                this.buffer += this.decoder.decode(chunk, { stream: (isDone == false) });
            }
            else if (isDone == true) {
                // Flush any decoder state.
                this.buffer += this.decoder.decode();
            }

            if (this.isStarted == false) {

                this.context = await this.fireXmlEvent("onStart", this.context);
                await this.fireXmlEvent("onStartDocument");

                this.isStarted = true;
                this.documentStarted = true;

                // Trim a UTF-8 BOM at the start of the parsed XML text.
                if ((this.buffer.length > 0) && (this.buffer.charCodeAt(0) == 0xFEFF)) {
                    this.buffer = this.buffer.substring(1);
                }

            }

            this.bytesRead = totalRead;
            this.bytesTotal = totalLength;
            this.totalBytesConsumed = (totalRead == null) ? this.totalBytesConsumed : totalRead;
            this.bytesProcessed = this.totalBytesConsumed;

            await this.parseBufferedXml(isDone);

            if (this.status == Status.CONTINUE) {
                var progressStatus = await super.fireProgressEvent(this.status);
                if ((progressStatus == Status.JUMP) || (progressStatus == Status.STOP) || (progressStatus == Status.FAIL)) {
                    this.status = progressStatus;
                }
            }

            if ((this.status == Status.STOP) || (this.status == Status.JUMP)) {

                const terminalStatus = this.status;
                this.result = await this.fireXmlEvent("onEnd", this.context);
                this.reset();

                return terminalStatus;

            }

            if (this.status == Status.FAIL) {

                const failedStatus = this.status;
                this.reset();
                return failedStatus;

            }

            if (isDone == true) {

                if (this.elementStack.length > 0) {
                    throw new Exception("Invalid XML: Unexpected end of input.", ParseErrorCodes.InvalidElement);
                }

                if (this.buffer.trim().length > 0) {
                    throw new Exception("Invalid XML: Trailing content after document end.", ParseErrorCodes.InvalidElement);
                }

                if (this.documentStarted == true) {
                    await this.fireXmlEvent("onEndDocument");
                }

                this.result = await this.fireXmlEvent("onEnd", this.context);
                this.reset();

                return Status.SUCCESS;

            }

            return Status.CONTINUE;

        }
        catch (error) {

            this.status = Status.FAIL;
            await super.fireStreamEvent("onError", error);
            this.reset();
            this.error = error;

            return Status.FAIL;

        }

    }

    /**
     * Construct a new streaming XML parser.
     */
    constructor() {

        super();
        this.decoder = new TextDecoder();

    }

};
