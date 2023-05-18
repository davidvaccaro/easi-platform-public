//
// StreamingDicomSelectingHandler.js - 1.0.0
//
// Stream DICOM Selecting Handler Class 
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

import Item from "../dicom/Item.js";
import { Status } from '../parsers/Status.js'

export default class StreamingDicomSelectingHandler {

    /**
     * Determine if the current attribute should be skipped based on the current context and attribute data.
     * @param {*} context The current context.
     * @param {*} attribute The current attribute.
     */
    skipAttribute(context, attribute) {

        // If the selection does NOT contain the current attribute, skip
        if (this.selection.hasTag(attribute.tag) == false)
            return true;

        return false;

    }

    /**
     * Determine if the current attribute should be skipped based on the current context and attribute data.
     * @param {*} context The current context.
     * @param {*} attribute The current attribute.
     */
    stopAttribute(context, attribute) {

        // If the selection is complete, SKIP
        if (this.selection.isComplete(context) == true)
            return true;

        // If the current parsed attribute is beyond the maximum selection tag, SKIP
        if ((this.selection.maximumTag != null) && (attribute.tag.Group >= this.selection.maximumTag.Group) && (attribute.tag.Element > this.selection.maximumTag.Element))
            return true;        

        return false;

    }

    onReset() {
    }

    onStartInstance(context) {

        // Setup the context based on the previous context
        if (context == null) {

            // Create the initial context            
            context = {
                sequences: []
            };

        }
        else {

            // Setup the next instance
            context.sequences = [];

        }

        // Start the selection
        return this.selection.start(context);

    }

    onStartPreamble(context, preamble) {
        return Status.SKIP;
    }

    onStartPrefix(context, prefix) {
        return Status.SKIP;
    }

    onStartAttribute(context, attribute) {

        // Stop the sequence if needed
        if (this.stopAttribute(context, attribute))
            return Status.JUMP;

        // Skip the sequence if needed
        if (this.skipAttribute(context, attribute))
            return Status.SKIP;

        // The attribute gets populated into either:
        // 1. The top sequence current item
        // 2. The dataset
        // 3. The metaset

        // If there is a current sequence stack, add to the sequence        
        if (context.sequences.length > 0) {

            // Access the top of the sequence stack
            var sequence = context.sequences[context.sequences.length - 1];
            
            // Access the current item in the sequence
            var item = sequence.items[sequence.items.length - 1];
            
            // Add to the item            
            item.add(attribute);

        }

    }

    onStartSequence(context, sequence) {

        // Stop the sequence if needed
        if (this.stopAttribute(context, sequence))
            return Status.JUMP;

        // Skip the sequence if needed
        if (this.skipAttribute(context, sequence))
            return Status.SKIP;

        // If there is a data-set
        if (context.instance.dataSet != null) {

            // Add to the dataset
            context.instance.dataSet.add(sequence);

            // Push onto the sequence stack
            context.sequences.push(sequence);

        }

    }

    onStartItem(context) {

        // Access the top of the sequence stack
        var sequence = context.sequences[context.sequences.length - 1];

        // Add the item to the current sequence
        if (sequence != null) {
            sequence.add(new Item());
        }

    }

    onAppendAttribute(context, attribute) {
    }

    onStartMetaSet(context) {
    }

    onStartDataSet(context) {
    }

    onEndPreamble(context, preamble) {
    }

    onEndPrefix(context, prefix) {
    }

    onEndAttribute(context, attribute) {

        // Match the attribute
        this.selection.matchAttribute(context, attribute);

    }

    onEndSequence(context, sequence) {

        // Map the sequence
        this.selection.matchAttribute(context, sequence);

        // Pop the current sequence stack
        context.sequences.pop();

    }

    onEndItem(context) {
    }

    onEndMetaSet(context) {
    }

    onEndDataSet(context) {
    }

    /**
     * Returns the current data product constructed by this handler.
     * @returns The current data product.
     */
    onEndInstance(context) {

        // End the currnent selection
        return this.selection.end(context);

    }

    onError(context, error) {        
    }

    onProgress(context, progress) {
    }

    /**
     * Create a new instance of the handler with the specified "selection".
     * @param {*} selection The specified selection to apply when processing the DICOM Data.
     */
    constructor(selection) {

        // Set the selection
        this.selection = selection;

    }

};