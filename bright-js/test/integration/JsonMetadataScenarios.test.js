import EASI from '../../src/EASI.js';
import DicomSelection from '../../src/handlers/selections/DicomSelection.js';
import Tag from '../../src/dicom/Tag.js';
import ImagingStudy from '../../src/fhir/ImagingStudy.js';

test("Test: DICOM JSON metadata selection emits selected attributes", async () => {

    // Build test DICOM JSON metadata with two instances
    const metadata = JSON.stringify([
        {
            "0020000D": { "vr": "UI", "Value": ["1.2.3"] },
            "0020000E": { "vr": "UI", "Value": ["1.2.3.1"] },
            "00080016": { "vr": "UI", "Value": ["1.2.840.10008.5.1.4.1.1.2"] },
            "00080018": { "vr": "UI", "Value": ["1.2.3.1.1"] },
            "00200011": { "vr": "IS", "Value": [1] },
            "00200013": { "vr": "IS", "Value": [1] },
            "00080060": { "vr": "CS", "Value": ["CT"] }
        },
        {
            "0020000D": { "vr": "UI", "Value": ["1.2.3"] },
            "0020000E": { "vr": "UI", "Value": ["1.2.3.1"] },
            "00080016": { "vr": "UI", "Value": ["1.2.840.10008.5.1.4.1.1.2"] },
            "00080018": { "vr": "UI", "Value": ["1.2.3.1.2"] },
            "00200011": { "vr": "IS", "Value": [1] },
            "00200013": { "vr": "IS", "Value": [2] },
            "00080060": { "vr": "CS", "Value": ["CT"] }
        }
    ]);

    // Setup the selection
    var selection = new DicomSelection();
    selection.addTag(Tag.SOPInstanceUID);

    // Build and run the reader
    const reader = EASI
        .newStreamingDicomJsonSelectionReaderBuilder(selection)
        .build();
    const result = await reader.read((new TextEncoder()).encode(metadata));

    // Validate
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].has(Tag.SOPInstanceUID)).toBe(true);
    expect(result[1].has(Tag.SOPInstanceUID)).toBe(true);

});

test("Test: DICOM JSON metadata to FHIR ImagingStudy mapping emits ImagingStudy", async () => {

    // Build test DICOM JSON metadata
    const metadata = JSON.stringify({
        "0020000D": { "vr": "UI", "Value": ["1.2.3"] },
        "0020000E": { "vr": "UI", "Value": ["1.2.3.1"] },
        "00080016": { "vr": "UI", "Value": ["1.2.840.10008.5.1.4.1.1.2"] },
        "00080018": { "vr": "UI", "Value": ["1.2.3.1.1"] },
        "00200011": { "vr": "IS", "Value": [1] },
        "00200013": { "vr": "IS", "Value": [1] },
        "00080060": { "vr": "CS", "Value": ["CT"] }
    });

    // Build and run the reader
    const reader = EASI
        .newStreamingDicomJsonFHIRImagingStudyReaderBuilder()
        .build();
    const result = await reader.read((new TextEncoder()).encode(metadata));

    // Validate
    expect(result instanceof ImagingStudy).toBe(true);
    expect(result.series.length).toBe(1);
    expect(result.series[0].instances.length).toBe(1);

});
