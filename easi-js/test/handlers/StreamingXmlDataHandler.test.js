import StreamingXmlDataParser from '../../src/parsers/StreamingXmlDataParser.js';
import StreamingXmlDataHandler from '../../src/handlers/StreamingXmlDataHandler.js';
import { Status } from '../../src/parsers/Status.js';

test('Test: XML data handler materializes XML document tree', async () => {

    const parser = new StreamingXmlDataParser();
    parser.reset();
    parser.handler = new StreamingXmlDataHandler();

    const xml = '<root a="1"><child>Hi &amp; Bye</child><empty flag="x"/></root>';
    const bytes = (new TextEncoder()).encode(xml);

    const status = await parser.parse(bytes, true, bytes.length, bytes.length);

    expect(status).toBe(Status.SUCCESS);

    expect(parser.result).toEqual({
        type: 'document',
        children: [
            {
                type: 'element',
                name: 'root',
                prefix: null,
                localName: 'root',
                attributes: { a: '1' },
                children: [
                    {
                        type: 'element',
                        name: 'child',
                        prefix: null,
                        localName: 'child',
                        attributes: {},
                        children: [
                            { type: 'text', text: 'Hi & Bye' }
                        ]
                    },
                    {
                        type: 'element',
                        name: 'empty',
                        prefix: null,
                        localName: 'empty',
                        attributes: { flag: 'x' },
                        children: []
                    }
                ]
            }
        ]
    });

});

test('Test: XML data handler supports chunked XML parsing', async () => {

    const parser = new StreamingXmlDataParser();
    parser.reset();
    parser.handler = new StreamingXmlDataHandler();

    const xml = '<root><child attr="abc">value</child></root>';
    const bytes = (new TextEncoder()).encode(xml);
    const splitIndex = xml.indexOf('abc') + 1;

    const status1 = await parser.parse(bytes.slice(0, splitIndex), false, splitIndex, bytes.length);
    expect(status1).toBe(Status.CONTINUE);

    const status2 = await parser.parse(bytes.slice(splitIndex), true, bytes.length, bytes.length);
    expect(status2).toBe(Status.SUCCESS);

    const root = parser.result.children[0];
    const child = root.children[0];

    expect(root.name).toBe('root');
    expect(child.name).toBe('child');
    expect(child.attributes.attr).toBe('abc');
    expect(child.children[0]).toEqual({ type: 'text', text: 'value' });

});
