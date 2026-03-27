import Waveform from '../../../src/dicom/entities/Waveform.js';
import Entity from '../../../src/dicom/entities/Entity.js';
import WaveformModule from '../../../src/dicom/modules/WaveformModule.js';

function createAttributeSet() {
    return {
        value() { return null; },
        find() { return null; }
    };
}

test("Test: Waveform constructor inheritance and attributeSet", () => {
    var attributeSet = createAttributeSet();
    var entity = new Waveform(attributeSet);

    expect(entity).toBeInstanceOf(Entity);
    expect(entity.attributeSet).toBe(attributeSet);
});

test("Test: Waveform exposes waveform module", () => {
    var entity = new Waveform(createAttributeSet());
    expect(entity.waveformModule).toBeInstanceOf(WaveformModule);
    expect(entity.waveform).toBeInstanceOf(WaveformModule);
});
