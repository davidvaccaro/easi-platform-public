//
// dicomInstanceEmitter.js - 1.0.0
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

class DicomInstanceEmitter {

    reset() {

        // Reset the current instance
        this.instance = null;

        // Reset the sequence stack
        this.sequences = [];

    }

    startInstance() {

        // Create a new instance
        this.instance = new DicomInstance();

    }

    startPreamble(preamble) {
    }

    startPrefix(prefix) {
    }

    startAttribute(attribute) {

        // The attribute gets populated into either:
        // 1. The current sequence
        // 2. The dataset
        // 3. The metaset

        // If there is a current sequence stack, add to the sequence        
        if (this.sequences.length > 0) {

            // Add to the "top" of the sequence stack
            this.sequences[this.sequences.length - 1].add(attribute);

        }
        else {

            // If there is a data-set, add to "data", otherwise add to "meta"
            if (this.instance.dataSet != null) {

                // Add to the "data-set"
                this.instance.dataSet.add(attribute);

            }
            else {

                // Add to the "meta-set"
                this.instance.metaSet.add(attribute);

            }

        }

    }

    startSequence(sequence) {

        // Add to the dataset
        this.instance.dataSet.add(sequence);

        // Push onto the sequence stack
        this.sequences.push(sequence);

    }

    appendAttribute(attribute) {
    }

    appendSequence(sequence) {
    }

    startMetaSet() {

        // Create the new metaset
        this.instance.metaSet = new DicomMetaSet();

    }

    startDataSet() {

        // Create the new dataset
        this.instance.dataSet = new DicomDataSet();

    }

    endPreamble(preamble) {

        // Set the preamble
        this.instance.preamble = preamble;

    }

    endPrefix(prefix) {

        // Set the prefix
        this.instance.prefix = prefix;

    }

    endAttribute(attribute) {
    }

    endSequence(sequence) {

        // Pop the current sequence stack
        this.sequences.pop();

    }

    endMetaSet() {
    }

    endDataSet() {
    }

    endInstance() {
        console.log(this.instance);
    }

    constructor() {
    }

};