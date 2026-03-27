//
// SegmentationModule.js - 1.0.0
//
// DICOM Segmentation Module Class
//

import Module from './Module.js';
import Tag from '../Tag.js';

export default class SegmentationModule extends Module {

    /**
     * Get the Segmentation Type.
     * @returns The Segmentation Type value.
     */
    get segmentationType() {
        return this.attributeSet.value(Tag.SegmentationType);
    }

    /**
     * Get the Segments Overlap indicator.
     * @returns The Segments Overlap value.
     */
    get segmentsOverlap() {
        return this.attributeSet.value(Tag.SegmentsOverlap);
    }

    /**
     * Get the Segment Sequence attribute.
     * @returns The Segment Sequence attribute.
     */
    get segmentSequence() {
        return this.attributeSet.find(Tag.SegmentSequence);
    }

    /**
     * Get all segment items.
     * @returns {Array<AttributeSet>} The segment items.
     */
    get segmentItems() {
        var sequence = this.segmentSequence;
        if ((sequence == null) || (Array.isArray(sequence.items) == false))
            return [];
        return sequence.items;
    }

    /**
     * Get normalized segment descriptors.
     * @returns {Array<object>} The segment descriptors.
     */
    get segments() {

        var items = this.segmentItems;
        var result = [];

        for (var i = 0; i < items.length; i++) {
            result.push({
                number: items[i].value(Tag.SegmentNumber, null),
                label: items[i].value(Tag.SegmentLabel, null),
                algorithmType: items[i].value(Tag.SegmentAlgorithmType, null),
                algorithmName: items[i].value(Tag.SegmentAlgorithmName, null)
            });
        }

        return result;

    }

    /**
     * Get the number of defined segments.
     * @returns {number} The segment count.
     */
    get segmentCount() {
        return this.segmentItems.length;
    }

    /**
     * Constructs a Segmentation Module accessor instance.
     * @param {AttributeSet} attributeSet The source attribute set.
     */
    constructor(attributeSet) {
        super(attributeSet);
    }

};
