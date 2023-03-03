//
// DicomAttributeSequence.js - 1.0.0
//
// DICOM Tag Set Class 
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

class DicomAttributeSequence extends DicomAttribute {

    /**
     * Find an attribute within the immediate sequence by tag identifier.
     * @param {*} tag The DICOM tag to search by.
     * @returns The attribute if found or undefined otherwise.
     */
    find(tag) {
        return this.attributes.find(attribute => attribute.tag.ID == tag.ID);
    }

    /**
     * Determine if an attribute exists within the immediate sequence by tag.
     * @param {*} tag True if an attribute exists, False otherwise.
     */
    has(tag) {
        return (this.find(tag) != null);
    }

    /**
     * Adds a new attribute to the sequence of attributes.
     * @param {*} attribute The attribute to add.
     */
    add(attribute) {

        // If the sequence already has the tag, fail with exception
        if (this.has(attribute.tag))
            throw new DicomException("Duplicate Attribute!", DicomErrorCodes.DuplicateAttribute);

        // Add the attribute to the collection
        this.attributes.push(attribute);

    }

    /**
     * Get the attribute value for a specified DICOM tag identifier.
     * @returns The the attribute value.
     */
    value(tag, defaultValue = null) {

        // Find the attribute by the DICOM tag
        var attribute = this.find(tag);

        // Return 0-length if NOT present
        if (attribute == null)
            return defaultValue;

        // Return the attribute value
        return attribute.value;

    }

    /**
     * Construct an "empty" new DICOM attribute sequence instance from a tag
     */
    constructor(tag, valueLength, data, transferSyntax) {

        // Call the super constructor
        super(tag, valueLength, data, transferSyntax);

        // Init the attributes collection
        this.attributes = [];

    }

}