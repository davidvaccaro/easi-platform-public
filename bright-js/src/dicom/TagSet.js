//
// TagSet.js - 1.0.0
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

export default class TagSet {

    /**
     * Find an tag within the tag set by tag identifier.
     * @param {*} tag The DICOM tag to search by.
     * @returns The tag if found or NULL otherwise.
     */
    find(tag) {
        return this.tags.find(element => element.ID == tag.ID);
    }

    /**
     * Determine if an tag exists within the tag set.
     * @param {*} tag The DICOM tag to test.
     * @returns {*} TRUE if an tag exists in the tag set, FALSE otherwise.
     */
    has(tag) {
        return (this.find(tag) != null);
    }

    /**
     * Adds a new tag to the set of tags.
     * @param {*} tag The attribute to add.
     */
    add(tag) {

        // Add the attribute to the collection
        this.tags.push(tag);

    }

    /**
     * Construct a new DICOM tag set instance
     */
    constructor() {

        // Init the attributes collection
        this.tags = [];

    }

};