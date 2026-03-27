import DicomEntityHandler from '../../../src/handlers/terminals/DicomEntityHandler.js';
import DataSet from '../../../src/dicom/DataSet.js';
import Attribute from '../../../src/dicom/Attribute.js';
import Tag from '../../../src/dicom/Tag.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';
import Entity from '../../../src/dicom/entities/Entity.js';
import Image from '../../../src/dicom/entities/Image.js';
import WorklistItem from '../../../src/dicom/entities/WorklistItem.js';
import KeyObjectSelection from '../../../src/dicom/entities/KeyObjectSelection.js';
import StructuredReport from '../../../src/dicom/entities/StructuredReport.js';
import Segmentation from '../../../src/dicom/entities/Segmentation.js';
import EncapsulatedDocument from '../../../src/dicom/entities/EncapsulatedDocument.js';
import Waveform from '../../../src/dicom/entities/Waveform.js';
import PresentationState from '../../../src/dicom/entities/PresentationState.js';

function addStringAttribute(attributeSet, tag, value) {
    var data = new TextEncoder().encode(value);
    attributeSet.add(new Attribute(
        tag,
        data.length,
        data,
        TransferSyntax.NONE
    ));
}

test("Test: DicomEntityHandler emits single entity on first instance", () => {
    const handler = new DicomEntityHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();

    const result = handler.onEndInstance(context);

    expect(result instanceof Entity).toBe(true);
    expect(result instanceof Image).toBe(true);
    expect(result.attributeSet).toBe(context.instance.dataSet);
});

test("Test: DicomEntityHandler emits image entity for CT modality", () => {
    const handler = new DicomEntityHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(context.instance.dataSet, Tag.Modality, 'CT');

    const result = handler.onEndInstance(context);
    expect(result instanceof Image).toBe(true);
});

test("Test: DicomEntityHandler emits KOS entity by SOPClassUID", () => {
    const handler = new DicomEntityHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(
        context.instance.dataSet,
        Tag.SOPClassUID,
        '1.2.840.10008.5.1.4.1.1.88.59'
    );

    const result = handler.onEndInstance(context);
    expect(result instanceof KeyObjectSelection).toBe(true);
});

test("Test: DicomEntityHandler emits WorklistItem when SPS sequence exists", () => {
    const handler = new DicomEntityHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    context.instance.dataSet.add({
        tag: Tag.ScheduledProcedureStepSequence,
        items: []
    });

    const result = handler.onEndInstance(context);
    expect(result instanceof WorklistItem).toBe(true);
});

test("Test: DicomEntityHandler emits StructuredReport by SOPClassUID", () => {
    const handler = new DicomEntityHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(
        context.instance.dataSet,
        Tag.SOPClassUID,
        '1.2.840.10008.5.1.4.1.1.88.33'
    );

    const result = handler.onEndInstance(context);
    expect(result instanceof StructuredReport).toBe(true);
});

test("Test: DicomEntityHandler emits Segmentation by SOPClassUID", () => {
    const handler = new DicomEntityHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(
        context.instance.dataSet,
        Tag.SOPClassUID,
        '1.2.840.10008.5.1.4.1.1.66.4'
    );

    const result = handler.onEndInstance(context);
    expect(result instanceof Segmentation).toBe(true);
});

test("Test: DicomEntityHandler emits EncapsulatedDocument by SOPClassUID", () => {
    const handler = new DicomEntityHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(
        context.instance.dataSet,
        Tag.SOPClassUID,
        '1.2.840.10008.5.1.4.1.1.104.1'
    );

    const result = handler.onEndInstance(context);
    expect(result instanceof EncapsulatedDocument).toBe(true);
});

test("Test: DicomEntityHandler emits Waveform by SOPClassUID", () => {
    const handler = new DicomEntityHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(
        context.instance.dataSet,
        Tag.SOPClassUID,
        '1.2.840.10008.5.1.4.1.1.9.1.1'
    );

    const result = handler.onEndInstance(context);
    expect(result instanceof Waveform).toBe(true);
});

test("Test: DicomEntityHandler emits PresentationState by SOPClassUID", () => {
    const handler = new DicomEntityHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(
        context.instance.dataSet,
        Tag.SOPClassUID,
        '1.2.840.10008.5.1.4.1.1.11.1'
    );

    const result = handler.onEndInstance(context);
    expect(result instanceof PresentationState).toBe(true);
});

test("Test: DicomEntityHandler emits entity collection across instances", () => {
    const handler = new DicomEntityHandler();
    var context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    handler.onEndInstance(context);

    context = handler.onStartInstance(context);
    context.instance.dataSet = new DataSet();
    const result = handler.onEndInstance(context);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0] instanceof Entity).toBe(true);
    expect(result[1] instanceof Entity).toBe(true);
});
