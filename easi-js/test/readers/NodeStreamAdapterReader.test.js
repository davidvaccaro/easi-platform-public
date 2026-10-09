import NodeStreamAdapterReader from '../../src/readers/NodeStreamAdapterReader.js';
import { Status } from '../../src/parsers/Status.js';
import { Readable } from 'node:stream';

async function* byteGenerator() {
    yield new Uint8Array([1, 2]);
    yield new Uint8Array([3, 4]);
}

test('Test: NodeStreamAdapterReader reads async iterable stream source', async () => {

    const reader = new NodeStreamAdapterReader();
    const parser = {
        result: { ok: true },
        error: null,
        reset: jest.fn(),
        parse: jest.fn(async (value, done) => done ? Status.SUCCESS : Status.CONTINUE)
    };

    reader.parser = parser;
    const result = await reader.read(byteGenerator(), { contentType: 'application/dicom' });

    expect(result).toEqual({ ok: true });
    expect(parser.reset).toHaveBeenCalledTimes(1);
    expect(parser.parse).toHaveBeenCalled();

});

function createParser(parse) {
    return {
        result: { ok: true },
        error: null,
        reset: jest.fn(),
        parse: jest.fn(parse)
    };
}

function createIterableSource() {

    const iterator = {
        next: jest.fn(async () => ({ done: false, value: new Uint8Array([1]) })),
        return: jest.fn(async () => ({ done: true }))
    };
    const source = {
        [Symbol.asyncIterator]: () => iterator,
        destroy: jest.fn(() => { source.destroyed = true; }),
        destroyed: false
    };

    return { iterator: iterator, source: source };

}

test.each([Status.STOP, Status.SUCCESS, Status.JUMP])('Test: early completion runs an async generator finalizer (%s)', async (status) => {

    const reader = new NodeStreamAdapterReader();
    var finalized = false;
    var readCount = 0;
    async function* source() {
        try {
            readCount++;
            yield new Uint8Array([1]);
            readCount++;
            yield new Uint8Array([2]);
        }
        finally {
            finalized = true;
        }
    }
    reader.parser = createParser(async () => status);

    await expect(reader.read(source())).resolves.toEqual({ ok: true });
    expect(readCount).toBe(1);
    expect(finalized).toBe(true);

});

test('Test: early completion destroys an owned Node readable exactly once', async () => {

    const reader = new NodeStreamAdapterReader();
    const source = Readable.from([new Uint8Array([1]), new Uint8Array([2])]);
    const destroy = jest.spyOn(source, 'destroy');
    reader.parser = createParser(async () => Status.STOP);

    await reader.read(source);

    expect(source.destroyed).toBe(true);
    expect(destroy).toHaveBeenCalledTimes(1);

});

test('Test: custom iterable closes its iterator and destroys remaining source only once', async () => {

    const reader = new NodeStreamAdapterReader();
    const { source, iterator } = createIterableSource();
    reader.parser = createParser(async () => Status.STOP);

    await reader.read(source);

    expect(iterator.next).toHaveBeenCalledTimes(1);
    expect(iterator.return).toHaveBeenCalledTimes(1);
    expect(source.destroy).toHaveBeenCalledTimes(1);

});

test('Test: normal iterable exhaustion does not return or destroy the source', async () => {

    const reader = new NodeStreamAdapterReader();
    const { source, iterator } = createIterableSource();
    iterator.next.mockResolvedValueOnce({ done: false, value: new Uint8Array([1]) });
    iterator.next.mockResolvedValueOnce({ done: true });
    reader.parser = createParser(async (value, done) => done ? Status.SUCCESS : Status.CONTINUE);

    await reader.read(source);

    expect(iterator.next).toHaveBeenCalledTimes(2);
    expect(iterator.return).not.toHaveBeenCalled();
    expect(source.destroy).not.toHaveBeenCalled();

});

test.each(['fail', 'parse', 'emit', 'read', 'abort', 'bytes'])('Test: iterable %s failure closes owned source and preserves the original error', async (failure) => {

    const reader = new NodeStreamAdapterReader();
    const { source, iterator } = createIterableSource();
    const error = new Error('Original ' + failure + ' error');
    reader.parser = createParser(async () => Status.SUCCESS);
    const options = {};

    if (failure === 'fail') {
        reader.parser.error = error;
        reader.parser.parse.mockResolvedValue(Status.FAIL);
    }
    else if (failure === 'parse') {
        reader.parser.parse.mockRejectedValue(error);
    }
    else if (failure === 'emit') {
        options.onEmit = async () => { throw error; };
    }
    else if (failure === 'bytes') {
        iterator.next.mockResolvedValue({ done: false, value: 'invalid bytes' });
    }
    else {
        if (failure === 'abort')
            error.name = 'AbortError';
        iterator.next.mockRejectedValue(error);
    }

    iterator.return.mockRejectedValue(new Error('Iterator cleanup failed'));
    source.destroy.mockImplementation(() => { throw new Error('Destroy failed'); });

    if (failure === 'bytes') {
        await expect(reader.read(source, options)).rejects.toThrow('Expected bytes');
    }
    else {
        await expect(reader.read(source, options)).rejects.toBe(error);
    }
    expect(iterator.return).toHaveBeenCalledTimes(1);
    expect(source.destroy).toHaveBeenCalledTimes(1);

});

test('Test: iterator cleanup error rejects successful early completion after source destruction', async () => {

    const reader = new NodeStreamAdapterReader();
    const { source, iterator } = createIterableSource();
    const error = new Error('Iterator cleanup failed');
    iterator.return.mockRejectedValue(error);
    reader.parser = createParser(async () => Status.STOP);

    await expect(reader.read(source)).rejects.toBe(error);
    expect(source.destroy).toHaveBeenCalledTimes(1);

});

test('Test: Node adapter releases a borrowed reader without cancelling it', async () => {

    const reader = new NodeStreamAdapterReader();
    const source = {
        read: jest.fn(async () => ({ done: false, value: new Uint8Array([1]) })),
        releaseLock: jest.fn(),
        cancel: jest.fn()
    };
    reader.parser = createParser(async () => Status.STOP);

    await reader.read(source);

    expect(source.releaseLock).toHaveBeenCalledTimes(1);
    expect(source.cancel).not.toHaveBeenCalled();

});

test.each(['onEmit', 'resetSession'])('Test: Node adapter %s preflight failure closes its created iterator', async (failure) => {

    const reader = new NodeStreamAdapterReader();
    const { source, iterator } = createIterableSource();
    const options = {};
    reader.parser = createParser(async () => Status.SUCCESS);

    if (failure === 'onEmit') {
        options.onEmit = 42;
    }
    else {
        reader.parser.resetSession = () => { throw new Error('Session reset failed'); };
    }

    await expect(reader.read(source, options)).rejects.toThrow();
    expect(iterator.next).not.toHaveBeenCalled();
    expect(iterator.return).toHaveBeenCalledTimes(1);
    expect(source.destroy).toHaveBeenCalledTimes(1);

});

