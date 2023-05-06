import DataElement from '../../dicom/DataElement.js';
import TransferSyntax from '../../dicom/TransferSyntax.js';

test("Test: Data Length Complete", () => {
    expect((new DataElement([0, 0, 0, 0], TransferSyntax.None, 4)).isComplete).toBe(true);
});

test("Test: Data Length Append Complete", () => {
    let element = new DataElement([0, 0, 0, 0], TransferSyntax.None, 8);
    expect(element.isComplete).toBe(false);
    element.append([9, 8, 7, 6]);
    expect(element.isComplete).toBe(true);
});

test("Test: Data Length Bytes Remaining Complete", () => {
    let element = new DataElement([0, 0, 0, 0], TransferSyntax.None, 8);
    expect(element.isComplete).toBe(false);
    expect(element.bytesRemaining).toBe(4);
    element.append([9, 8, 7, 6]);
    expect(element.isComplete).toBe(true);
});

test("Test: Data Length Make Complete", () => {
    let element = new DataElement([0, 0, 0, 0], TransferSyntax.None, 8);
    expect(element.isComplete).toBe(false);
    element.isComplete = true;
    expect(element.isComplete).toBe(true);
});