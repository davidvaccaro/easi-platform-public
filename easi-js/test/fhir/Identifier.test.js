import Identifier from '../../src/fhir/Identifier.js';
import CodeableConcept from '../../src/fhir/CodeableConcept.js';
import Period from '../../src/fhir/Period.js';
import Reference from '../../src/fhir/Reference.js';

test('Test: Identifier serializes nested R4 type, period, and assigner without private fields', () => {

    const identifier = new Identifier({
        use: 'usual',
        type: CodeableConcept.create('http://terminology.hl7.org/CodeSystem/v2-0203', 'MR'),
        system: 'https://example.test/patient-id',
        value: 'P1',
        period: new Period({ start: '2020-01-01' }),
        assigner: new Reference('Organization/hospital')
    });

    expect(JSON.parse(JSON.stringify(identifier))).toEqual({
        use: 'usual',
        type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR' }] },
        system: 'https://example.test/patient-id',
        value: 'P1',
        period: { start: '2020-01-01' },
        assigner: { reference: 'Organization/hospital' }
    });

});

test('Test: Reference accepts a logical identifier and prunes empty optional properties', () => {

    const reference = new Reference({ identifier: new Identifier({ system: 'https://example.test/patient-id', value: 'P1' }), display: '' });
    expect(reference.toJSON()).toEqual({ identifier: { system: 'https://example.test/patient-id', value: 'P1' } });

});
