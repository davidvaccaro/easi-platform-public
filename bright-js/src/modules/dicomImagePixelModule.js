//
// DicomImagePixelModule.js - 1.0.0
//
// DICOM Image Pixel Module Class 
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

import DicomAttributeSet from '../dicomAttributeSet.js';
import DicomModule from './dicomModule.js';
import { Tag } from '../dicomTag.js'
import { PhotometricInterpretationType } from '../dicomTag.js'

export default class DicomImagePixelModule extends DicomModule {

    /**
     * Get the Samples Per Pixel.
     * @returns The Samples Per Pixel value.
     */
    get samplesPerPixel() {
        return this.attributeSet.value(Tag.SamplesPerPixel);
    }

    /**
     * Gets the Photometric Interpretation value.
     * @returns The value of Photometric Interpretation.
     */
    get photometricInterpretation() {
        
        // Get the value
        var value = this.attributeSet.value(Tag.PhotometricInterpretation, null);

        // Validate the value
        if (value == null)
            return PhotometricInterpretationType.INVALID;

        // Determine the value
        value = PhotometricInterpretationType[value];

        // Validate the value
        if (value == null)
            return PhotometricInterpretationType.INVALID;

        return value;

    }

    /**
     * Get the Planar Configuration.
     * @returns The Planar Configuration value.
     */
    get planarConfiguration() {
        return this.attributeSet.value(Tag.PlanarConfiguration);
    }

    /**
     * Get the Rows.
     * @returns The Rows value.
     */
    get rows() {
        return this.attributeSet.value(Tag.Rows);
    }

    /**
     * Get the Columns.
     * @returns The Columns value.
     */
    get columns() {
        return this.attributeSet.value(Tag.Columns);
    }

    /**
     * Get the Pixel Aspect Ratio.
     * @returns The Pixel Aspect Ratio value.
     */
    get pixelAspectRatio() {
        return this.accessIntegerString(this.attributeSet.value(Tag.PixelAspectRatio), Tag.PixelAspectRatio.VM);
    }

    /**
     * Get the Bits Allocated.
     * @returns The Bits Allocated value.
     */
    get bitsAllocated() {
        return this.attributeSet.value(Tag.BitsAllocated);
    }

    /**
     * Get the Bits Stored.
     * @returns The Bits Stored value.
     */
    get bitsStored() {
        return this.attributeSet.value(Tag.BitsStored);
    }

    /**
     * Get the High Bit.
     * @returns The High Bit value.
     */
    get highBit() {
        return this.attributeSet.value(Tag.HighBit);
    }

    /**
     * Get the Pixel Representation.
     * @returns The Pixel Representation value.
     */
    get pixelRepresentation() {
        return this.attributeSet.value(Tag.PixelRepresentation);
    }

    /**
     * Get the Pixel Data.
     * @returns The Pixel Data value.
     */
    get pixelData() {
        return this.attributeSet.value(Tag.PixelData);
    }

    /**
     * Construct an Pixel Module Accessor instance.
     */
    constructor(attributeSet) {

        // Call the super constructor
        super(attributeSet);

    }

};