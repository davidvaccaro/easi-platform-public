import DicomEntityHandler from '../../../src/handlers/terminals/DicomEntityHandler.js';
import DataSet from '../../../src/dicom/DataSet.js';
import Attribute from '../../../src/dicom/Attribute.js';
import Tag from '../../../src/dicom/Tag.js';
import TransferSyntax from '../../../src/dicom/TransferSyntax.js';
import Entity from '../../../src/dicom/entities/Entity.js';
import Image from '../../../src/dicom/entities/Image.js';
import CT from '../../../src/dicom/entities/CT.js';

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

test("Test: DicomEntityHandler emits modality specific CT entity", () => {
    const handler = new DicomEntityHandler();
    const context = handler.onStartInstance(null);
    context.instance.dataSet = new DataSet();
    addStringAttribute(context.instance.dataSet, Tag.Modality, 'CT');

    const result = handler.onEndInstance(context);
    expect(result instanceof CT).toBe(true);
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
