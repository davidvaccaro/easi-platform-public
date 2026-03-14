import DicomMapping from '../../../src/handlers/mappings/DicomMapping.js';
import Tag from '../../../src/dicom/Tag.js';

test('Test: DicomMapping captures template token tag dependencies for parsing', () => {

    var mapping = new DicomMapping();
    mapping.addTag(Tag.PatientID, 'result', {
        template: '{dicom.AccessionNumber}-{value}'
    });

    expect(mapping.shouldCaptureTag(Tag.PatientID)).toBe(true);
    expect(mapping.shouldCaptureTag(Tag.AccessionNumber)).toBe(true);
    expect(mapping.shouldCaptureTag(Tag.PixelData)).toBe(false);

});

test('Test: DicomMapping mapAttribute resolves dicom.* and prop.* template tokens', () => {

    var mapping = new DicomMapping();
    mapping.setProperty('prefix', 'PAT');
    mapping.addTag(Tag.PatientID, 'result', {
        template: '{prop.prefix}-{dicom.StudyInstanceUID}-{value}'
    });

    var context = {};
    mapping.start(context);

    mapping.mapAttribute(context, {
        tag: Tag.StudyInstanceUID,
        value: '1.2.3'
    });
    mapping.mapAttribute(context, {
        tag: Tag.PatientID,
        value: 'P-42'
    });

    expect(context.result).toBe('PAT-1.2.3-P-42');

});
