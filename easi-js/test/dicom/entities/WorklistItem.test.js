import WorklistItem from '../../../src/dicom/entities/WorklistItem.js';
import Entity from '../../../src/dicom/entities/Entity.js';
import RequestedProcedureModule from '../../../src/dicom/modules/RequestedProcedureModule.js';
import ScheduledProcedureStepModule from '../../../src/dicom/modules/ScheduledProcedureStepModule.js';

function createAttributeSet() {
    return {
        value() {
            return null;
        },
        find() {
            return null;
        }
    };
}

test("Test: WorklistItem Constructor Inheritance And AttributeSet", () => {
    var attributeSet = createAttributeSet();
    var entity = new WorklistItem(attributeSet);

    expect(entity).toBeInstanceOf(Entity);
    expect(entity.attributeSet).toBe(attributeSet);
});

test("Test: WorklistItem exposes requested procedure and scheduled procedure step modules", () => {
    var entity = new WorklistItem(createAttributeSet());

    expect(entity.requestedProcedureModule).toBeInstanceOf(RequestedProcedureModule);
    expect(entity.requestedProcedure).toBeInstanceOf(RequestedProcedureModule);
    expect(entity.scheduledProcedureStepModule).toBeInstanceOf(ScheduledProcedureStepModule);
    expect(entity.scheduledProcedureStep).toBeInstanceOf(ScheduledProcedureStepModule);
});
