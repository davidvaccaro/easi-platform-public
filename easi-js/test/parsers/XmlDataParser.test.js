import XmlDataParser from '../../src/parsers/XmlDataParser.js';
import { Status } from '../../src/parsers/Status.js';

class TraceXmlHandler {

    onStart() {
        return { events: [] };
    }

    onStartDocument(context) {
        context.events.push('onStartDocument');
    }

    onStartElement(context, element) {
        const attributeKeys = Object.keys(element.attributes || {});
        context.events.push(`onStartElement:${element.name}:${attributeKeys.length}`);
        if (attributeKeys.length > 0) {
            context.events.push(`attrs:${attributeKeys.map((k) => `${k}=${element.attributes[k]}`).join(",")}`);
        }
    }

    onText(context, text) {
        context.events.push(`onText:${text.text}`);
    }

    onEndElement(context, element) {
        context.events.push(`onEndElement:${element.name}`);
    }

    onEndDocument(context) {
        context.events.push('onEndDocument');
    }

    onEnd(context) {
        return context.events;
    }

}

test('Test: Parses basic XML elements, attributes and text', async () => {

    const parser = new XmlDataParser();
    parser.reset();
    parser.handler = new TraceXmlHandler();

    const payload = (new TextEncoder()).encode('<root a="1"><child>Hi &amp; Bye</child><empty flag="x"/></root>');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.SUCCESS);
    expect(parser.result).toEqual([
        'onStartDocument',
        'onStartElement:root:1',
        'attrs:a=1',
        'onStartElement:child:0',
        'onText:Hi & Bye',
        'onEndElement:child',
        'onStartElement:empty:1',
        'attrs:flag=x',
        'onEndElement:empty',
        'onEndElement:root',
        'onEndDocument'
    ]);

});

test('Test: Parses XML across chunk boundaries', async () => {

    const parser = new XmlDataParser();
    parser.reset();
    parser.handler = new TraceXmlHandler();

    const xml = '<root><child attr="abc">value</child></root>';
    const split = xml.indexOf('abc');
    const bytes = (new TextEncoder()).encode(xml);
    const chunk1 = bytes.slice(0, split + 1);
    const chunk2 = bytes.slice(split + 1);

    const status1 = await parser.parse(chunk1, false, chunk1.length, bytes.length);
    expect(status1).toBe(Status.CONTINUE);

    const status2 = await parser.parse(chunk2, true, bytes.length, bytes.length);
    expect(status2).toBe(Status.SUCCESS);
    expect(parser.result).toContain('onStartElement:child:1');
    expect(parser.result).toContain('attrs:attr=abc');
    expect(parser.result).toContain('onText:value');

});

test('Test: Invalid XML returns FAIL', async () => {

    const parser = new XmlDataParser();
    parser.reset();
    parser.handler = new TraceXmlHandler();

    const payload = (new TextEncoder()).encode('<root><child></root>');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.FAIL);
    expect(parser.error).toBeTruthy();

});
