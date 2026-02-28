import Pipeline from '../../src/pipelines/Pipeline.js';

test('Test: Pipeline.process delegates to configured reader', async () => {

    const reader = {
        parser: { handler: {} },
        read: async (source, options) => ({ source, options, ok: true })
    };

    const pipeline = new Pipeline(reader);
    const result = await pipeline.process('source-value', { key: 'value' });

    expect(result.ok).toBe(true);
    expect(result.source).toBe('source-value');
    expect(result.options.key).toBe('value');

});

test('Test: Pipeline.read aliases Pipeline.process', async () => {

    const reader = {
        parser: { handler: {} },
        read: async () => ('result')
    };

    const pipeline = new Pipeline(reader);
    const result = await pipeline.read('ignored');

    expect(result).toBe('result');

});

test('Test: Pipeline exposes reader/parser/handler accessors', () => {

    const handler = {};
    const parser = { handler };
    const reader = { parser, read: async () => null };

    const pipeline = new Pipeline(reader);

    expect(pipeline.reader).toBe(reader);
    expect(pipeline.parser).toBe(parser);
    expect(pipeline.handler).toBe(handler);

});
