import StreamingJsonDataParser from '../../src/parsers/StreamingJsonDataParser.js';
import StreamingJsonDataHandler from '../../src/handlers/terminals/syntax/StreamingJsonDataHandler.js';
import { Status } from '../../src/parsers/Status.js';

class StopHandler {
    onStart() {
        return {};
    }
    onStartObject() {
        return Status.STOP;
    }
    onEnd(context) {
        return { stopped: true };
    }
}

class JumpHandler {
    onStart() {
        return {};
    }
    onStartObject() {
        return Status.JUMP;
    }
    onEnd(context) {
        return { jumped: true };
    }
}

class FailHandler {
    onStart() {
        return {};
    }
    onStartObject() {
        return Status.FAIL;
    }
}

test('Test: Parses RFC literals true false null', async () => {

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StreamingJsonDataHandler();

    const payload = (new TextEncoder()).encode('{"a":true,"b":false,"c":null,"arr":[1,true,null]}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.SUCCESS);
    expect(parser.result.a).toBe(true);
    expect(parser.result.b).toBe(false);
    expect(parser.result.c).toBeNull();
    expect(Array.isArray(parser.result.arr)).toBe(true);
    expect(parser.result.arr[1]).toBe(true);
    expect(parser.result.arr[2]).toBeNull();

});

test('Test: STOP status is propagated and parse result is finalized', async () => {

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StopHandler();

    const payload = (new TextEncoder()).encode('{"a":1}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.STOP);
    expect(parser.result.stopped).toBe(true);

});

test('Test: JUMP status is propagated and parse result is finalized', async () => {

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new JumpHandler();

    const payload = (new TextEncoder()).encode('{"a":1}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.JUMP);
    expect(parser.result.jumped).toBe(true);

});

test('Test: FAIL status from handler is propagated', async () => {

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new FailHandler();

    const payload = (new TextEncoder()).encode('{"a":1}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.FAIL);

});

test('Test: Parses valid RFC escape sequences in strings', async () => {

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StreamingJsonDataHandler();

    const payload = (new TextEncoder()).encode('{"escaped":"a\\nb","unicode":"\\u0041"}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.SUCCESS);
    expect(parser.result.escaped).toBe('a\\nb');
    expect(parser.result.unicode).toBe('\\u0041');

});

test('Test: Invalid RFC number (leading zero) returns FAIL', async () => {

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StreamingJsonDataHandler();

    const payload = (new TextEncoder()).encode('{"n":01}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.FAIL);

});

test('Test: Invalid JSON returns FAIL', async () => {

    const parser = new StreamingJsonDataParser();
    parser.reset();
    parser.handler = new StreamingJsonDataHandler();

    const payload = (new TextEncoder()).encode('{"a":');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.FAIL);

});

test('Test: Parser auto-resets when parse is called without explicit reset', async () => {

    const parser = new StreamingJsonDataParser();
    parser.handler = new StreamingJsonDataHandler();

    const payload = (new TextEncoder()).encode('{"ok":1}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.SUCCESS);
    expect(parser.result.ok).toBe(1);

});
