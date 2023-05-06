import Item from '../../dicom/Item.js';
import Constants from '../../dicom/Constants.js'

test("Test: Item Value Length", () => {
    let item = new Item(Constants.UndefinedLength);
    expect(item.valueLength).toBe(Constants.UndefinedLength);
});