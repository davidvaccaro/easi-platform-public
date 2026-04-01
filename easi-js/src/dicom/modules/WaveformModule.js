//
// WaveformModule.js
//
// Proprietary Notices:
// The Products, Documentation and Materials are proprietary to Xinonix Interactive Development Inc. and its licensors 
// and protected by applicable U.S. and international patent, copyright, trademark and trade secret laws. Xinonix 
// Interactive Development Inc and its licensors shall retain ownership in the Products, Documentation and Materials; 
// all derivatives thereof (in whole or part); and any intellectual property or other rights embodied therein. 
// 
// All proprietary notices incorporated in or affixed to any Products, Documentation or Materials shall be duplicated 
// by you on all copies of the Products, Documentation, or Material, as applicable, and shall not be altered, removed 
// or obliterated. Lease Equipment is, and shall at all times be and remain Our sole and exclusive property; you have 
// no right, title or interest therein or thereto except as expressly set forth in this Agreement. You shall keep the 
// Lease Equipment free and clear of all levies, liens and encumbrances and shall immediately notify us in writing of 
// any circumstances with respect to the location of the Equipment which will adversely affect it or our security 
// interests therein. You shall not install, attach, mount or otherwise house the Lease Equipment in a manner that 
// would render it a fixture under applicable law within the jurisdiction in which the Lease Equipment is located.
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
