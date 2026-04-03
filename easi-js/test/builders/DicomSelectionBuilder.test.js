import DicomSelectionBuilder from "../../src/builders/DicomSelectionBuilder.js";
import DicomSelection from "../../src/handlers/selections/DicomSelection.js";
import Tag from "../../src/dicom/Tag.js";
import EASI from "../../src/EASI.js";

test("Test: DicomSelectionBuilder entry points are available", () => {
    expect(DicomSelectionBuilder.builder() instanceof DicomSelectionBuilder).toBe(true);
    expect(EASI.selectionBuilder() instanceof DicomSelectionBuilder).toBe(true);
});

test("Test: DicomSelectionBuilder includes tags with object, keyword, and ID input", () => {

    var selection = new DicomSelectionBuilder()
        .include(Tag.PatientID)
        .include("PatientID")
        .include("(0010,0020)")
        .include("00100020")
        .build();

    expect(selection instanceof DicomSelection).toBe(true);
    expect(selection.hasTag(Tag.PatientID)).toBe(true);
    expect(selection.matching.tags.length).toBe(1);

});

test("Test: DicomSelectionBuilder supports includeTags and withSelection", () => {

    var baseSelection = new DicomSelection();
    var builtSelection = new DicomSelectionBuilder()
        .withSelection(baseSelection)
        .includeTags([Tag.StudyInstanceUID, "SeriesInstanceUID"])
        .build();

    expect(builtSelection).toBe(baseSelection);
    expect(baseSelection.hasTag(Tag.StudyInstanceUID)).toBe(true);
    expect(baseSelection.hasTag(Tag.SeriesInstanceUID)).toBe(true);

});

test("Test: DicomSelectionBuilder throws for invalid tag input", () => {
    expect(() => {
        new DicomSelectionBuilder().include("not-a-dicom-tag");
    }).toThrow("Unable to resolve DICOM tag");
});
