import ImagingStudy, { ImagingStudyStatus } from '../../src/fhir/ImagingStudy.js';
import ImagingSeries from '../../src/fhir/ImagingSeries.js';
import ImagingInstance from '../../src/fhir/ImagingInstance.js';
import Patient from '../../src/fhir/Patient.js';
import Reference from '../../src/fhir/Reference.js';
import Coding from '../../src/fhir/Coding.js';
import CodingSystems from '../../src/fhir/CodingSystems.js';

test('Test: ImagingStudy serializes an R4 hierarchy with Coding values, Reference arrays, and a resolving contained subject', () => {

    const patient = new Patient();
    patient.id = 'patient-1';
    patient.identifier = { system: 'https://example.test/patient-id', value: 'P1' };
    patient.name = 'Doe^John';
    patient.telecom = 'research@example.test';

    const instance = new ImagingInstance();
    instance.uid = '1.2.3.4.5';
    instance.sopClass = '1.2.840.10008.5.1.4.1.1.2';
    instance.number = 0;
    instance.endpoint = 'https://example.test/unsupported-instance-endpoint';

    const series = new ImagingSeries();
    series.uid = '1.2.3.4';
    series.number = '2';
    series.modality = 'CT';
    series.numberOfInstances = 1;
    series.endpoint = 'Endpoint/series-1';
    series.instances.push(instance);

    const study = new ImagingStudy();
    study.id = 'study-1';
    study.identifier = { system: 'urn:dicom:uid', value: 'urn:oid:1.2.3' };
    study.status = ImagingStudyStatus.Available;
    study.modality = Coding.create(CodingSystems.DICOM, 'CT');
    study.subject = new Reference('#patient-1');
    study.endpoint = [new Reference('Endpoint/study-1')];
    study.numberOfSeries = 1;
    study.numberOfInstances = 1;
    study.series.push(series);
    study.contained.push(patient);

    const json = JSON.parse(JSON.stringify(study));
    expect(json.id).toBe('study-1');
    expect(json.status).toBe('available');
    expect(json.identifier).toEqual([{ system: 'urn:dicom:uid', value: 'urn:oid:1.2.3' }]);
    expect(json.modality).toEqual([{ system: CodingSystems.DICOM, code: 'CT' }]);
    expect(json.endpoint).toEqual([{ reference: 'Endpoint/study-1' }]);
    expect(json.series[0].modality).toEqual({ system: CodingSystems.DICOM, code: 'CT' });
    expect(json.series[0].endpoint).toEqual([{ reference: 'Endpoint/series-1' }]);
    expect(json.series[0].instance).toEqual([{
        uid: '1.2.3.4.5',
        sopClass: { system: CodingSystems.URI, code: 'urn:oid:1.2.840.10008.5.1.4.1.1.2' },
        number: 0
    }]);
    expect(json.series[0]).not.toHaveProperty('instances');
    expect(json.contained[0].id).toBe(json.subject.reference.slice(1));
    expect(json.contained[0].identifier).toHaveLength(1);
    expect(json.contained[0].name[0].given).toEqual(['John']);
    expect(json.contained[0].telecom).toEqual([{ system: 'email', value: 'research@example.test' }]);

});

test('Test: ImagingSeries instances remains a shared compatibility alias for instance', () => {

    const series = new ImagingSeries();
    const first = new ImagingInstance();
    series.instance = first;
    expect(series.instances).toEqual([first]);
    const second = new ImagingInstance();
    series.instances.push(second);
    expect(series.instance).toBe(series.instances);
    expect(series.instance).toEqual([first, second]);

});

test('Test: ImagingStudy default and legacy enum statuses serialize valid R4 codes', () => {

    const study = new ImagingStudy();
    expect(study.status).toBe('unknown');
    expect(study.toJSON()).toEqual({ resourceType: 'ImagingStudy', status: 'unknown' });
    study.status = ImagingStudyStatus.EnteredInError;
    expect(study.toJSON().status).toBe('entered-in-error');

});

test('Test: ImagingStudy omits blank optional fields and empty nested structures while preserving zero', () => {

    const study = new ImagingStudy();
    study.description = '  ';
    study.endpoint = [null, new Reference()];
    study.encounter = new Reference();
    study.series = [];
    study.contained = [];
    study.modality = [new Coding()];
    study.numberOfSeries = 0;
    study.numberOfInstances = 0;

    expect(study.toJSON()).toEqual({ resourceType: 'ImagingStudy', status: 'unknown', numberOfSeries: 0, numberOfInstances: 0 });

});

test.each(['1.2.3', 'urn:oid:1.2.3', Coding.create(CodingSystems.URI, 'urn:oid:1.2.3')])('Test: ImagingInstance preserves SOP class Coding when supplied as a UID or Coding', (sopClass) => {

    const instance = new ImagingInstance();
    instance.uid = '1.2.3.4';
    instance.sopClass = sopClass;
    expect(instance.toJSON().sopClass).toEqual({ system: CodingSystems.URI, code: 'urn:oid:1.2.3' });

});

test.each([-1, 1.5, '3abc', 2147483648, NaN])('Test: Imaging model optional unsigned integers omit invalid values (%s)', (number) => {

    const instance = new ImagingInstance();
    instance.uid = '1.2.3';
    instance.number = number;
    expect(instance.toJSON()).not.toHaveProperty('number');

    const series = new ImagingSeries();
    series.uid = '1.2';
    series.number = number;
    series.numberOfInstances = number;
    expect(series.toJSON()).not.toHaveProperty('number');
    expect(series.toJSON()).not.toHaveProperty('numberOfInstances');

});
