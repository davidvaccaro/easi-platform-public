import EncodedData from '../../src/dicom/EncodedData.js';
import TransferSyntax from '../../src/dicom/TransferSyntax.js';

test("Test: Data Length", () => {
    expect((new EncodedData([0, 0, 0, 0], TransferSyntax.None)).length()).toBe(4);
});

test("Test: Data Length Default Transfer Syntax", () => {
    expect((new EncodedData([0, 0, 0, 0])).length()).toBe(4);
});

test("Test: Data Access", () => {
    let data = new EncodedData([1, 2, 3, 4]);
    let accessed = data.access();
    expect(accessed[0]).toBe(1);
    expect(accessed[1]).toBe(2);
    expect(accessed[2]).toBe(3);
    expect(accessed[3]).toBe(4);
});

test("Test: Convert Transfer Syntax Endianess", () => {
    let data = new EncodedData([1, 2, 3, 4], TransferSyntax.ExplicitVRLittleEndian);
    data.convert(TransferSyntax.ExplicitVRBigEndian);
    let accessed = data.access();
    expect(accessed[0]).toBe(2);
    expect(accessed[1]).toBe(1);
    expect(accessed[2]).toBe(4);
    expect(accessed[3]).toBe(3);
});

test("Test: Append Data", () => {
    let data = new EncodedData([1, 2, 3, 4]);
    data.append([5, 6, 7, 8]);
    let accessed = data.access();
    expect(accessed[0]).toBe(1);
    expect(accessed[1]).toBe(2);
    expect(accessed[2]).toBe(3);
    expect(accessed[3]).toBe(4);
    expect(accessed[4]).toBe(5);
    expect(accessed[5]).toBe(6);
    expect(accessed[6]).toBe(7);
    expect(accessed[7]).toBe(8);
});

test("Test: Consume Data", () => {
    let data = new EncodedData([1, 2, 3, 4]);
    data.append([5, 6, 7, 8]);
    let consumed = data.consume(4);
    let accessed = data.access();
    expect(consumed[0]).toBe(1);
    expect(consumed[1]).toBe(2);
    expect(consumed[2]).toBe(3);
    expect(consumed[3]).toBe(4);
    expect(accessed[0]).toBe(5);
    expect(accessed[1]).toBe(6);
    expect(accessed[2]).toBe(7);
    expect(accessed[3]).toBe(8);
});

test("Test: Peek Data", () => {
    let data = new EncodedData([1, 2, 3, 4]);
    data.append([5, 6, 7, 8]);
    let peeked = data.peek(2, 4);
    expect(peeked[0]).toBe(3);
    expect(peeked[1]).toBe(4);
    expect(peeked[2]).toBe(5);
    expect(peeked[3]).toBe(6);
});

test("Test: Find Data", () => {
    let data = new EncodedData([1, 2, 3, 4]);
    data.append([5, 6, 7, 8]);
    expect(data.indexOf(0, [4, 5, 6])).toBe(3);
});

test("Test: Consume and Clear Data", () => {
    let data = new EncodedData([1, 2, 3, 4]);
    expect(data.length()).toBe(4);
    data.append([5, 6, 7, 8]);
    expect(data.length()).toBe(8);
    let consumed = data.consume(4);
    expect(data.length()).toBe(4);
    data.clear();
    expect(data.length()).toBe(0);
});

test("Test: Consume to Empty Data", () => {
    let data = new EncodedData([1, 2, 3, 4]);
    expect(data.length()).toBe(4);
    data.append([5, 6, 7, 8]);
    expect(data.length()).toBe(8);
    let consumed = data.consume(4);
    expect(data.length()).toBe(4);
    consumed = data.consume(4);
    expect(data.length()).toBe(0);
    expect(data.isEmpty).toBe(true);    
});

test("Test: Zero Data", () => {
    let data = new EncodedData([0, 0, 0, 0]);
    expect(data.length()).toBe(4);
    expect(data.isZeroSpace).toBe(true);    
});

test("Test: Append Array to Uint8Array Data", () => {
    let data = new EncodedData(new Uint8Array([1, 2, 3, 4]));
    data.append([5, 6, 7, 8]);
    let peeked = data.peek(2, 4);
    expect(peeked[0]).toBe(3);
    expect(peeked[1]).toBe(4);
    expect(peeked[2]).toBe(5);
    expect(peeked[3]).toBe(6);
});

test("Test: Append Uint8Array to Array Data", () => {
    let data = new EncodedData([1, 2, 3, 4]);
    data.append(new Uint8Array([5, 6, 7, 8]));
    let peeked = data.peek(2, 4);
    expect(peeked[0]).toBe(3);
    expect(peeked[1]).toBe(4);
    expect(peeked[2]).toBe(5);
    expect(peeked[3]).toBe(6);
});