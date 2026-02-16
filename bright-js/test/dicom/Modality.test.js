import Modality from '../../src/dicom/Modality.js';
import { Modalities } from '../../src/dicom/Modality.js';

test("Test: Find All Modalities", () => {

    // Loop over the modalities
    for (var id in Modalities) {
        expect(Modality.find(id).ID).toBe(id);
    }

});
