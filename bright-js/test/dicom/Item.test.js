import Item from '../../src/dicom/Item.js';
import Constants from '../../src/dicom/Constants.js'

test("Test: Item Value Length", () => {
    let item = new Item(Constants.UndefinedLength);
    expect(item.valueLength).toBe(Constants.UndefinedLength);
});