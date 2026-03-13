import PartStreamReader from '../../src/readers/PartStreamReader.js';
import { Status } from '../../src/parsers/Status.js';
import { GeneralErrorCodes } from '../../src/environment/Exception.js';

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

    expect(() => reader.read('http://example.test/dicom')).toThrow('Use FetchStreamReader');

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
        reset: jest.fn(),
        parse: jest.fn(async () => Status.SUCCESS)
    };

    reader.parser = parser;

    const result = await reader.readData(new Uint8Array([1, 2, 3]));

    expect(parser.reset).toHaveBeenCalledTimes(1);
    expect(parser.parse).toHaveBeenCalledTimes(1);
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
