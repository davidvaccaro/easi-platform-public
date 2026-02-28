import NodeStreamAdapterWriter from '../../src/writers/NodeStreamAdapterWriter.js';

const stream = require('stream');

test('Test: NodeStreamAdapterWriter writes bytes to Node writable stream', async () => {

    const chunks = [];
    const writable = new stream.Writable({
        write(chunk, encoding, callback) {
            chunks.push(new Uint8Array(chunk));
            callback();
        }
    });

    const writer = new NodeStreamAdapterWriter();
    const result = await writer.write(writable, new Uint8Array([9, 8, 7]), { end: true });

    expect(result.bytesWritten).toBe(3);
    expect(chunks.length).toBeGreaterThan(0);

    const combined = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    var offset = 0;
    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
    }

    expect(Array.from(combined)).toEqual([9, 8, 7]);

});

