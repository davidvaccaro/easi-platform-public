import DicomSOPClass from '../dicomSOPClass.js';
import SOPClasses from '../dicomSOPClass.js';

test("Test: Find All SOP Classes", () => {

    // Loop over the SOP classes
    for (id in SOPClasses) {
        expect(DicomSOPClass.find(id).ID).toBe(id);
    }

});