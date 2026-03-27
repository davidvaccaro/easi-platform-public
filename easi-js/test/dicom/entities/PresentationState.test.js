import PresentationState from '../../../src/dicom/entities/PresentationState.js';
import Entity from '../../../src/dicom/entities/Entity.js';
import PresentationStateModule from '../../../src/dicom/modules/PresentationStateModule.js';

function createAttributeSet() {
    return {
        value() { return null; },
        find() { return null; }
    };
}

test("Test: PresentationState constructor inheritance and attributeSet", () => {
    var attributeSet = createAttributeSet();
    var entity = new PresentationState(attributeSet);

    expect(entity).toBeInstanceOf(Entity);
    expect(entity.attributeSet).toBe(attributeSet);
});

test("Test: PresentationState exposes presentation state module", () => {
    var entity = new PresentationState(createAttributeSet());
    expect(entity.presentationStateModule).toBeInstanceOf(PresentationStateModule);
    expect(entity.presentationState).toBeInstanceOf(PresentationStateModule);
});
