import StructuredReport from '../../../src/dicom/entities/StructuredReport.js';
import Entity from '../../../src/dicom/entities/Entity.js';
import StructuredReportModule from '../../../src/dicom/modules/StructuredReportModule.js';

function createAttributeSet() {
    return {
        value() { return null; },
        find() { return null; }
    };
}

test("Test: StructuredReport constructor inheritance and attributeSet", () => {
    var attributeSet = createAttributeSet();
    var entity = new StructuredReport(attributeSet);

    expect(entity).toBeInstanceOf(Entity);
    expect(entity.attributeSet).toBe(attributeSet);
});

test("Test: StructuredReport exposes report module", () => {
    var entity = new StructuredReport(createAttributeSet());
    expect(entity.structuredReportModule).toBeInstanceOf(StructuredReportModule);
    expect(entity.report).toBeInstanceOf(StructuredReportModule);
});
