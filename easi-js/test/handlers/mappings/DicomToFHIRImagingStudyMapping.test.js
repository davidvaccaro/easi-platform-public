import EASI from '../../../src/EASI.js';
import DicomToFHIRImagingStudyMapping from '../../../src/handlers/mappings/DicomToFHIRImagingStudyMapping.js';
import ImagingStudy from '../../../src/fhir/ImagingStudy.js';

test('Test: DicomToFHIRImagingStudyMapping expands hierarchy reference templates from property bag and dicom tokens', async () => {

    var mapping = new DicomToFHIRImagingStudyMapping()
        .setProperties({
            wadoRsBase: 'https://example.test/dicom-web',
            fhirBase: 'https://example.test/fhir'
        })
        .setSubjectMode('reference')
        .setReferenceTemplates({
            study: '{prop.wadoRsBase}/studies/{dicom.StudyInstanceUID}',
            series: '{prop.wadoRsBase}/studies/{dicom.StudyInstanceUID}/series/{dicom.SeriesInstanceUID}',
            instance: '{prop.wadoRsBase}/studies/{dicom.StudyInstanceUID}/series/{dicom.SeriesInstanceUID}/instances/{dicom.SOPInstanceUID}',
            subject: '{prop.fhirBase}/Patient/{dicom.PatientID}'
        });

    var metadata = JSON.stringify({
        '0020000D': { vr: 'UI', Value: ['1.2.3'] },
        '0020000E': { vr: 'UI', Value: ['1.2.3.1'] },
        '00080016': { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.2'] },
        '00080018': { vr: 'UI', Value: ['1.2.3.1.1'] },
        '00100020': { vr: 'LO', Value: ['P-1234'] },
        '00200011': { vr: 'IS', Value: [1] },
        '00200013': { vr: 'IS', Value: [1] },
        '00080060': { vr: 'CS', Value: ['CT'] }
    });

    var result = await EASI
        .pipelineBuilder()
        .fromPartStream()
        .ofDicomMetadata()
        .toMapping(mapping)
        .build()
        .process((new TextEncoder()).encode(metadata));

    expect(result instanceof ImagingStudy).toBe(true);
    expect(result.endpoint).toBe('https://example.test/dicom-web/studies/1.2.3');
    expect(result.series[0].endpoint).toBe('https://example.test/dicom-web/studies/1.2.3/series/1.2.3.1');
    expect(result.series[0].instances[0].endpoint).toBe('https://example.test/dicom-web/studies/1.2.3/series/1.2.3.1/instances/1.2.3.1.1');
    expect(result.subject?.reference).toBe('https://example.test/fhir/Patient/P-1234');
    expect(Array.isArray(result.contained)).toBe(true);
    expect(result.contained.length).toBe(0);

});

test('Test: DicomToFHIRImagingStudyMapping supports subjectMode none', async () => {

    var mapping = new DicomToFHIRImagingStudyMapping({
        subjectMode: 'none'
    }).setReferenceTemplates({
        study: 'https://example.test/dicom-web/studies/{dicom.StudyInstanceUID}'
    });

    var metadata = JSON.stringify({
        '0020000D': { vr: 'UI', Value: ['1.2.3'] },
        '0020000E': { vr: 'UI', Value: ['1.2.3.1'] },
        '00080016': { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.2'] },
        '00080018': { vr: 'UI', Value: ['1.2.3.1.1'] }
    });

    var result = await EASI
        .pipelineBuilder()
        .fromPartStream()
        .ofDicomMetadata()
        .toMapping(mapping)
        .build()
        .process((new TextEncoder()).encode(metadata));

    expect(result instanceof ImagingStudy).toBe(true);
    expect(result.subject).toBe(null);
    expect(Array.isArray(result.contained)).toBe(true);
    expect(result.contained.length).toBe(0);

});
