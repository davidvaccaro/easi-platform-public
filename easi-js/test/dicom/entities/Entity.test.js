import Entity from '../../../src/dicom/entities/Entity.js';
import Instance from '../../../src/dicom/Instance.js';
import AttributeSet from '../../../src/dicom/AttributeSet.js';
import Attribute from '../../../src/dicom/Attribute.js';
import Tag from '../../../src/dicom/Tag.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';
import GeneralSeriesModule from '../../../src/dicom/modules/GeneralSeriesModule.js';
import PatientModule from '../../../src/dicom/modules/PatientModule.js';

test("Test: Entity Constructor Stores AttributeSet", () => {
    var attributeSet = new AttributeSet();
    var entity = new Entity(attributeSet);
    expect(entity.attributeSet).toBe(attributeSet);
    expect(entity.instance).toBeNull();
});

test("Test: Entity Constructor Supports Instance Input", () => {
    var attributeSet = new AttributeSet();
    var instance = new Instance();
    instance.dataSet = attributeSet;

    var entity = new Entity(instance);
    expect(entity.instance).toBe(instance);
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

test("Test: Entity SOP Instance UID", () => {
    var attributeSet = new AttributeSet();
    var value = '1.2.3.4.5';
    var data = new TextEncoder().encode(value);

    attributeSet.add(new Attribute(
        Tag.SOPInstanceUID,
        data.length,
        data,
        TransferSyntax.NONE
    ));

    var entity = new Entity(attributeSet);
    expect(entity.sopInstanceUid).toBe(value);
});

test("Test: Entity SOP Class UID", () => {
    var attributeSet = new AttributeSet();
    var value = '1.2.840.10008.5.1.4.1.1.88.59';
    var data = new TextEncoder().encode(value);

    attributeSet.add(new Attribute(
        Tag.SOPClassUID,
        data.length,
        data,
        TransferSyntax.NONE
    ));

    var entity = new Entity(attributeSet);
    expect(entity.sopClassUid).toBe(value);
});

test("Test: Entity SOP Instance UID Is Empty When Missing", () => {
    var entity = new Entity(new AttributeSet());
    expect(entity.sopInstanceUid).toBe('');
});

test("Test: Entity SOP Class UID Is Empty When Missing", () => {
    var entity = new Entity(new AttributeSet());
    expect(entity.sopClassUid).toBe('');
});

test("Test: Entity Patient Alias Returns PatientModule", () => {
    var entity = new Entity(new AttributeSet());
    expect(entity.patient).toBeInstanceOf(PatientModule);
});
