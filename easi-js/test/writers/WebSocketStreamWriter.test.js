import WebSocketStreamWriter from '../../src/writers/WebSocketStreamWriter.js';

class MockSocket {

    constructor() {
        this.readyState = 1;
        this.sent = [];
    }

    send(chunk) {
        this.sent.push(chunk);
    }

}

test('Test: WebSocketStreamWriter writes bytes to open socket', async () => {

    const socket = new MockSocket();
    const writer = new WebSocketStreamWriter();

    const result = await writer.write(socket, new Uint8Array([1, 4, 9]));

    expect(result.bytesWritten).toBe(3);
    expect(socket.sent.length).toBe(1);
    expect(Array.from(socket.sent[0])).toEqual([1, 4, 9]);

});

