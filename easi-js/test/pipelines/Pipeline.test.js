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

test('Test: Pipeline.process', async () => {

    const reader = {
        parser: { handler: {} },
        read: async () => ('result')
    };

    const pipeline = new Pipeline(reader);
    const result = await pipeline.process('ignored');

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

test('Test: Pipeline.process serializes concurrent calls on one pipeline instance', async () => {

    var active = 0;
    var maxActive = 0;
    var execution = [];

    const reader = {
        parser: { handler: {} },
        read: async (source) => {

            active += 1;
            maxActive = Math.max(maxActive, active);
            execution.push(`start:${source}`);

            await new Promise((resolve) => setTimeout(resolve, 10));

            execution.push(`end:${source}`);
            active -= 1;

            return source;

        }
    };

    const pipeline = new Pipeline(reader);

    const [a, b, c] = await Promise.all([
        pipeline.process('A'),
        pipeline.process('B'),
        pipeline.process('C')
    ]);

    expect(a).toBe('A');
    expect(b).toBe('B');
    expect(c).toBe('C');
    expect(maxActive).toBe(1);
    expect(execution).toEqual([
        'start:A', 'end:A',
        'start:B', 'end:B',
        'start:C', 'end:C'
    ]);

});

test('Test: Pipeline.process queue continues after one call fails', async () => {

    var order = [];

    const reader = {
        parser: { handler: {} },
        read: async (source) => {

            order.push(`start:${source}`);
            await new Promise((resolve) => setTimeout(resolve, 5));

            if (source === 'bad') {
                order.push(`fail:${source}`);
                throw new Error('boom');
            }

            order.push(`end:${source}`);
            return source;

        }
    };

    const pipeline = new Pipeline(reader);

    const first = pipeline.process('bad');
    const second = pipeline.process('good');

    await expect(first).rejects.toThrow('boom');
    await expect(second).resolves.toBe('good');

    expect(order).toEqual([
        'start:bad',
        'fail:bad',
        'start:good',
        'end:good'
    ]);

});
