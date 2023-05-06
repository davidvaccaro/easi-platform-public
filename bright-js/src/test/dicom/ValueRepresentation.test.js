import ValueRepresentation from '../../dicom/ValueRepresentation.js';
import { ValueRepresentations } from '../../dicom/ValueRepresentation.js';

test("Test: Find All Value Representations", () => {

    // Loop over the value representations
    for (var id in ValueRepresentations) {
        expect(ValueRepresentation.find(id).ID).toBe(id);
    }

});