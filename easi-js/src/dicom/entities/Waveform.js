//
// Waveform.js - 1.0.0
//
// DICOM Waveform Entity Class
//

import Entity from './Entity.js';
import WaveformModule from '../modules/WaveformModule.js';

export default class Waveform extends Entity {

    /**
     * Get the Waveform Module.
     * @returns {WaveformModule} The waveform module accessor.
     */
    get waveformModule() {
        return new WaveformModule(this.attributeSet);
    }

    /**
     * Get the Waveform accessor.
     * @returns {WaveformModule} The waveform module accessor.
     */
    get waveform() {
        return this.waveformModule;
    }

    /**
     * Construct a DICOM Waveform entity.
     * @param {Instance | AttributeSet} instance The source instance or attribute set.
     */
    constructor(instance) {
        super(instance);
    }

};
