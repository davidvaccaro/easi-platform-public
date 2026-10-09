import HumanName from '../../src/fhir/HumanName.js';

test('Test: HumanName serializes repeating components as arrays for a single PN component', () => {

    expect(HumanName.coerce('Doe^John^^Dr.^PhD').toJSON()).toEqual({
        use: 'usual',
        text: 'John Doe',
        family: 'Doe',
        given: ['John'],
        prefix: ['Dr.'],
        suffix: ['PhD']
    });

});

test('Test: HumanName appends three given names without nested arrays', () => {

    const name = new HumanName();
    name.addGiven('John');
    name.addGiven('Paul');
    name.addGiven('James');
    expect(name.toJSON().given).toEqual(['John', 'Paul', 'James']);

});

test('Test: HumanName accepts FHIR objects and omits blank components', () => {

    const name = HumanName.coerce({ use: 'official', family: 'Doe', given: 'John', prefix: ['', 'Dr.'], suffix: [] });
    expect(name.toJSON()).toEqual({ use: 'official', family: 'Doe', given: ['John'], prefix: ['Dr.'] });

});
