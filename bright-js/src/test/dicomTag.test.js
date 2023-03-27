import DicomTag from '../dicomTag.js';
import Tags from '../dicomTag.js';
import { Tag } from '../dicomTag.js';

test("Test: Find All Tags", () => {

    // Loop over the tags
    for (id in Tags) {
        expect(DicomTag.find(id).ID).toBe(id);
    }

});

test("Test: Private Creator ID Tags", () => {

    // Loop over the tag range
    for (var element = 16; element <= 255; element++) {
        
        // Generate the tag identifier
        var tagID = DicomTag.identifier(1, element);

        // Find the tag
        var tag = DicomTag.find(tagID);

        // Test
        expect(DicomTag.isPrivateCreatorIDTag(tag.Group, tag.Element)).toBe(true);
        
    }

});

test("Test: NOT Private Creator ID Tags", () => {

    // Find the tag
    var tag = Tag.PatientID;

    // Test
    expect(DicomTag.isPrivateCreatorIDTag(tag.Group, tag.Element)).toBe(false);

});

test("Test: Private Tags", () => {

    // Loop over the tag range
    for (var element = 4096; element <= 4351; element++) {
        
        // Generate the tag identifier
        var tagID = DicomTag.identifier(1, element);

        // Find the tag
        var tag = DicomTag.find(tagID);

        // Test
        expect(DicomTag.isPrivateTag(tag.Group, tag.Element)).toBe(true);
        
    }

});

test("Test: NOT Private Tags", () => {

    // Find the tag
    var tag = Tag.PatientID;

    // Test
    expect(DicomTag.isPrivateTag(tag.Group, tag.Element)).toBe(false);

});