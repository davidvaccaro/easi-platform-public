import DicomDeIdentificationMaskBuilder from "../../src/builders/DicomDeIdentificationMaskBuilder.js";
import EASI from "../../src/EASI.js";
import Tag from "../../src/dicom/Tag.js";

test("Test: DicomDeIdentificationMaskBuilder entry points are available", () => {
    expect(DicomDeIdentificationMaskBuilder.builder() instanceof DicomDeIdentificationMaskBuilder).toBe(true);
    expect(EASI.deIdentificationMaskBuilder() instanceof DicomDeIdentificationMaskBuilder).toBe(true);
});

test("Test: DicomDeIdentificationMaskBuilder set/get/remove operations resolve mixed tag inputs", () => {

    var builder = new DicomDeIdentificationMaskBuilder()
        .set(Tag.PatientName, "X")
        .set("PatientID", "Z")
        .set("(0008,0018)", "U");

    expect(builder.has(Tag.PatientName)).toBe(true);
    expect(builder.get(Tag.PatientName).Action).toBe("X");
    expect(builder.get("00100020").Action).toBe("Z");
    expect(builder.get(Tag.SOPInstanceUID).Action).toBe("U");

    builder.remove(Tag.PatientName);
    expect(builder.has(Tag.PatientName)).toBe(false);

});

test("Test: DicomDeIdentificationMaskBuilder withDefaultProfile initializes with standard default mask", () => {

    var mask = new DicomDeIdentificationMaskBuilder()
        .withDefaultProfile()
        .build();

    expect(mask.has(Tag.PatientName.ID)).toBe(true);
    expect(mask.get(Tag.PatientName.ID)).toEqual({
        ID: Tag.PatientName.ID,
        Action: Tag.PatientName.BasicProtectionAction
    });

});

test("Test: DicomDeIdentificationMaskBuilder mergeDeIdentificationMask supports map/object/array input", () => {

    var mask = new DicomDeIdentificationMaskBuilder()
        .mergeDeIdentificationMask(new Map([
            [Tag.PatientName, "X"]
        ]))
        .mergeDeIdentificationMask({
            "(0010,0020)": "Z"
        })
        .mergeDeIdentificationMask([
            { ID: Tag.PatientBirthDate.ID, Action: "D" }
        ])
        .build();

    expect(mask.get(Tag.PatientName.ID).Action).toBe("X");
    expect(mask.get(Tag.PatientID.ID).Action).toBe("Z");
    expect(mask.get(Tag.PatientBirthDate.ID).Action).toBe("D");

});

test("Test: DicomDeIdentificationMaskBuilder build returns a detached clone", () => {

    var builder = new DicomDeIdentificationMaskBuilder()
        .set(Tag.PatientName, "X");

    var first = builder.build();
    first.set(Tag.PatientName.ID, { ID: Tag.PatientName.ID, Action: "K" });

    var second = builder.build();
    expect(second.get(Tag.PatientName.ID).Action).toBe("X");

});

test("Test: DicomDeIdentificationMaskBuilder throws for invalid tag references", () => {
    expect(() => {
        new DicomDeIdentificationMaskBuilder().set("not-a-dicom-tag", "X");
    }).toThrow("Unable to resolve DICOM tag");
});
