//
// ImagePixelModule.js
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
import Tag from '../Tag.js'
import { PhotometricInterpretationType } from '../Tag.js'

export default class ImagePixelModule extends Module {

    /**
     * Get the Samples Per Pixel.
     * @returns The Samples Per Pixel value.
     */
    get samplesPerPixel() {
        
        // Get the samples per pixel value
        var value = this.attributeSet.value(Tag.SamplesPerPixel);

        // Handle default if NOT present
        if (value == null) {

            // Switch the photometric interpretation
            switch (this.photometricInterpretation) {

                // Handle Monochrome Interpretation
                case PhotometricInterpretationType.MONOCHROME1:
                case PhotometricInterpretationType.MONOCHROME2:
                    return 1;

            }

        }

        // Return
        return value;

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
            return PhotometricInterpretationType.MONOCHROME1;

        // If the value is already one of the known enum symbols, return it.
        var knownValues = Object.values(PhotometricInterpretationType);
        if (knownValues.includes(value) == true)
            return value;

        // Normalize free-text values from DICOM source data.
        var normalized = String(value).trim().toUpperCase();
        var lookupKey = null;

        switch (normalized) {
            case "PALETTE COLOR":
            case "PALETTE_COLOR":
                lookupKey = "PALETTECOLOR";
                break;
            case "YBR FULL":
                lookupKey = "YBR_FULL";
                break;
            case "YBR FULL 422":
                lookupKey = "YBR_FULL_422";
                break;
            case "YBR PARTIAL 422":
                lookupKey = "YBR_PARTIAL_422";
                break;
            case "YBR PARTIAL 420":
                lookupKey = "YBR_PARTIAL_420";
                break;
            case "YBR ICT":
                lookupKey = "YBR_ICT";
                break;
            case "YBR RCT":
                lookupKey = "YBR_RCT";
                break;
            default:
                lookupKey = normalized.replace(/[\s-]+/g, "_");
                break;
        }

        // Determine the value
        value = PhotometricInterpretationType[lookupKey];

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
        return this.accessIntegerString(Tag.PixelAspectRatio, Tag.PixelAspectRatio.VM);
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
     * Get the Smallest Image Pixel Value.
     * @returns The Smallest Image Pixel value.
     */
    get smallestImagePixelValue() {
        return this.attributeSet.value(Tag.SmallestImagePixelValue);
    }

    /**
     * Get the Largest Image Pixel Value.
     * @returns The Largest Image Pixel value.
     */
    get largestImagePixelValue() {
        return this.attributeSet.value(Tag.LargestImagePixelValue);
    }

    /**
     * Get the Pixel Data.
     * @returns The Pixel Data value.
     */
    get pixelData() {
        return this.attributeSet.value(Tag.PixelData);
    }

    /**
     * Calculates the image size.
     * @returns The Image Size value.
     */
    get imageSize() {
        // CALCULATION: IMAGESIZE = ROWS x COLUMNS x SAMPLESPERPIXEL * (BITSALLOCATED / 8)
        return (this.rows * this.columns * this.samplesPerPixel * (this.bitsAllocated / 8));
    }

    /**
     * Construct an Pixel Module Accessor instance.
     */
    constructor(attributeSet) {

        // Call the super constructor
        super(attributeSet);

    }

};
