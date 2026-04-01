//
// DataElement.js
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

import EncodedData from './EncodedData.js';

export default class DataElement extends EncodedData {

    /**
     * Determine if the current data element has ALL data present.
     */
    get isComplete() {
        
        // If the complete status has been specifically set, return it
        if (this.complete != null)
            return this.complete;

        // First check the state
        if ((this.isEmpty == true) && (this.valueLength == 0))
            return true;

        return (this.length() == this.valueLength);

    }

    /**
     * Sets the complete state and thereby overrides the default length comparison approach.
     */
    set isComplete(complete) {
        this.complete = complete;
    }

    /**
     * Determine the bytes remaining to complete this data element.
     */
    get bytesRemaining() {

        // If the data-element is complete, return 0
        if (this.isComplete == true)
            return 0;

        // Return the difference between the stated length and the current length
        return (this.valueLength - this.length());

    }

    /**
     * Construct a new DICOM data-element instance from a tag, tag details and data
     */
    constructor(data, transferSyntax, valueLength) {

        // Call the super constructor
        super(data, transferSyntax);

        // Set the properties
        this.valueLength = valueLength;
        this.complete = null;

    }

};