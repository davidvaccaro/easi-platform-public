import ByteStreamReader from '../../src/readers/ByteStreamReader.js';
import { Status } from '../../src/parsers/Status.js';

test('Test: ByteStreamReader reads byte source via parser', async () => {

    const reader = new ByteStreamReader();
    const parser = {
        result: { ok: true },
        error: null,
        reset: jest.fn(),
        parse: jest.fn(async () => Status.SUCCESS)
    };

    reader.parser = parser;

    const result = await reader.read(new Uint8Array([1, 2, 3]));

    expect(result).toEqual({ ok: true });
    expect(parser.reset).toHaveBeenCalledTimes(1);
    expect(parser.parse).toHaveBeenCalledTimes(1);

});

