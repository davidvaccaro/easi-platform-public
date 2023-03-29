import DicomItem from '../dicomItem.js';
import DicomConstants from '../dicomConstants.js'

test("Test: Item Value Length", () => {
    let item = new DicomItem(DicomConstants.UndefinedLength);
    expect(item.valueLength).toBe(DicomConstants.UndefinedLength);
});