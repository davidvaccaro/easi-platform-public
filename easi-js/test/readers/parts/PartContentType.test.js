import PartContentType from '../../../src/readers/parts/PartContentType.js';

test('Test: PartContentType parse single-part media type', () => {

    const contentType = PartContentType.parse('application/dicom');

    expect(contentType['content-type']).toBe('application/dicom');
    expect(contentType.isMultiPart).toBe(false);

});

test('Test: PartContentType parse multipart media type with boundary', () => {

    const contentType = PartContentType.parse('multipart/related; type=\"application/dicom\"; boundary=abc123');

    expect(contentType['content-type']).toBe('multipart/related');
    expect(contentType.isMultiPart).toBe(true);
    expect(contentType.boundary).toBe('abc123');
    expect(contentType.type).toBe('application/dicom');

});

test('Test: PartContentType preserves already parsed multipart boundary metadata', () => {

    const original = {
        'content-type': 'multipart/related',
        isMultiPart: true,
        boundary: 'xyz',
        type: 'application/dicom'
    };

    const contentType = PartContentType.parse(original);

    expect(contentType['content-type']).toBe('multipart/related');
    expect(contentType.isMultiPart).toBe(true);
    expect(contentType.boundary).toBe('xyz');
    expect(contentType.type).toBe('application/dicom');

});
