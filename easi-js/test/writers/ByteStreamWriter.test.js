import ByteStreamWriter from '../../src/writers/ByteStreamWriter.js';

test('Test: ByteStreamWriter writes bytes to memory output', async () => {

    const writer = new ByteStreamWriter();
    const result = await writer.write(new Uint8Array([1, 2, 3]));

    expect(result.bytesWritten).toBe(3);
    expect(result.body instanceof Uint8Array).toBe(true);
    expect(Array.from(result.body)).toEqual([1, 2, 3]);

});

