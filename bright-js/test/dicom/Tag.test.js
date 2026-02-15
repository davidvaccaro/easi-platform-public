import Tag from '../../src/dicom/Tag.js';
import { Tags } from '../../src/dicom/Tag.js';

test("Test: Find All Tags", () => {

    // Loop over the tags
    for (var id in Tags) {
        expect(Tag.find(id).ID).toBe(id);
    }

});

test("Test: Private Creator ID Tags", () => {

    // Loop over the tag range
    for (var element = 16; element <= 255; element++) {
        
        // Generate the tag identifier
        var tagID = Tag.identifier(1, element);

        // Find the tag
        var tag = Tag.find(tagID);

        // Test
        expect(Tag.isPrivateCreatorIDTag(tag.Group, tag.Element)).toBe(true);
        
    }

});

test("Test: NOT Private Creator ID Tags", () => {

    // Find the tag
    var tag = Tag.PatientID;

    // Test
    expect(Tag.isPrivateCreatorIDTag(tag.Group, tag.Element)).toBe(false);

});

test("Test: Private Tags", () => {

    // Loop over the tag range
    for (var element = 4096; element <= 4351; element++) {
        
        // Generate the tag identifier
        var tagID = Tag.identifier(1, element);

        // Find the tag
        var tag = Tag.find(tagID);

        // Test
        expect(Tag.isPrivateTag(tag.Group, tag.Element)).toBe(true);
        
    }

});

test("Test: NOT Private Tags", () => {

    // Find the tag
    var tag = Tag.PatientID;

    // Test
    expect(Tag.isPrivateTag(tag.Group, tag.Element)).toBe(false);

});