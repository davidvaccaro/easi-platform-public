import WebSocketStreamReader from '../../src/readers/WebSocketStreamReader.js';
import { Status } from '../../src/parsers/Status.js';

class MockSocket {

    constructor() {
        this.handlers = {};
        this.readyState = 1;
    }

    on(name, handler) {
        if (this.handlers[name] == null) {
            this.handlers[name] = [];
        }
        this.handlers[name].push(handler);
    }

    off(name, handler) {
        if (this.handlers[name] == null) {
            return;
        }
        this.handlers[name] = this.handlers[name].filter((h) => h !== handler);
    }

    emit(name, ...args) {
        if (this.handlers[name] == null) {
            return;
        }
        for (const handler of this.handlers[name]) {
            handler(...args);
        }
    }

    send() { }

}

test('Test: WebSocketStreamReader reads websocket message frames', async () => {

    const socket = new MockSocket();
    const reader = new WebSocketStreamReader();
    const parser = {
        result: { ok: true },
        error: null,
        reset: jest.fn(),
        parse: jest.fn(async (value, done) => done ? Status.SUCCESS : Status.CONTINUE)
    };

    reader.parser = parser;

    const pending = reader.read(socket, {
        contentType: 'application/dicom',
        maxMessages: 1
    });

    socket.emit('message', new Uint8Array([1, 2, 3]));
    const result = await pending;

    expect(result).toEqual({ ok: true });
    expect(parser.parse).toHaveBeenCalled();

});

