import DicomMappingBuilder from "../../src/builders/DicomMappingBuilder.js";
import DicomMapping from "../../src/handlers/mappings/DicomMapping.js";
import Tag from "../../src/dicom/Tag.js";
import EASI from "../../src/EASI.js";

test("Test: DicomMappingBuilder entry points are available", () => {
    expect(DicomMappingBuilder.builder() instanceof DicomMappingBuilder).toBe(true);
    expect(EASI.mappingBuilder() instanceof DicomMappingBuilder).toBe(true);
});

test("Test: DicomMappingBuilder supports fluent map composition", () => {

    var mapping = new DicomMappingBuilder()
        .withTemplatePolicy("omit")
        .withProperty("prefix", "PAT")
        .map(Tag.PatientID, "patient.id")
        .map("StudyInstanceUID").to("study.uid")
        .withComputed("patient.label", { template: "{prop.prefix}-{dicom.PatientID}" })
        .build();

    expect(mapping instanceof DicomMapping).toBe(true);
    expect(mapping.hasTag(Tag.PatientID)).toBe(true);
    expect(mapping.hasTag(Tag.StudyInstanceUID)).toBe(true);
    expect(mapping.templatePolicy).toBe("omit");
    expect(mapping.getProperty("prefix")).toBe("PAT");
    expect(mapping.getComputedDefinitions().length).toBe(1);
    expect(mapping.shouldCaptureTag(Tag.PatientID)).toBe(true);

});

test("Test: DicomMappingBuilder resolves tag IDs from DICOM tag strings", () => {

    var mapping = new DicomMappingBuilder()
        .map("(0010,0020)", "patient.id")
        .build();

    expect(mapping.hasTag(Tag.PatientID)).toBe(true);

});

test("Test: DicomMappingBuilder supports withMapping", () => {

    var baseMapping = new DicomMapping();
    var builtMapping = new DicomMappingBuilder()
        .withMapping(baseMapping)
        .map("PatientName", "patient.name")
        .build();

    expect(builtMapping).toBe(baseMapping);
    expect(builtMapping.hasTag(Tag.PatientName)).toBe(true);

});

test("Test: DicomMappingBuilder throws for invalid tag input", () => {
    expect(() => {
        new DicomMappingBuilder().map("not-a-dicom-tag", "result");
    }).toThrow("Unable to resolve DICOM tag");
});
