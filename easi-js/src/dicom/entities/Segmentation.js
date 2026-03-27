//
// Segmentation.js - 1.0.0
//
// DICOM Segmentation Entity Class
//

import Image from './Image.js';
import SegmentationModule from '../modules/SegmentationModule.js';

export default class Segmentation extends Image {

    /**
     * Get the Segmentation Module.
     * @returns {SegmentationModule} The segmentation module accessor.
     */
    get segmentationModule() {
        return new SegmentationModule(this.attributeSet);
    }

    /**
     * Get the Segmentation accessor.
     * @returns {SegmentationModule} The segmentation module accessor.
     */
    get segmentation() {
        return this.segmentationModule;
    }

    /**
     * Construct a DICOM Segmentation entity.
     * @param {Instance | AttributeSet} instance The source instance or attribute set.
     */
    constructor(instance) {
        super(instance);
    }

};
