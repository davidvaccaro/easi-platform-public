//
// MultiFrameModule.js - 1.0.0
//
// DICOM Multi Frame Module Class 
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

export default class MultiFrameModule extends Module {

    /**
     * Get the Stereo Pairs Present.
     * @returns The Stereo Pairs Present value.
     */
    get stereoPairsPresent() {
        return this.attributeSet.value(Tag.StereoPairsPresent);
    }

    /**
     * Get the Number Of Frames.
     * @returns The Number Of Frames value.
     */
    get numberOfFrames() {
        return this.accessIntegerString(Tag.NumberOfFrames, Tag.NumberOfFrames.VM);
    }

    /**
     * Construct an Pixel Module Accessor instance.
     */
    constructor(attributeSet) {

        // Call the super constructor
        super(attributeSet);

    }

};