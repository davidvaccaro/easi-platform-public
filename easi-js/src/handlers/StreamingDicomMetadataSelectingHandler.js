//
// StreamingDicomMetadataSelectingHandler.js - 1.0.0
//
// Streaming DICOM JSON Metadata Selecting Handler Class 
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

import AttributeSequence from "../dicom/AttributeSequence.js";
import StreamingDicomMetadataInstanceHandler from "./StreamingDicomMetadataInstanceHandler.js";

export default class StreamingDicomMetadataSelectingHandler extends StreamingDicomMetadataInstanceHandler {

    /**
     * Traverse the supplied attribute and any nested sequence item attributes.
     * @param {Attribute | AttributeSequence} attribute The current attribute.
     * @param {Function} callback The callback invoked for each traversed attribute.
     */
    traverseAttribute(attribute, callback) {

        // Invoke callback for the current attribute
        callback(attribute);

        // Traverse nested sequence item attributes (if needed)
        if (attribute instanceof AttributeSequence) {

            // Loop over all items
            for (var i = 0; i < attribute.items.length; i++) {

                // Access the current item
                var item = attribute.items[i];

                // Loop over all item attributes
                for (var x = 0; x < item.attributes.length; x++) {
                    this.traverseAttribute(item.attributes[x], callback);
                }

            }

        }

    }

    /**
     * Apply the current selection to the specified instance.
     * @param {object} selectionContext The selection context.
     * @param {Instance} instance The source DICOM instance.
     */
    applySelection(selectionContext, instance) {

        // Start the selection
        selectionContext = this.selection.start(selectionContext);

        // Apply to all meta-set attributes
        if ((instance.metaSet != null) && (instance.metaSet.attributes != null)) {
            for (var i = 0; i < instance.metaSet.attributes.length; i++) {
                this.traverseAttribute(instance.metaSet.attributes[i], attribute => this.selection.matchAttribute(selectionContext, attribute));
            }
        }

        // Apply to all data-set attributes
        if ((instance.dataSet != null) && (instance.dataSet.attributes != null)) {
            for (var i = 0; i < instance.dataSet.attributes.length; i++) {
                this.traverseAttribute(instance.dataSet.attributes[i], attribute => this.selection.matchAttribute(selectionContext, attribute));
            }
        }

        // End the selection for this instance
        this.selection.end(selectionContext);

    }

    /**
     * Returns the selected values from the parsed DICOM JSON metadata stream.
     * @returns The selected output value.
     */
    onEnd(context) {

        // Build DICOM instances from the parsed DICOM JSON metadata
        var instances = super.onEnd(context);

        // Build the selection context
        var selectionContext = { final: null };

        // Apply selection per instance
        for (var i = 0; i < instances.length; i++) {
            this.applySelection(selectionContext, instances[i]);
        }

        // Return the final selection output
        return selectionContext.final;

    }

    /**
     * Create a new DICOM JSON Metadata selecting handler.
     * @param {Selection} selection The specified selection to apply.
     */
    constructor(selection) {

        // Call the base
        super();

        // Set the selection
        this.selection = selection;

    }

};
