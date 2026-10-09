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

test('Test: PartContentType normalizes media types and parameter names while preserving parameter values', () => {

    const contentType = PartContentType.parse('Multipart/Related; TYPE="Application/DICOM"; BOUNDARY="AaB03x=Case"; profile="CaseSensitive"');

    expect(contentType.mediaType).toBe('multipart/related');
    expect(contentType.type).toBe('application/dicom');
    expect(contentType.boundary).toBe('AaB03x=Case');
    expect(contentType.profile).toBe('CaseSensitive');
    expect(contentType.isMultiPart).toBe(true);

});

test('Test: PartContentType parses quoted semicolons and quoted-pair escapes', () => {

    const contentType = PartContentType.parse('multipart/related; boundary="A;B=C"; title="A\\"B\\\\C"; charset=UTF-8');

    expect(contentType.boundary).toBe('A;B=C');
    expect(contentType.title).toBe('A"B\\C');
    expect(contentType.charset).toBe('UTF-8');

});

test.each([
    { 'Content-Type': 'Multipart/Related; boundary=AaB03x' },
    { headers: { 'CONTENT-TYPE': 'Multipart/Related; boundary=AaB03x' } },
    [['Content-Type', 'Multipart/Related; boundary=AaB03x']]
].map((headers) => [headers]))('Test: PartContentType accepts case-insensitive header names from plain header collections', (headers) => {

    expect(PartContentType.parse(headers)).toEqual(expect.objectContaining({
        mediaType: 'multipart/related',
        boundary: 'AaB03x',
        isMultiPart: true
    }));

});

test('Test: PartContentType normalizes already parsed media types without changing boundaries', () => {

    expect(PartContentType.parse({
        'content-type': 'Multipart/Related',
        isMultiPart: true,
        boundary: 'AaB03x'
    })).toEqual(expect.objectContaining({
        'content-type': 'multipart/related',
        mediaType: 'multipart/related',
        boundary: 'AaB03x'
    }));

});
