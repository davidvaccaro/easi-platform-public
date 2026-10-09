import JsonDataParser from '../../src/parsers/JsonDataParser.js';
import JsonDataHandler from '../../src/handlers/terminals/syntax/JsonDataHandler.js';
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

    const parser = new JsonDataParser();
    parser.reset();
    parser.handler = new JsonDataHandler();

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

    const parser = new JsonDataParser();
    parser.reset();
    parser.handler = new StopHandler();

    const payload = (new TextEncoder()).encode('{"a":1}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.STOP);
    expect(parser.result.stopped).toBe(true);

});

test('Test: JUMP status is propagated and parse result is finalized', async () => {

    const parser = new JsonDataParser();
    parser.reset();
    parser.handler = new JumpHandler();

    const payload = (new TextEncoder()).encode('{"a":1}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.JUMP);
    expect(parser.result.jumped).toBe(true);

});

test('Test: FAIL status from handler is propagated', async () => {

    const parser = new JsonDataParser();
    parser.reset();
    parser.handler = new FailHandler();

    const payload = (new TextEncoder()).encode('{"a":1}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.FAIL);

});

test('Test: Parses valid RFC escape sequences in strings', async () => {

    const parser = new JsonDataParser();
    parser.reset();
    parser.handler = new JsonDataHandler();

    const payload = (new TextEncoder()).encode('{"escaped":"a\\nb","unicode":"\\u0041"}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.SUCCESS);
    expect(parser.result.escaped).toBe('a\\nb');
    expect(parser.result.unicode).toBe('\\u0041');

});

test('Test: Invalid RFC number (leading zero) returns FAIL', async () => {

    const parser = new JsonDataParser();
    parser.reset();
    parser.handler = new JsonDataHandler();

    const payload = (new TextEncoder()).encode('{"n":01}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.FAIL);

});

test('Test: Invalid JSON returns FAIL', async () => {

    const parser = new JsonDataParser();
    parser.reset();
    parser.handler = new JsonDataHandler();

    const payload = (new TextEncoder()).encode('{"a":');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.FAIL);

});

test('Test: Parser auto-resets when parse is called without explicit reset', async () => {

    const parser = new JsonDataParser();
    parser.handler = new JsonDataHandler();

    const payload = (new TextEncoder()).encode('{"ok":1}');
    const status = await parser.parse(payload, true, payload.length, payload.length);

    expect(status).toBe(Status.SUCCESS);
    expect(parser.result.ok).toBe(1);

});

test('Test: Unicode keys and string values survive every two-chunk byte split', async () => {

    const bytes = new TextEncoder().encode('{"\uFEFF患者":"\uFEFFFrançois 山田 🚀","escaped":"é\\u0041\\n𝄞","n":1.25,"next":"Ω"}');
    const expected = { '\uFEFF患者': '\uFEFFFrançois 山田 🚀', escaped: 'é\\u0041\\n𝄞', n: 1.25, next: 'Ω' };

    for (let splitAt = 1; splitAt < bytes.length; splitAt++) {
        const parser = new JsonDataParser();
        parser.handler = new JsonDataHandler();

        expect(await parser.parse(bytes.slice(0, splitAt), false, splitAt, bytes.length)).toBe(Status.CONTINUE);
        expect(await parser.parse(bytes.slice(splitAt), true, bytes.length, bytes.length)).toBe(Status.SUCCESS);
        expect(parser.result).toEqual(expected);
    }

});

test('Test: One-byte Unicode fragments retain one start/end lifecycle per string', async () => {

    class StringLifecycleHandler extends JsonDataHandler {
        onStartString(context, value) {
            this.starts = (this.starts ?? 0) + 1;
            super.onStartString(context, value);
        }
        onEndString() {
            this.ends = (this.ends ?? 0) + 1;
        }
    }

    const bytes = new TextEncoder().encode('{"a":"é山🚀","n":7,"b":"Ω"}');
    const handler = new StringLifecycleHandler();
    const parser = new JsonDataParser();
    parser.handler = handler;

    for (let i = 0; i < bytes.length; i++) {
        const final = i === bytes.length - 1;
        expect(await parser.parse(bytes.slice(i, i + 1), final, i + 1, bytes.length))
            .toBe(final ? Status.SUCCESS : Status.CONTINUE);
    }

    expect(parser.result).toEqual({ a: 'é山🚀', n: 7, b: 'Ω' });
    expect(handler.starts).toBe(2);
    expect(handler.ends).toBe(2);

});

test('Test: STOP clears a pending UTF-8 code point before the next parse', async () => {

    class StopStringHandler extends JsonDataHandler {
        onStartString(context, value) {
            super.onStartString(context, value);
            return Status.STOP;
        }
    }

    const parser = new JsonDataParser();
    parser.handler = new StopStringHandler();
    const prefix = new TextEncoder().encode('{"a":"');
    const unfinished = new Uint8Array([...prefix, 0xF0]);
    expect(await parser.parse(unfinished, false)).toBe(Status.STOP);

    parser.handler = new JsonDataHandler();
    parser.context = null;
    const next = new TextEncoder().encode('{"b":"é"}');
    expect(await parser.parse(next, true)).toBe(Status.SUCCESS);
    expect(parser.result).toEqual({ b: 'é' });

});

test.each([false, true])('Test: Invalid UTF-8 rejects rather than replacing a broken string (fragmented=%s)', async (fragmented) => {

    const parser = new JsonDataParser();
    parser.handler = new JsonDataHandler();
    const prefix = new TextEncoder().encode('{"a":"');
    const suffix = new TextEncoder().encode('"}');
    const bytes = new Uint8Array([...prefix, 0xC3, ...suffix]);

    if (fragmented) {
        expect(await parser.parse(bytes.slice(0, prefix.length + 1), false)).toBe(Status.CONTINUE);
        expect(await parser.parse(bytes.slice(prefix.length + 1), true)).toBe(Status.FAIL);
    }
    else {
        expect(await parser.parse(bytes, true)).toBe(Status.FAIL);
    }
    expect(parser.error).toBeDefined();

    // The generic handler context is caller-owned; start a fresh document on the reused parser.
    parser.context = null;
    const valid = new TextEncoder().encode('{"a":"ok"}');
    expect(await parser.parse(valid, true)).toBe(Status.SUCCESS);
    expect(parser.result).toEqual({ a: 'ok' });

});
