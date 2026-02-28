import NodeStreamAdapterReader from '../../src/readers/NodeStreamAdapterReader.js';
import { Status } from '../../src/parsers/Status.js';

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

