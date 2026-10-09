import PartStreamReader from '../../src/readers/PartStreamReader.js';
import { Status } from '../../src/parsers/Status.js';
import { GeneralErrorCodes } from '../../src/environment/Exception.js';
import { ReadableStream } from 'node:stream/web';

function createMultipartBytes(boundary, parts) {

    var payload = '';

    for (var i = 0; i < parts.length; i++) {
        payload += '--' + boundary + '\r\n';
        payload += 'Content-Type: application/dicom\r\n\r\n';
        payload += parts[i] + '\r\n';
    }

    payload += '--' + boundary + '--\r\n';
    return (new TextEncoder()).encode(payload);

}

function createSingleChunkReader(bytes) {

    var emitted = false;

    return {
        read: async function () {

            if (emitted == true) {
                return { done: true, value: null };
            }

            emitted = true;
            return { done: false, value: bytes };

        },
        releaseLock: function () { }
    };

}

test('Test: read rejects URL sources for PartStreamReader', async () => {

    const reader = new PartStreamReader();

    expect(() => reader.read('http://example.test/dicom')).toThrow('Use HttpStreamReader');

    try {
        reader.read('http://example.test/dicom');
    }
    catch (err) {
        expect(err.code).toBe(GeneralErrorCodes.InvalidParameter);
    }

});

test('Test: readData processes byte source with parser', async () => {

    const reader = new PartStreamReader();
    const parser = {
        result: { ok: true },
        error: null,
        resetSession: jest.fn(),
        reset: jest.fn(),
        parse: jest.fn(async () => Status.SUCCESS)
    };

    reader.parser = parser;

    const result = await reader.readData(new Uint8Array([1, 2, 3]));

    expect(parser.reset).toHaveBeenCalledTimes(1);
    expect(parser.parse).toHaveBeenCalledTimes(1);
    expect(parser.resetSession).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });

});

test('Test: readData emits one onEmit callback for single-part byte source', async () => {

    const reader = new PartStreamReader();
    const parser = {
        result: { ok: true },
        error: null,
        reset: jest.fn(),
        parse: jest.fn(async () => Status.SUCCESS)
    };

    const onEmit = jest.fn(async () => Status.CONTINUE);

    reader.parser = parser;

    const result = await reader.readData(new Uint8Array([1, 2, 3]), {
        onEmit: onEmit
    });

    expect(result).toEqual({ ok: true });
    expect(onEmit).toHaveBeenCalledTimes(1);

});

test('Test: readStream uses per-transaction onEmit override', async () => {

    const reader = new PartStreamReader();
    const boundary = 'tx-boundary';
    const bytes = createMultipartBytes(boundary, ['PART-1', 'PART-2']);

    const parser = {
        result: null,
        error: null,
        resetSession: jest.fn(),
        reset: jest.fn(),
        parse: jest.fn(async (value, isFinalChunk) => {
            if (isFinalChunk == true) {
                parser.result = { text: (new TextDecoder()).decode(value) };
                return Status.SUCCESS;
            }
            return Status.CONTINUE;
        })
    };

    const defaultOnEmit = jest.fn(async () => Status.CONTINUE);
    const transactionOnEmit = jest.fn(async () => Status.CONTINUE);

    reader.parser = parser;
    reader.onPart = defaultOnEmit;

    await reader.readStream(createSingleChunkReader(bytes), {
        contentType: 'multipart/related; boundary=' + boundary,
        onEmit: transactionOnEmit
    });

    expect(parser.resetSession).toHaveBeenCalledTimes(1);
    expect(transactionOnEmit).toHaveBeenCalledTimes(2);
    expect(defaultOnEmit).toHaveBeenCalledTimes(0);

});

test('Test: readStream uses default onEmit when no transaction override provided', async () => {

    const reader = new PartStreamReader();
    const boundary = 'default-boundary';
    const bytes = createMultipartBytes(boundary, ['ONE', 'TWO']);

    const parser = {
        result: null,
        error: null,
        reset: jest.fn(),
        parse: jest.fn(async (value, isFinalChunk) => {
            if (isFinalChunk == true) {
                parser.result = { text: (new TextDecoder()).decode(value) };
                return Status.SUCCESS;
            }
            return Status.CONTINUE;
        })
    };

    const defaultOnEmit = jest.fn(async () => Status.CONTINUE);

    reader.parser = parser;
    reader.onPart = defaultOnEmit;

    await reader.readStream(createSingleChunkReader(bytes), {
        contentType: 'multipart/related; boundary=' + boundary
    });

    expect(defaultOnEmit).toHaveBeenCalledTimes(2);

});

test('Test: readStream allows disabling default onEmit per transaction with null override', async () => {

    const reader = new PartStreamReader();
    const boundary = 'disabled-boundary';
    const bytes = createMultipartBytes(boundary, ['ALPHA', 'BETA']);

    const parser = {
        result: null,
        error: null,
        reset: jest.fn(),
        parse: jest.fn(async (value, isFinalChunk) => {
            if (isFinalChunk == true) {
                parser.result = { text: (new TextDecoder()).decode(value) };
                return Status.SUCCESS;
            }
            return Status.CONTINUE;
        })
    };

    const defaultOnEmit = jest.fn(async () => Status.CONTINUE);

    reader.parser = parser;
    reader.onPart = defaultOnEmit;

    await reader.readStream(createSingleChunkReader(bytes), {
        contentType: 'multipart/related; boundary=' + boundary,
        onEmit: null
    });

    expect(defaultOnEmit).toHaveBeenCalledTimes(0);

});

function createLifecycleSource(chunks) {

    var next = 0;
    var streamReader = {
        read: jest.fn(async () => (next < chunks.length)
            ? { done: false, value: chunks[next++] }
            : { done: true, value: null }),
        cancel: jest.fn(async () => { }),
        releaseLock: jest.fn()
    };

    return {
        streamReader: streamReader,
        getReader: jest.fn(() => streamReader),
        cancel: jest.fn(async () => { })
    };

}

function createLifecycleParser(parse) {
    return {
        result: { ok: true },
        error: null,
        reset: jest.fn(),
        parse: jest.fn(parse)
    };
}

test.each([Status.STOP, Status.SUCCESS, Status.JUMP])('Test: early single-part completion cancels acquired reader once (%s)', async (status) => {

    const reader = new PartStreamReader();
    const source = createLifecycleSource([new Uint8Array([1]), new Uint8Array([2])]);
    reader.parser = createLifecycleParser(async () => status);

    await expect(reader.readStream(source)).resolves.toEqual({ ok: true });

    expect(source.streamReader.read).toHaveBeenCalledTimes(1);
    expect(source.streamReader.cancel).toHaveBeenCalledTimes(1);
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);
    expect(source.streamReader.cancel.mock.invocationCallOrder[0]).toBeLessThan(source.streamReader.releaseLock.mock.invocationCallOrder[0]);

});

test('Test: early completion closes a Web Stream and releases its lock', async () => {

    const reader = new PartStreamReader();
    const cancel = jest.fn();
    const stream = new ReadableStream({
        pull: (controller) => controller.enqueue(new Uint8Array([1])),
        cancel: cancel
    }, { highWaterMark: 0 });
    reader.parser = createLifecycleParser(async () => Status.STOP);

    await reader.readStream(stream);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(stream.locked).toBe(false);
    const remainingReader = stream.getReader();
    expect(await remainingReader.read()).toEqual({ done: true, value: undefined });
    remainingReader.releaseLock();

});

test('Test: normal exhaustion releases acquired reader without cancelling', async () => {

    const reader = new PartStreamReader();
    const source = createLifecycleSource([new Uint8Array([1])]);
    reader.parser = createLifecycleParser(async (value, done) => done ? Status.SUCCESS : Status.CONTINUE);

    await reader.readStream(source);

    expect(source.streamReader.read).toHaveBeenCalledTimes(2);
    expect(source.streamReader.cancel).not.toHaveBeenCalled();
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);

});

test('Test: early completion releases a caller-supplied reader without cancelling its unread input', async () => {

    const reader = new PartStreamReader();
    const source = createLifecycleSource([new Uint8Array([1])]);
    reader.parser = createLifecycleParser(async () => Status.STOP);

    await reader.readStream(source.streamReader);

    expect(source.streamReader.cancel).not.toHaveBeenCalled();
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);

});

test.each(['fail', 'parse', 'reset', 'emit', 'read', 'abort'])('Test: single-part %s failure cancels acquired input and preserves the original error', async (failure) => {

    const reader = new PartStreamReader();
    const source = createLifecycleSource([new Uint8Array([1])]);
    const error = new Error('Original ' + failure + ' error');
    const parser = createLifecycleParser(async () => Status.SUCCESS);
    const options = {};

    if (failure === 'fail') {
        parser.error = error;
        parser.parse.mockResolvedValue(Status.FAIL);
    }
    else if (failure === 'parse') {
        parser.parse.mockRejectedValue(error);
    }
    else if (failure === 'reset') {
        parser.reset.mockImplementation(() => { throw error; });
    }
    else if (failure === 'emit') {
        options.onEmit = async () => { throw error; };
    }
    else {
        if (failure === 'abort')
            error.name = 'AbortError';
        source.streamReader.read.mockRejectedValue(error);
    }

    source.streamReader.cancel.mockRejectedValue(new Error('Cancellation failed'));
    source.streamReader.releaseLock.mockImplementation(() => { throw new Error('Release failed'); });
    reader.parser = parser;

    await expect(reader.readStream(source, options)).rejects.toBe(error);
    expect(source.streamReader.cancel).toHaveBeenCalledTimes(1);
    expect(source.streamReader.cancel).toHaveBeenCalledWith(error);
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);

});

test('Test: cancellation failure rejects successful early completion and still releases the lock', async () => {

    const reader = new PartStreamReader();
    const source = createLifecycleSource([new Uint8Array([1])]);
    const error = new Error('Cancellation failed');
    source.streamReader.cancel.mockRejectedValue(error);
    reader.parser = createLifecycleParser(async () => Status.STOP);

    await expect(reader.readStream(source)).rejects.toBe(error);
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);

});

test.each(['parser', 'emitter'])('Test: multipart %s STOP cancels acquired input exactly once', async (stopAt) => {

    const reader = new PartStreamReader();
    const boundary = 'stop-boundary';
    const source = createLifecycleSource([createMultipartBytes(boundary, ['ONE', 'TWO']), new Uint8Array([1])]);
    reader.parser = createLifecycleParser(async () => (stopAt === 'parser') ? Status.STOP : Status.SUCCESS);
    const onEmit = jest.fn(async () => Status.STOP);

    await reader.readStream(source, {
        contentType: 'multipart/related; boundary=' + boundary,
        onEmit: onEmit
    });

    expect(source.streamReader.read).toHaveBeenCalledTimes(1);
    expect(reader.parser.parse).toHaveBeenCalledTimes(1);
    expect(source.streamReader.cancel).toHaveBeenCalledTimes(1);
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);
    expect(onEmit).toHaveBeenCalledTimes((stopAt === 'parser') ? 0 : 1);

});

test.each(['fail', 'parse', 'emit', 'read'])('Test: multipart %s failure cancels acquired input and preserves the original error', async (failure) => {

    const reader = new PartStreamReader();
    const boundary = 'failure-boundary';
    const source = createLifecycleSource([createMultipartBytes(boundary, ['ONE', 'TWO'])]);
    const error = new Error('Original multipart error');
    reader.parser = createLifecycleParser(async () => Status.SUCCESS);
    const options = { contentType: 'multipart/related; boundary=' + boundary };

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
    else {
        source.streamReader.read.mockRejectedValue(error);
    }

    source.streamReader.cancel.mockRejectedValue(new Error('Cancellation failed'));

    await expect(reader.readStream(source, options)).rejects.toBe(error);
    expect(source.streamReader.cancel).toHaveBeenCalledTimes(1);
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);

});

test('Test: multipart EOF releases acquired reader without cancelling', async () => {

    const reader = new PartStreamReader();
    const boundary = 'eof-boundary';
    const source = createLifecycleSource([createMultipartBytes(boundary, ['ONE', 'TWO'])]);
    reader.parser = createLifecycleParser(async () => Status.SUCCESS);

    await reader.readStream(source, { contentType: 'multipart/related; boundary=' + boundary });

    expect(source.streamReader.cancel).not.toHaveBeenCalled();
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);
    expect(reader.parser.parse).toHaveBeenCalledTimes(2);

});

test('Test: invalid multipart boundary releases and cancels acquired input', async () => {

    const reader = new PartStreamReader();
    const source = createLifecycleSource([new Uint8Array([1])]);
    reader.parser = createLifecycleParser(async () => Status.SUCCESS);

    await expect(reader.readStream(source, { contentType: 'multipart/related' })).rejects.toThrow('Missing boundary parameter');
    expect(source.streamReader.read).not.toHaveBeenCalled();
    expect(source.streamReader.cancel).toHaveBeenCalledTimes(1);
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);

});

test.each(['onEmit', 'resetSession', 'contentType'])('Test: stream %s preflight failure cancels without acquiring an input reader', async (failure) => {

    const reader = new PartStreamReader();
    const source = createLifecycleSource([new Uint8Array([1])]);
    const options = {};
    reader.parser = createLifecycleParser(async () => Status.SUCCESS);

    if (failure === 'onEmit') {
        options.onEmit = 42;
    }
    else if (failure === 'resetSession') {
        reader.parser.resetSession = () => { throw new Error('Session reset failed'); };
    }
    else {
        reader.parseContentType = () => { throw new Error('Content type failed'); };
    }

    await expect(reader.readStream(source, options)).rejects.toThrow();
    expect(source.getReader).not.toHaveBeenCalled();
    expect(source.streamReader.read).not.toHaveBeenCalled();
    expect(source.streamReader.cancel).not.toHaveBeenCalled();
    expect(source.streamReader.releaseLock).not.toHaveBeenCalled();
    expect(source.cancel).toHaveBeenCalledTimes(1);

});

test('Test: stream preflight failure preserves its error when source cancellation rejects', async () => {

    const reader = new PartStreamReader();
    const source = createLifecycleSource([new Uint8Array([1])]);
    const error = new Error('Session reset failed');
    reader.parser = createLifecycleParser(async () => Status.SUCCESS);
    reader.parser.resetSession = () => { throw error; };
    source.cancel.mockRejectedValue(new Error('Cancellation failed'));

    await expect(reader.readStream(source)).rejects.toBe(error);
    expect(source.cancel).toHaveBeenCalledTimes(1);
    expect(source.cancel).toHaveBeenCalledWith(error);
    expect(source.getReader).not.toHaveBeenCalled();

});

test('Test: borrowed reader preflight failure leaves ownership with the caller', async () => {

    const reader = new PartStreamReader();
    const source = createLifecycleSource([new Uint8Array([1])]);
    reader.parser = createLifecycleParser(async () => Status.SUCCESS);
    reader.parser.resetSession = () => { throw new Error('Session reset failed'); };

    await expect(reader.readStream(source.streamReader)).rejects.toThrow('Session reset failed');
    expect(source.streamReader.read).not.toHaveBeenCalled();
    expect(source.streamReader.cancel).not.toHaveBeenCalled();
    expect(source.streamReader.releaseLock).not.toHaveBeenCalled();

});

function createSplitBoundarySource(boundary) {
    const bytes = createMultipartBytes(boundary, ['ONE']);
    return createLifecycleSource([bytes.subarray(0, bytes.length - 4), bytes.subarray(bytes.length - 4)]);
}

test('Test: multipart finalizes flushed part data when a boundary suffix arrives in the next chunk', async () => {

    const reader = new PartStreamReader();
    const boundary = 'split-boundary';
    const source = createSplitBoundarySource(boundary);
    var text = '';
    reader.parser = createLifecycleParser(async (value, done) => {
        if (value != null)
            text += (new TextDecoder()).decode(value);
        if (done === true) {
            reader.parser.result = { text: text };
            return Status.SUCCESS;
        }
        return Status.CONTINUE;
    });
    const onEmit = jest.fn(async () => Status.CONTINUE);

    await expect(reader.readStream(source, {
        contentType: 'multipart/related; boundary=' + boundary,
        onEmit: onEmit
    })).resolves.toEqual({ text: 'ONE' });

    expect(reader.parser.parse).toHaveBeenCalledTimes(2);
    expect(reader.parser.parse.mock.calls[0][1]).toBe(false);
    expect(reader.parser.parse.mock.calls[1].slice(0, 2)).toEqual([null, true]);
    expect(onEmit).toHaveBeenCalledTimes(1);
    expect(onEmit).toHaveBeenCalledWith({ text: 'ONE' });
    expect(source.streamReader.cancel).not.toHaveBeenCalled();

});

test.each(['fail', 'throw', 'stop', 'jump'])('Test: split-boundary finalization respects parser %s', async (terminalStatus) => {

    const reader = new PartStreamReader();
    const boundary = 'terminal-boundary';
    const source = createSplitBoundarySource(boundary);
    const error = new Error('Finalization failed');
    reader.parser = createLifecycleParser(async (value, done) => {
        if (done !== true)
            return Status.CONTINUE;
        if (terminalStatus === 'fail') {
            reader.parser.error = error;
            return Status.FAIL;
        }
        if (terminalStatus === 'throw')
            throw error;
        return (terminalStatus === 'stop') ? Status.STOP : Status.JUMP;
    });
    const onEmit = jest.fn();
    const result = reader.readStream(source, {
        contentType: 'multipart/related; boundary=' + boundary,
        onEmit: onEmit
    });

    if ((terminalStatus === 'fail') || (terminalStatus === 'throw')) {
        await expect(result).rejects.toBe(error);
    }
    else {
        await result;
    }

    expect(onEmit).not.toHaveBeenCalled();
    expect(reader.parser.parse).toHaveBeenCalledTimes(2);
    expect(source.streamReader.cancel).toHaveBeenCalledTimes((terminalStatus === 'jump') ? 0 : 1);
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);

});

test.each([false, true])('Test: multipart sends the final input flag exactly once when parser cannot complete (split=%s)', async (split) => {

    const reader = new PartStreamReader();
    const boundary = 'incomplete-boundary';
    const source = split ? createSplitBoundarySource(boundary) : createLifecycleSource([createMultipartBytes(boundary, ['ONE'])]);
    reader.parser = createLifecycleParser(async () => Status.CONTINUE);

    await expect(reader.readStream(source, { contentType: 'multipart/related; boundary=' + boundary })).rejects.toThrow('Failed parsing multiple');

    expect(reader.parser.parse.mock.calls.filter((call) => call[1] === true)).toHaveLength(1);
    expect(source.streamReader.cancel).toHaveBeenCalledTimes(1);
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);

});

test.each(['parser', 'emitter'])('Test: multipart %s STOP ignores malformed later parts already buffered in the same chunk', async (stopAt) => {

    const reader = new PartStreamReader();
    const boundary = 'buffered-stop';
    const completeBytes = createMultipartBytes(boundary, ['ONE', 'TWO']);
    const malformedPayload = (new TextDecoder()).decode(completeBytes).slice(0, -4) + '??\r\n';
    const source = createLifecycleSource([(new TextEncoder()).encode(malformedPayload), new Uint8Array([1])]);
    reader.parser = createLifecycleParser(async () => (stopAt === 'parser') ? Status.STOP : Status.SUCCESS);
    const onEmit = jest.fn(async () => Status.STOP);

    await expect(reader.readStream(source, {
        contentType: 'multipart/related; boundary=' + boundary,
        onEmit: onEmit
    })).resolves.toEqual({ ok: true });

    expect(reader.parser.parse).toHaveBeenCalledTimes(1);
    expect(onEmit).toHaveBeenCalledTimes((stopAt === 'parser') ? 0 : 1);
    expect(source.streamReader.read).toHaveBeenCalledTimes(1);
    expect(source.streamReader.cancel).toHaveBeenCalledTimes(1);
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);

});

test('Test: multipart propagates malformed buffered parts when parsing has not stopped', async () => {

    const reader = new PartStreamReader();
    const boundary = 'buffered-failure';
    const completeBytes = createMultipartBytes(boundary, ['ONE', 'TWO']);
    const malformedPayload = (new TextDecoder()).decode(completeBytes).slice(0, -4) + '??\r\n';
    const source = createLifecycleSource([(new TextEncoder()).encode(malformedPayload)]);
    reader.parser = createLifecycleParser(async () => Status.SUCCESS);
    const onEmit = jest.fn(async () => Status.CONTINUE);

    await expect(reader.readStream(source, {
        contentType: 'multipart/related; boundary=' + boundary,
        onEmit: onEmit
    })).rejects.toThrow('Boundary suffix is malformed');

    expect(source.streamReader.cancel).toHaveBeenCalledTimes(1);
    expect(source.streamReader.releaseLock).toHaveBeenCalledTimes(1);

});
