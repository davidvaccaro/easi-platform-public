import Entity from '../../../src/dicom/entities/Entity.js';
import AttributeSet from '../../../src/dicom/AttributeSet.js';
import GeneralSeriesModule from '../../../src/dicom/modules/GeneralSeriesModule.js';
import PatientModule from '../../../src/dicom/modules/PatientModule.js';

test("Test: Entity Constructor Stores AttributeSet", () => {
    var attributeSet = new AttributeSet();
    var entity = new Entity(attributeSet);
    expect(entity.attributeSet).toBe(attributeSet);
});

test("Test: Entity GeneralSeriesModule Type And AttributeSet", () => {
    var attributeSet = new AttributeSet();
    var entity = new Entity(attributeSet);
    var module = entity.generalSeriesModule;

    expect(module).toBeInstanceOf(GeneralSeriesModule);
    expect(module.attributeSet).toBe(attributeSet);
});

test("Test: Entity GeneralSeriesModule Is Not Cached", () => {
    var attributeSet = new AttributeSet();
    var entity = new Entity(attributeSet);

    expect(entity.generalSeriesModule).not.toBe(entity.generalSeriesModule);
});

test("Test: Entity PatientModule Type And AttributeSet", () => {
    var attributeSet = new AttributeSet();
    var entity = new Entity(attributeSet);
    var module = entity.patientModule;

    expect(module).toBeInstanceOf(PatientModule);
    expect(module.attributeSet).toBe(attributeSet);
});

test("Test: Entity PatientModule Is Not Cached", () => {
    var attributeSet = new AttributeSet();
    var entity = new Entity(attributeSet);

    expect(entity.patientModule).not.toBe(entity.patientModule);
});
