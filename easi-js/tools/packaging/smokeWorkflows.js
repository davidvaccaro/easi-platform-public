// Entirely synthetic metadata: no repository samples or archive connections are used.
export const SYNTHETIC_METADATA = {
    "00080016": { vr: "UI", Value: ["1.2.840.10008.5.1.4.1.1.7"] },
    "00080018": { vr: "UI", Value: ["2.25.123456789.1.1"] },
    "00080060": { vr: "CS", Value: ["OT"] },
    "00100010": { vr: "PN", Value: [{ Alphabetic: "SYNTHETIC^Packaging" }] },
    "00100020": { vr: "LO", Value: ["EASI-PACKAGING-TEST"] },
    "0020000D": { vr: "UI", Value: ["2.25.123456789"] },
    "0020000E": { vr: "UI", Value: ["2.25.123456789.1"] },
    "00200011": { vr: "IS", Value: ["1"] },
    "00200013": { vr: "IS", Value: ["1"] }
};

function assert(condition, message) {
    if (condition != true)
        throw new Error(message);
}

export async function runSmokeWorkflows(root, dicom, fhir, mappings, selections) {
    var EASI = root.default;
    var Tag = dicom.Tag;
    assert(typeof EASI?.pipelineBuilder === "function", "Default EASI export is missing.");
    assert(root.EASI === EASI, "Named and default EASI exports must identify the same class.");
    assert(Tag?.StudyInstanceUID != null, "Public DICOM Tag export is missing.");
    assert(typeof fhir.ImagingStudy === "function", "Public FHIR ImagingStudy export is missing.");
    assert(typeof mappings.DicomToFHIRImagingStudyMapping === "function", "Public FHIR mapping export is missing.");
    assert(typeof selections.DicomSelection === "function", "Public DICOM selection export is missing.");

    var source = new TextEncoder().encode(JSON.stringify(SYNTHETIC_METADATA));
    var metadata = await EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().
        toInstances().build().process({ source });
    assert(metadata.count === 1, "Packaged metadata parser did not return one instance.");
    assert(metadata.first().dataSet.value(Tag.PatientID) === "EASI-PACKAGING-TEST",
        "Packaged metadata parser lost the synthetic identifier.");

    var native = (await EASI.pipelineBuilder().fromPartStream().ofDicomMetadata().
        toDicomData().build().process({ source })).first();
    assert(native instanceof Uint8Array && native.length > 0, "Packaged DICOM writer returned no bytes.");
    var instances = await EASI.pipelineBuilder().fromPartStream().ofDicomData().
        toInstances().build().process({ source: native });
    assert(instances.count === 1, "Packaged native DICOM parser did not return one instance.");
    assert(instances.first().dataSet.value(Tag.SOPInstanceUID) === "2.25.123456789.1.1",
        "Packaged DICOM read/write round trip lost the SOP Instance UID.");

    var selection = new selections.DicomSelection();
    selection.addTag(Tag.PatientID);
    selection.addTag(Tag.StudyInstanceUID);
    var selected = (await EASI.pipelineBuilder().fromPartStream().ofDicomData().
        toSelection(selection).build().process({ source: native })).first();
    assert(selected.value(Tag.PatientID) === "EASI-PACKAGING-TEST",
        "Packaged DICOM selection lost the selected identifier.");
    assert(selected.find(Tag.SOPInstanceUID) == null, "Packaged selection retained an unselected attribute.");

    var study = (await EASI.pipelineBuilder().fromPartStream().ofDicomData().
        toMapping(new mappings.DicomToFHIRImagingStudyMapping()).build().
        process({ source: native })).first();
    assert(study instanceof fhir.ImagingStudy, "Packaged mapping uses inconsistent FHIR model classes.");
    var resource = study.toJSON();
    assert(resource.resourceType === "ImagingStudy", "Packaged mapper returned the wrong resource type.");
    assert(resource.numberOfSeries === 1 && resource.numberOfInstances === 1,
        "Packaged FHIR mapping did not preserve study counts.");
    assert(resource.series[0].instance[0].uid === "2.25.123456789.1.1",
        "Packaged FHIR mapping lost the SOP Instance UID.");
    assert(resource.subject.reference === "#patient" && resource.contained[0].resourceType === "Patient",
        "Packaged FHIR mapping did not produce a resolvable patient subject.");

    return {
        metadataRead: true,
        dicomWriteAndRead: true,
        dicomSelection: true,
        fhirMapping: true,
        dicomBytes: native.length
    };
}
