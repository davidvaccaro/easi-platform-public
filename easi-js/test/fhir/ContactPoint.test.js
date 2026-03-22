import ContactPoint from '../../src/fhir/ContactPoint.js';

test('Test: ContactPoint.coerce returns null for null input', () => {

    expect(ContactPoint.coerce(null)).toBeNull();

});

test('Test: ContactPoint.coerce returns same ContactPoint instance', () => {

    var source = new ContactPoint();
    source.system = 'phone';
    source.value = '555-1000';

    expect(ContactPoint.coerce(source)).toBe(source);

});

test('Test: ContactPoint.coerce maps email string to email system', () => {

    var result = ContactPoint.coerce('a@b.com');

    expect(result).toBeInstanceOf(ContactPoint);
    expect(result.system).toBe('email');
    expect(result.value).toBe('a@b.com');

});

test('Test: ContactPoint.coerce maps phone-like string to phone system', () => {

    var result = ContactPoint.coerce('+1 (617) 555-1212');

    expect(result).toBeInstanceOf(ContactPoint);
    expect(result.system).toBe('phone');
    expect(result.value).toBe('+1 (617) 555-1212');

});

test('Test: ContactPoint.coerce maps object fields', () => {

    var result = ContactPoint.coerce({
        system: 'url',
        value: 'https://example.org',
        use: 'work',
        rank: 2
    });

    expect(result).toBeInstanceOf(ContactPoint);
    expect(result.system).toBe('url');
    expect(result.value).toBe('https://example.org');
    expect(result.use).toBe('work');
    expect(result.rank).toBe(2);

});

