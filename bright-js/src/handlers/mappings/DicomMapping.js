//
// DicomMapping.js - 1.0.0
//
// DicomMapping Class 
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

import Mapping from "./Mapping.js";

export default class DicomMapping extends Mapping {
    
    /**
     * Add a mapping for the specified DICOM Tag.
     * @param {Tag} tag The specified DICOM Tag.
     * @param {string} property The property The property name or path to a property within an object hierarchy.
     */
    addTag(tag, property) {

        // Add the tag mapping
        this.add(tag.ID, property);

    }

    /**
     * Determine if the mapping has the current DICOM Tag.
     * @param {Tag} tag The specified DICOM Tag.
     * @returns TRUE if the mapping maps the DICOM Tag, FALSE otherwise.
     */
    hasTag(tag) {
        return this.has(tag.ID);
    }

    /**
     * Map the attribute to the destination property.
     * @param {object} context 
     * @param {Attribute} attribute 
     */
    mapAttribute(context, attribute) {

        // First, if the attribite is NOT mapped, return
        if (this.hasTag(attribute.tag) == false)
            return;

        // Map the attribute
        this.map(context, attribute.tag.ID, attribute.value);

    }

    constructor() {

        // Call the base
        super();

    }

};