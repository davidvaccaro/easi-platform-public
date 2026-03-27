//
// WaveformModule.js - 1.0.0
//
// DICOM Waveform Module Class
//

import Module from './Module.js';
import Tag from '../Tag.js';

export default class WaveformModule extends Module {

    /**
     * Get the Waveform Sequence attribute.
     * @returns The Waveform Sequence attribute.
     */
    get waveformSequence() {
        return this.attributeSet.find(Tag.WaveformSequence);
    }

    /**
     * Get the waveform multiplex group items.
     * @returns {Array<AttributeSet>} The multiplex group items.
     */
    get waveformItems() {
        var sequence = this.waveformSequence;
        if ((sequence == null) || (Array.isArray(sequence.items) == false))
            return [];
        return sequence.items;
    }

    /**
     * Get normalized multiplex group descriptors.
     * @returns {Array<object>} The multiplex group descriptors.
     */
    get multiplexGroups() {

        var items = this.waveformItems;
        var result = [];

        for (var i = 0; i < items.length; i++) {
            var waveformData = items[i].value(Tag.WaveformData, null);
            result.push({
                numberOfWaveformChannels: items[i].value(Tag.NumberOfWaveformChannels, null),
                numberOfWaveformSamples: items[i].value(Tag.NumberOfWaveformSamples, null),
                samplingFrequency: items[i].value(Tag.SamplingFrequency, null),
                channelDefinitionSequence: items[i].find(Tag.ChannelDefinitionSequence),
                waveformDataLength: (waveformData != null) ? (waveformData.length ?? 0) : 0
            });
        }

        return result;

    }

    /**
     * Get the multiplex group count.
     * @returns {number} The multiplex group count.
     */
    get multiplexGroupCount() {
        return this.waveformItems.length;
    }

    /**
     * Construct a Waveform Module accessor instance.
     * @param {AttributeSet} attributeSet The source attribute set.
     */
    constructor(attributeSet) {
        super(attributeSet);
    }

};
