//
// SegmentationModule.js
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
