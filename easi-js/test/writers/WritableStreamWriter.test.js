import WritableStreamWriter from '../../src/writers/WritableStreamWriter.js';

const stream = require('stream');

test('Test: WritableStreamWriter writes bytes to generic writable object', async () => {

    const chunks = [];
    const sink = {
        write(chunk) {
            chunks.push(new Uint8Array(chunk));
            return true;
        },
        close() {
        }
    };

    const writer = new WritableStreamWriter();
    const result = await writer.write(sink, new Uint8Array([1, 2, 3]));

    expect(result.bytesWritten).toBe(3);
    expect(chunks.length).toBe(1);
    expect(Array.from(chunks[0])).toEqual([1, 2, 3]);

});

test('Test: WritableStreamWriter writes bytes to Node writable stream', async () => {

    const chunks = [];
    const writable = new stream.Writable({
        write(chunk, encoding, callback) {
            chunks.push(new Uint8Array(chunk));
            callback();
        }
    });

    const writer = new WritableStreamWriter();
    const result = await writer.write(writable, new Uint8Array([9, 8, 7]), { end: true });

    expect(result.bytesWritten).toBe(3);
    expect(chunks.length).toBe(1);
    expect(Array.from(chunks[0])).toEqual([9, 8, 7]);

});
