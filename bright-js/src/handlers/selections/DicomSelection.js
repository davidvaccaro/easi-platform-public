//
// DicomSelection.js - 1.0.0
//
// DicomSelection Class 
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

import Selection from "./Selection.js";
import TagSet from "../../dicom/TagSet.js";
import AttributeSet from "../../dicom/AttributeSet.js";

export default class DicomSelection extends Selection {
    
    /**
     * Add a selection item for the specified DICOM Tag.
     * @param {Tag} tag The specified DICOM Tag.
     */
    addTag(tag) {

        // Add the tag to the tag-set
        this.matching.add(tag);

        // Establish the "maximum" tag reference
        if ((this.maximumTag == null) || ((tag.Group >= this.maximumTag.Group) && (tag.Element > this.maximumTag.Element))) {
            this.maximumTag = tag;
        }

    }

    /**
     * Determine if the selection item has the current DICOM Tag.
     * @param {Tag} tag The specified DICOM Tag.
     * @returns TRUE if the selection item contains the DICOM Tag, FALSE otherwise.
     */
    hasTag(tag) {
        return this.matching.has(tag);
    }

    /**
     * Match the specified attribute.
     * @param {object} context 
     * @param {Attribute | AttributeSequence} attribute 
     */
    matchAttribute(context, attribute) {

        // First, if the attribite is NOT mapped, return
        if (this.hasTag(attribute.tag) == false)
            return false;

        // Establish the current attributes
        var current = context.current;

        // Determine if the attribute matches
        var isMatched = this.matching.has(attribute.tag);

        // If the attribute was matched, save the attribute
        if (this.matching.has(attribute.tag) == true) {

            // Add the attribute
            current.add(attribute);

        }

        return isMatched;

    }    

    start(context) {

        // Call the super
        super.start(context);

        // Handle setting up a new context
        context.current = new AttributeSet();

        // Return the modified context
        return context;

    }

    end(context) {        

        // Call the super
        super.end(context);

        // Establish the current attributes
        var current = context.current;

        // Establish the final set of attributes
        var final = context.final;

        // Perform merge of prior data - TODO - Beef this up by performing a real "merge" with various conflict resolution strategies
        if (final == null) {
            
            // Set the final result
            context.final = current;

        }
        else {

            // TODO - Handle merging

            // Build the master collection
            context.final = [...(Array.isArray(final) ? final : [final]), ...[current]];

        }

        // Return the current final value
        return context.final;

    }

    /**
     * Gets the "complete" status of the current context.
     */
    isComplete(context) {
        
        // Establish the current attributes
        var current = context.current;

        // Loop over the filter elements to see if it is fully matched
        for (var tag of this.matching.tags) {

            // Find the attribute by the tag
            var attribute = current.find(tag);

            // If the attribute does NOT exist, the selection is NOT complete
            if (attribute == null)
                return false;
            
        }

        return true;

    }    

    /**
     * Gets the "maximum" tag by Group/Element.
     */
    get maximumTag() {
        return this._maximumTag;
    }

    /**
     * Sets the "maximum" tag by Group/Element.
     */
    set maximumTag(tag) {
        this._maximumTag = tag;
    }

    /**
     * Create a new instance of the Dicom Selection class.
     */
    constructor() {
        
        // Call the base
        super();

        // Create the tag-set of "matching" tags
        this.matching = new TagSet();

        // Init the MAXIMUM tag
        this.maximumTag = null;

    }

};