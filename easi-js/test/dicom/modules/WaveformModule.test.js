import WaveformModule from '../../../src/dicom/modules/WaveformModule.js';
import Tag from '../../../src/dicom/Tag.js';

function createItem(valueByTagId = {}, findByTagId = {}) {
    return {
        value(tag, defaultValue = null) {
            if (Object.prototype.hasOwnProperty.call(valueByTagId, tag.ID))
                return valueByTagId[tag.ID];
            return defaultValue;
        },
        find(tag) {
            if (Object.prototype.hasOwnProperty.call(findByTagId, tag.ID))
                return findByTagId[tag.ID];
            return null;
        }
    };
}

function createAttributeSet(findByTagId = {}) {
    return {
        find(tag) {
            if (Object.prototype.hasOwnProperty.call(findByTagId, tag.ID))
                return findByTagId[tag.ID];
            return null;
        }
    };
}

test("Test: WaveformModule exposes multiplex group descriptors", () => {
    var channelSequence = { items: [{}, {}] };
    var waveformItem = createItem({
        [Tag.NumberOfWaveformChannels.ID]: 2,
        [Tag.NumberOfWaveformSamples.ID]: 500,
        [Tag.SamplingFrequency.ID]: 250,
        [Tag.WaveformData.ID]: new Uint8Array(2000)
    }, {
        [Tag.ChannelDefinitionSequence.ID]: channelSequence
    });
    var waveformSequence = { items: [waveformItem] };

    var module = new WaveformModule(createAttributeSet({
        [Tag.WaveformSequence.ID]: waveformSequence
    }));

    expect(module.waveformSequence).toBe(waveformSequence);
    expect(module.multiplexGroupCount).toBe(1);
    expect(module.multiplexGroups).toEqual([
        {
            numberOfWaveformChannels: 2,
            numberOfWaveformSamples: 500,
            samplingFrequency: 250,
            channelDefinitionSequence: channelSequence,
            waveformDataLength: 2000
        }
    ]);
});
