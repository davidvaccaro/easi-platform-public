//
// ImagePlaneModule.js
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

export default class ImagePlaneModule extends Module {

    /**
     * Get the Slice Thickness.
     * @returns The Slice Thickness value.
     */
    get sliceThickness() {
        return this.attributeSet.value(Tag.SliceThickness);
    }

    /**
     * Get the Image Position.
     * @returns The Image Position value.
     */
    get imagePosition() {
        return this.accessDecimalString(Tag.ImagePosition, Tag.ImagePosition.VM);
    }

    /**
     * Get the Image Position (Patient).
     * @returns The Image Position (Patient) value.
     */
    get imagePositionPatient() {
        return this.accessDecimalString(Tag.ImagePositionPatient, Tag.ImagePositionPatient.VM);
    }

    /**
     * Get the Image Orientation.
     * @returns The Image Orientation value.
     */
    get imageOrientation() {
        return this.accessDecimalString(Tag.ImageOrientation, Tag.ImageOrientation.VM);
    }

    /**
     * Get the Image Orientation (Patient).
     * @returns The Image Orientation (Patient) value.
     */
    get imageOrientationPatient() {
        return this.accessDecimalString(Tag.ImageOrientationPatient, Tag.ImageOrientationPatient.VM);
    }

    /**
     * Get the Slice Location.
     * @returns The Slice Location value.
     */
    get sliceLocation() {
        return this.accessDecimalString(Tag.SliceLocation, Tag.SliceLocation.VM);
    }

    /**
     * Get the Spacing Between Slices.
     * @returns The Spacing Between Slices value.
     */
    get spacingBetweenSlices() {
        return this.accessDecimalString(Tag.SpacingBetweenSlices, Tag.SpacingBetweenSlices.VM);
    }

    /**
     * Get the Pixel Spacing.
     * @returns The Pixel Spacing value.
     */
    get pixelSpacing() {
        return this.accessDecimalString(Tag.PixelSpacing, Tag.PixelSpacing.VM);
    }

    /**
     * Construct an Pixel Module Accessor instance.
     */
    constructor(attributeSet) {

        // Call the super constructor
        super(attributeSet);

    }

};
