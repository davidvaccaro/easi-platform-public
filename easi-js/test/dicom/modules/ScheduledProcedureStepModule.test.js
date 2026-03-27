import ScheduledProcedureStepModule from '../../../src/dicom/modules/ScheduledProcedureStepModule.js';
import Tag from '../../../src/dicom/Tag.js';

function createItem(valueByTagId = {}, byFindTagId = {}) {
    return {
        value(tag, defaultValue = null) {
            if (Object.prototype.hasOwnProperty.call(valueByTagId, tag.ID))
                return valueByTagId[tag.ID];
            return defaultValue;
        },
        find(tag) {
            if (Object.prototype.hasOwnProperty.call(byFindTagId, tag.ID))
                return byFindTagId[tag.ID];
            return null;
        }
    };
}

function createAttributeSet(sequenceItems = []) {
    return {
        find(tag) {
            if (tag.ID == Tag.ScheduledProcedureStepSequence.ID) {
                return { items: sequenceItems };
            }
            return null;
        }
    };
}

test("Test: ScheduledProcedureStepModule exposes first-item SPS fields", () => {
    var scheduledProtocolCodeSequence = { items: [{}, {}] };
    var firstItem = createItem({
        [Tag.ScheduledStationAETitle.ID]: 'MODALITY_AE',
        [Tag.ScheduledStationName.ID]: 'CT-01',
        [Tag.ScheduledProcedureStepStartDate.ID]: '20260327',
        [Tag.ScheduledProcedureStepStartTime.ID]: '091500',
        [Tag.ScheduledPerformingPhysicianName.ID]: 'Whooley^Peter',
        [Tag.ScheduledProcedureStepDescription.ID]: 'CT CHEST',
        [Tag.ScheduledProcedureStepID.ID]: 'SPS-001'
    }, {
        [Tag.ScheduledProtocolCodeSequence.ID]: scheduledProtocolCodeSequence
    });

    var secondItem = createItem({
        [Tag.ScheduledProcedureStepID.ID]: 'SPS-002'
    });

    var module = new ScheduledProcedureStepModule(createAttributeSet([firstItem, secondItem]));

    expect(module.hasItems).toBe(true);
    expect(module.items.length).toBe(2);
    expect(module.firstItem).toBe(firstItem);
    expect(module.scheduledStationAETitle).toBe('MODALITY_AE');
    expect(module.scheduledStationName).toBe('CT-01');
    expect(module.scheduledProcedureStepStartDate).toBe('20260327');
    expect(module.scheduledProcedureStepStartTime).toBe('091500');
    expect(module.scheduledPerformingPhysicianName).toBe('Whooley^Peter');
    expect(module.scheduledProcedureStepDescription).toBe('CT CHEST');
    expect(module.scheduledProcedureStepId).toBe('SPS-001');
    expect(module.scheduledProtocolCodeSequence).toBe(scheduledProtocolCodeSequence);
});

test("Test: ScheduledProcedureStepModule handles missing sequence", () => {
    var module = new ScheduledProcedureStepModule({
        find() {
            return null;
        }
    });

    expect(module.hasItems).toBe(false);
    expect(module.items).toEqual([]);
    expect(module.firstItem).toBeNull();
    expect(module.scheduledProcedureStepId).toBeNull();
    expect(module.scheduledProtocolCodeSequence).toBeNull();
});
