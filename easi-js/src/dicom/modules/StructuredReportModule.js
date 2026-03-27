//
// StructuredReportModule.js - 1.0.0
//
// DICOM Structured Report Module Class
//

import Module from './Module.js';
import Tag from '../Tag.js';

export default class StructuredReportModule extends Module {

    /**
     * Get the Value Type.
     * @returns The Value Type value.
     */
    get valueType() {
        return this.attributeSet.value(Tag.ValueType);
    }

    /**
     * Get the Completion Flag.
     * @returns The Completion Flag value.
     */
    get completionFlag() {
        return this.attributeSet.value(Tag.CompletionFlag);
    }

    /**
     * Get the Verification Flag.
     * @returns The Verification Flag value.
     */
    get verificationFlag() {
        return this.attributeSet.value(Tag.VerificationFlag);
    }

    /**
     * Get the Concept Name Code Sequence.
     * @returns The Concept Name Code Sequence attribute.
     */
    get conceptNameCodeSequence() {
        return this.attributeSet.find(Tag.ConceptNameCodeSequence);
    }

    /**
     * Get the Content Sequence.
     * @returns The Content Sequence attribute.
     */
    get contentSequence() {
        return this.attributeSet.find(Tag.ContentSequence);
    }

    /**
     * Determine whether content items are present.
     * @returns {boolean} TRUE when one or more content items exist.
     */
    get hasContent() {
        return (this.contentItemCount > 0);
    }

    /**
     * Get the number of top-level content items.
     * @returns {number} The content item count.
     */
    get contentItemCount() {
        var sequence = this.contentSequence;
        if ((sequence == null) || (Array.isArray(sequence.items) == false))
            return 0;
        return sequence.items.length;
    }

    /**
     * Constructs a Structured Report Module accessor instance.
     * @param {AttributeSet} attributeSet The source attribute set.
     */
    constructor(attributeSet) {
        super(attributeSet);
    }

};
