//
// PresentationState.js - 1.0.0
//
// DICOM Presentation State Entity Class
//

import Entity from './Entity.js';
import PresentationStateModule from '../modules/PresentationStateModule.js';

export default class PresentationState extends Entity {

    /**
     * Get the Presentation State Module.
     * @returns {PresentationStateModule} The presentation state module accessor.
     */
    get presentationStateModule() {
        return new PresentationStateModule(this.attributeSet);
    }

    /**
     * Get the Presentation State accessor.
     * @returns {PresentationStateModule} The presentation state module accessor.
     */
    get presentationState() {
        return this.presentationStateModule;
    }

    /**
     * Construct a DICOM Presentation State entity.
     * @param {Instance | AttributeSet} instance The source instance or attribute set.
     */
    constructor(instance) {
        super(instance);
    }

};
