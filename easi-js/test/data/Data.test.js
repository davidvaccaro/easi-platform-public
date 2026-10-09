import Data from '../../src/data/Data.js';

test('Test: Data indexOf finds DICOM end-sequence marker from array sequence', () => {

    var data = new Data();
    var marker = [254, 255, 221, 224, 0, 0, 0, 0];
    var prefix = new Uint8Array([10, 20, 30, 40, 50]);
    var suffix = new Uint8Array([60, 70, 80]);
    var payload = new Uint8Array(prefix.length + marker.length + suffix.length);

    payload.set(prefix, 0);
    payload.set(marker, prefix.length);
    payload.set(suffix, (prefix.length + marker.length));
    data.append(payload);

    expect(data.indexOf(0, marker)).toBe(prefix.length);

});

test('Test: Data indexOf respects begin offset and returns first match after begin', () => {

    var data = new Data();
    var marker = new Uint8Array([254, 255, 221, 224, 0, 0, 0, 0]);
    var payload = new Uint8Array(96);

    payload.fill(0);
    payload.set(marker, 12);
    payload.set(marker, 64);
    data.append(payload);

    expect(data.indexOf(0, marker)).toBe(12);
    expect(data.indexOf(13, marker)).toBe(64);

});

test('Test: Data indexOf finds sequence when adaptive anchor is not the first byte', () => {

    var data = new Data();
    var sequence = new Uint8Array([0, 65, 66, 67, 68, 69]);
    var payload = new Uint8Array(256);

    payload.fill(0);
    payload.set(sequence, 123);
    data.append(payload);

    expect(data.indexOf(0, sequence)).toBe(123);

});

test('Test: Data indexOf returns -1 when sequence is not found', () => {

    var data = new Data();
    var sequence = new Uint8Array([1, 2, 3, 4]);
    data.append(new Uint8Array([1, 2, 9, 9, 9, 4]));

    expect(data.indexOf(0, sequence)).toBe(-1);

});


test('Test: Data compaction preserves consumed views and caller-owned input bytes', () => {

    var original = Uint8Array.from({ length: 32 }, (_, index) => index);
    var source = Uint8Array.from(original);
    var data = new Data();
    data.append(source);

    // Initial adoption and consumption remain zero-copy.
    expect(data.access().buffer).toBe(source.buffer);
    var consumed = data.consume(23);
    expect(consumed.buffer).toBe(source.buffer);
    var tail = data.peek(0, 9);

    // The old buffer has no free write tail. Appending must compact safely.
    data.append(new Uint8Array([201]));

    expect(source).toEqual(original);
    expect(consumed).toEqual(original.subarray(0, 23));
    expect(tail).toEqual(original.subarray(23));
    expect(data.access()).toEqual(new Uint8Array([23, 24, 25, 26, 27, 28, 29, 30, 31, 201]));
    expect(data.access().buffer).not.toBe(source.buffer);

});

test('Test: Data compaction capacity depends on remaining bytes, not the large consumed input', () => {

    var source = new Uint8Array(1024 * 1024);
    source.set([1, 2, 3], source.length - 3);
    var data = new Data();
    data.append(source);
    var consumed = data.consume(source.length - 3);

    data.append(new Uint8Array([4]));

    expect(data.access()).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(data.access().buffer.byteLength).toBeLessThanOrEqual(32);
    expect(consumed.every(value => value == 0)).toBe(true);
    expect(source.subarray(0, 4)).toEqual(new Uint8Array(4));
    expect(source.subarray(source.length - 3)).toEqual(new Uint8Array([1, 2, 3]));

});
