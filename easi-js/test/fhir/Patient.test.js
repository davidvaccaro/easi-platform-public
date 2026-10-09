import Patient from '../../src/fhir/Patient.js';
import ContactPoint from '../../src/fhir/ContactPoint.js';

test('Test: Patient.addName appends to multi-valued name', () => {

    var patient = new Patient();

    patient.addName('Doe^John');
    patient.addName('Doe^Jane');

    expect(Array.isArray(patient.name)).toBe(true);
    expect(patient.name.length).toBe(2);

});

test('Test: Patient.addTelcom appends ContactPoint values', () => {

    var patient = new Patient();

    patient.addTelcom('617-555-1000');
    patient.addTelcom(new ContactPoint());

    expect(Array.isArray(patient.telcom)).toBe(true);
    expect(patient.telcom.length).toBe(2);
    expect(patient.telcom[0]).toBeInstanceOf(ContactPoint);
    expect(patient.telcom[0].system).toBe('phone');
    expect(patient.telcom[0].value).toBe('617-555-1000');

});

test('Test: Patient serializes singleton identifiers, names, and telecom as R4 arrays with its contained-resource id', () => {

    const patient = new Patient();
    patient.id = 'patient-1';
    patient.identifier = 'P1';
    patient.name = { family: 'Doe', given: ['John'], prefix: ['Dr.'] };
    patient.telcom = '555-1000';
    patient.active = false;
    patient.gender = 'M';

    expect(patient.toJSON()).toEqual({
        resourceType: 'Patient',
        id: 'patient-1',
        identifier: [{ value: 'P1' }],
        active: false,
        name: [{ family: 'Doe', given: ['John'], prefix: ['Dr.'] }],
        telecom: [{ system: 'phone', value: '555-1000' }],
        gender: 'male'
    });
    expect(patient.telecom).toBe(patient.telcom);

});

test('Test: Patient canonical and legacy telecom append methods preserve all values', () => {

    const patient = new Patient();
    patient.addTelecom('one@example.test');
    patient.addTelcom('555-1000');
    patient.addTelecom({ system: 'url', value: 'https://example.test' });

    expect(patient.toJSON().telecom).toEqual([
        { system: 'email', value: 'one@example.test' },
        { system: 'phone', value: '555-1000' },
        { system: 'url', value: 'https://example.test' }
    ]);
    expect(patient.toJSON()).not.toHaveProperty('telcom');

});

test.each(['1980', '1980-02', '1980-02-03'])('Test: Patient preserves partial/full FHIR birthDate strings (%s)', (birthDate) => {

    const patient = new Patient();
    patient.birthDate = birthDate;
    expect(patient.toJSON().birthDate).toBe(birthDate);

});

test('Test: Patient supports Date birthDates and omits unset/empty optional values', () => {

    const patient = new Patient();
    expect(patient.toJSON()).toEqual({ resourceType: 'Patient' });
    patient.birthDate = new Date(1980, 1, 3);
    expect(patient.toJSON().birthDate).toBe('1980-02-03');
    patient.birthDate = new Date(NaN);
    expect(patient.toJSON()).not.toHaveProperty('birthDate');
    patient.identifier = [{ value: '' }];
    patient.name = [{}];
    patient.telecom = [new ContactPoint()];
    expect(patient.toJSON()).toEqual({ resourceType: 'Patient' });

});

