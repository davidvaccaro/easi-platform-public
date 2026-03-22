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

