import DicomValueRepresentation from '../dicomValueRepresentation.js';
import ValueRepresentations from '../dicomValueRepresentation.js';

test("Test: Find All Value Representations", () => {

    // Loop over the value representations
    for (id in ValueRepresentations) {
        expect(DicomValueRepresentation.find(id).ID).toBe(id);
    }

});