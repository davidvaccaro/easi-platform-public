import SOPClass from '../../src/dicom/SOPClass.js';
import { SOPClasses } from '../../src/dicom/SOPClass.js';

test("Test: Find All SOP Classes", () => {

    // Loop over the SOP classes
    for (var id in SOPClasses) {
        expect(SOPClass.find(id).ID).toBe(id);
    }

});