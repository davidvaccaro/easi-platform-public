import PartStreamReader from '../../src/readers/PartStreamReader.js';
import { Status } from '../../src/parsers/Status.js';
import { GeneralErrorCodes } from '../../src/environment/Exception.js';

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
