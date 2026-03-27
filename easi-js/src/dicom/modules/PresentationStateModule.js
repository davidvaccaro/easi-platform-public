//
// PresentationStateModule.js - 1.0.0
//
// DICOM Presentation State Module Class
//

import Module from './Module.js';
import Tag from '../Tag.js';

export default class PresentationStateModule extends Module {

    /**
     * Get the Content Label.
     * @returns The Content Label value.
     */
    get contentLabel() {
        return this.attributeSet.value(Tag.ContentLabel);
    }

    /**
     * Get the Content Description.
     * @returns The Content Description value.
     */
    get contentDescription() {
        return this.attributeSet.value(Tag.ContentDescription);
    }

    /**
     * Get the Content Creator Name.
     * @returns The Content Creator Name value.
     */
    get contentCreatorName() {
        return this.attributeSet.value(Tag.ContentCreatorName);
    }

    /**
     * Get the Presentation Creation Date.
     * @returns The Presentation Creation Date value.
     */
    get presentationCreationDate() {
        return this.attributeSet.value(Tag.PresentationCreationDate);
    }

    /**
     * Get the Presentation Creation Time.
     * @returns The Presentation Creation Time value.
     */
    get presentationCreationTime() {
        return this.attributeSet.value(Tag.PresentationCreationTime);
    }

    /**
     * Get the Referenced Series Sequence attribute.
     * @returns The Referenced Series Sequence attribute.
     */
    get referencedSeriesSequence() {
        return this.attributeSet.find(Tag.ReferencedSeriesSequence);
    }

    /**
     * Get the Referenced Image Sequence attribute.
     * @returns The Referenced Image Sequence attribute.
     */
    get referencedImageSequence() {
        return this.attributeSet.find(Tag.ReferencedImageSequence);
    }

    /**
     * Construct a Presentation State Module accessor instance.
     * @param {AttributeSet} attributeSet The source attribute set.
     */
    constructor(attributeSet) {
        super(attributeSet);
    }

};
