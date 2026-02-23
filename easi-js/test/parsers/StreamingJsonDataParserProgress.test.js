import StreamingJsonDataParser from '../../src/parsers/StreamingJsonDataParser.js';
import StreamingJsonDataHandler from '../../src/handlers/terminals/syntax/StreamingJsonDataHandler.js';
import { Status } from '../../src/parsers/Status.js';

class CountingProgressJsonHandler extends StreamingJsonDataHandler {

    constructor() {
        super();
        this.progressCount = 0;
    }

    onProgress(context, progress) {
        this.progressCount++;
    }

}

test('Test: JSON parser pulses progress once per parse invocation for single-chunk input', async () => {

    const json = JSON.stringify({
        a: 1,
        b: "x",
        c: [1, 2, 3],
        d: { nested: true, text: "abc" }
    });

    const parser = new StreamingJsonDataParser();
    const handler = new CountingProgressJsonHandler();
    const bytes = (new TextEncoder()).encode(json);

    parser.reset();
    parser.handler = handler;

    const status = await parser.parse(bytes, true, bytes.length, bytes.length);

    expect(status).toBe(Status.SUCCESS);
    expect(handler.progressCount).toBe(1);

});

test('Test: JSON parser pulses progress once per parse invocation for multi-chunk input', async () => {

    const json = JSON.stringify({
        "00080018": { vr: "UI", Value: ["1.2.3.4.5"] },
        "00100010": { vr: "PN", Value: [{ Alphabetic: "DOE^JOHN" }] },
        "00400310": { vr: "ST", Value: ["TotalDLP=1\r\nEvent=1"] }
    });

    const splitAt = json.indexOf('DOE^JOHN');
    const bytes = (new TextEncoder()).encode(json);
    const chunk1 = bytes.slice(0, splitAt);
    const chunk2 = bytes.slice(splitAt);

    const parser = new StreamingJsonDataParser();
    const handler = new CountingProgressJsonHandler();

    parser.reset();
    parser.handler = handler;

    const status1 = await parser.parse(chunk1, false, chunk1.length, bytes.length);
    const status2 = await parser.parse(chunk2, true, bytes.length, bytes.length);

    expect(status1).toBe(Status.CONTINUE);
    expect(status2).toBe(Status.SUCCESS);
    expect(handler.progressCount).toBe(2);

});
