import Pipeline from '../../src/pipelines/Pipeline.js';
import Exception from '../../src/environment/Exception.js';
import PipelineResultCollection from '../../src/pipelines/PipelineResultCollection.js';

test('Test: Pipeline.process delegates to configured reader', async () => {

  const reader = {
    parser: { handler: {} },
    read: async (source, options) => ({ source, options, ok: true })
  };

  const pipeline = new Pipeline(reader);
  const result = await pipeline.process('source-value', null, { sourceOptions: { key: 'value' } });

  expect(PipelineResultCollection.isCollection(result)).toBe(true);
  expect(result.count).toBe(1);
  expect(result.ok).toBe(true);
  expect(result.source).toBe('source-value');
  expect(result.options.key).toBe('value');

});

test('Test: Pipeline.process supports envelope arguments', async () => {

  const reader = {
    parser: { handler: {} },
    read: async (source, options) => ({ source, options, ok: true })
  };

  const pipeline = new Pipeline(reader);
  const result = await pipeline.process({
    source: 'source-value',
    sourceOptions: { key: 'value' }
  });

  expect(result.ok).toBe(true);
  expect(result.source).toBe('source-value');
  expect(result.options.key).toBe('value');

});

test('Test: Pipeline.process uses build-time default source when process() is called without arguments', async () => {

  const reader = {
    parser: { handler: {} },
    read: async (source, options) => ({ source, options, ok: true })
  };

  const pipeline = new Pipeline(reader, null, {
    source: 'default-source',
    sourceOptions: { contentType: 'application/dicom' }
  });

  const result = await pipeline.process();

  expect(result.ok).toBe(true);
  expect(result.source).toBe('default-source');
  expect(result.options.contentType).toBe('application/dicom');

});

test('Test: Pipeline.process supports positional source/destination plus structured options', async () => {

  const reader = {
    parser: { handler: {} },
    read: async (source, options) => ({ source, options, payload: true })
  };

  const onResult = jest.fn(async (result, context) => ({
    result,
    context
  }));

  const pipeline = new Pipeline(reader, onResult, {
    destination: 'default-destination',
    destinationOptions: { a: 1 },
    hasWriter: true,
    writerRequiresDestination: true
  });

  const output = await pipeline.process(
  'runtime-source',
  'runtime-destination',
  {
    sourceOptions: { contentType: 'application/dicom' },
    destinationOptions: { b: 2 }
  });


  expect(output.count).toBe(1);
  expect(output.first().result.source).toBe('runtime-source');
  expect(output.first().result.options.contentType).toBe('application/dicom');
  expect(output.first().context.destination).toBe('runtime-destination');
  expect(output.first().context.destinationOptions).toEqual({ a: 1, b: 2 });
  expect(onResult).toHaveBeenCalledTimes(1);

});

test('Test: Pipeline.process throws when source is missing and no default source is bound', async () => {

  const reader = {
    parser: { handler: {} },
    read: async () => null
  };

  const pipeline = new Pipeline(reader);

  await expect(pipeline.process()).rejects.toThrow(Exception);
  await expect(pipeline.process()).rejects.toThrow('requires a source');

});

test('Test: Pipeline.process rejects unsupported signature variants', async () => {

  const reader = {
    parser: { handler: {} },
    read: async () => null
  };

  const pipeline = new Pipeline(reader);

  await expect(pipeline.process('source-only')).rejects.toThrow(Exception);
  await expect(pipeline.process('source-only', { contentType: 'application/dicom' })).rejects.toThrow(Exception);
  await expect(pipeline.process('source-only', null, { contentType: 'application/dicom' })).rejects.toThrow(Exception);

});

test('Test: Pipeline.process', async () => {

  const reader = {
    parser: { handler: {} },
    read: async () => 'result'
  };

  const pipeline = new Pipeline(reader);
  const result = await pipeline.process({ source: 'ignored' });

  expect(result.first()).toBe('result');

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
  pipeline.process({ source: 'A' }),
  pipeline.process({ source: 'B' }),
  pipeline.process({ source: 'C' })]);


  expect(a.first()).toBe('A');
  expect(b.first()).toBe('B');
  expect(c.first()).toBe('C');
  expect(maxActive).toBe(1);
  expect(execution).toEqual([
  'start:A', 'end:A',
  'start:B', 'end:B',
  'start:C', 'end:C']);


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

  const first = pipeline.process({ source: 'bad' });
  const second = pipeline.process({ source: 'good' });

  await expect(first).rejects.toThrow('boom');
  const secondResult = await second;
  expect(secondResult.first()).toBe('good');

  expect(order).toEqual([
  'start:bad',
  'fail:bad',
  'start:good',
  'end:good']);


});

test('Test: Pipeline.start rejects non-source-bound readers', () => {

  const reader = {
    parser: { handler: {} },
    read: async () => null
  };

  const pipeline = new Pipeline(reader);

  expect(() => pipeline.start()).toThrow(Exception);
  expect(() => pipeline.start()).toThrow('source-bound readers');

});

test('Test: Pipeline.start rejects unsupported signature variants', () => {

  const reader = {
    isSourceBound: true,
    parser: { handler: {} },
    read: async () => null,
    stop: async () => {
    }
  };

  const pipeline = new Pipeline(reader);

  expect(() => pipeline.start(null, { maxIterations: 1 })).toThrow(Exception);
  expect(() => pipeline.start(null, { maxIterations: 1 })).toThrow('Invalid start signature');
  expect(() => pipeline.start('source-only')).toThrow(Exception);
  expect(() => pipeline.start('source-only')).toThrow('Invalid start signature');

});

test('Test: Pipeline.start supports positional source/destination and structured options', async () => {

  const reader = {
    isSourceBound: true,
    parser: { handler: {} },
    read: jest.fn(async (source, options) => ({ source, options })),
    stop: jest.fn(async () => {
    })
  };

  const observedContexts = [];
  const pipeline = new Pipeline(reader, null, {
    source: 'default-source',
    sourceOptions: { defaultRead: true },
    destination: 'default-destination',
    destinationOptions: { defaultWrite: true },
    hasWriter: true,
    writerRequiresDestination: true
  });

  const run = pipeline.start(
    'runtime-source',
    'runtime-destination',
    {
      sourceOptions: { runtimeRead: true },
      destinationOptions: { runtimeWrite: true },
      options: { shared: true },
      maxIterations: 1,
      onResult: async (_result, context) => {
        observedContexts.push(context);
        return false;
      }
    }
  );

  await run.done;

  expect(run.iterations).toBe(1);
  expect(reader.read).toHaveBeenCalledWith(
    'runtime-source',
    { defaultRead: true, shared: true, runtimeRead: true }
  );

  expect(observedContexts.length).toBe(1);
  expect(observedContexts[0].destination).toBe('runtime-destination');
  expect(observedContexts[0].destinationOptions).toEqual({ defaultWrite: true, runtimeWrite: true });
  expect(observedContexts[0].options).toEqual({ shared: true });
  expect(observedContexts[0].readOptions).toEqual({ defaultRead: true, shared: true, runtimeRead: true });

});

test('Test: Pipeline.start loops source-bound reads until onResult returns false', async () => {

  var readCount = 0;
  var stopCount = 0;

  const reader = {
    isSourceBound: true,
    parser: { handler: {} },
    read: async () => {
      readCount += 1;
      return readCount;
    },
    stop: async () => {
      stopCount += 1;
    }
  };

  const pipeline = new Pipeline(reader);
  const run = pipeline.start({
    onResult: async (result) => result.first() < 3
  });

  await run.done;

  expect(run.iterations).toBe(3);
  expect(readCount).toBe(3);
  expect(stopCount).toBe(1);
  expect(run.running).toBe(false);

});

test('Test: Pipeline.start continues after read error when onError returns true', async () => {

  var attempts = 0;
  var errors = 0;

  const reader = {
    isSourceBound: true,
    parser: { handler: {} },
    read: async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('temporary');
      }
      return 'ok';
    },
    stop: async () => {
    }
  };

  const pipeline = new Pipeline(reader);
  const run = pipeline.start({
    onError: async () => {
      errors += 1;
      return true;
    },
    onResult: async () => false
  });

  await run.done;

  expect(errors).toBe(1);
  expect(run.iterations).toBe(1);
  expect(attempts).toBe(2);

});

test('Test: Pipeline.start stop() stops active run and resolves done', async () => {

  var readCount = 0;
  var stopCount = 0;

  const reader = {
    isSourceBound: true,
    parser: { handler: {} },
    read: async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      readCount += 1;
      return readCount;
    },
    stop: async () => {
      stopCount += 1;
    }
  };

  const pipeline = new Pipeline(reader);
  const run = pipeline.start({
    onResult: async () => true
  });

  await new Promise((resolve) => setTimeout(resolve, 20));
  await run.stop();
  await run.done;

  expect(run.running).toBe(false);
  expect(readCount).toBeGreaterThan(0);
  expect(stopCount).toBeGreaterThan(0);

});
