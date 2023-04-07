//
// dicomInstanceStreamHandler.js - 1.0.0
//
// DICOM Instance Emitter Class 
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

import DicomInstance from "../dicomInstance.js";
import DicomMetaSet from "../dicomMetaSet.js";
import DicomDataSet from "../dicomDataSet.js";
import DicomItem from "../dicomItem.js";

export default class dicomInstanceStreamHandler {

    onReset() {
    }

    onStartInstance() {

        // Create a new instance context
        return {
            instance: new DicomInstance(),
            sequences: []
        };

    }

    onStartPreamble(context, preamble) {
    }

    onStartPrefix(context, prefix) {
    }

    onStartAttribute(context, attribute) {

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
        else {

            // If there is a data-set, add to "data", otherwise add to "meta"
            if (context.instance.dataSet != null) {

                // Add to the "data-set"
                context.instance.dataSet.add(attribute);

            }
            else {

                // Add to the "meta-set"
                context.instance.metaSet.add(attribute);

            }

        }

    }

    onStartSequence(context, sequence) {

        // Add to the dataset
        context.instance.dataSet.add(sequence);

        // Push onto the sequence stack
        context.sequences.push(sequence);

    }

    onStartItem(context) {

        // Access the top of the sequence stack
        var sequence = context.sequences[context.sequences.length - 1];

        // Add the item to the current sequence
        sequence.add(new DicomItem());

    }

    onAppendAttribute(context, attribute) {
    }

    onStartMetaSet(context) {

        // Create the new metaset
        context.instance.metaSet = new DicomMetaSet();

    }

    onStartDataSet(context) {

        // Create the new dataset
        context.instance.dataSet = new DicomDataSet();

    }

    onEndPreamble(context, preamble) {

        // Set the preamble
        context.instance.preamble = preamble;

    }

    onEndPrefix(context, prefix) {

        // Set the prefix
        context.instance.prefix = prefix;

    }

    onEndAttribute(context, attribute) {
    }

    onEndSequence(context, sequence) {

        // Pop the current sequence stack
        context.sequences.pop();

    }

    onEndItem(context) {
    }

    onEndMetaSet(context) {

        // Mark the meta-set as "complete"
        context.instance.metaSet.isComplete = true;

    }

    onEndDataSet(context) {

        // Mark the data-set as "complete"
        context.instance.dataSet.isComplete = true;

    }

    /**
     * Returns the current instance constructed by this emitter.
     * @returns The current instance.
     */
    onEndInstance(context) {
        return context.instance;
    }

    onError(context, error) {        
    }

    constructor() {
    }

};