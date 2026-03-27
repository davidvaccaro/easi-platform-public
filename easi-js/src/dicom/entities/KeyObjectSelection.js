//
// KeyObjectSelection.js - 1.0.0
//
// DICOM Key Object Selection Entity Class
//

import Entity from './Entity.js';
import CurrentRequestedProcedureEvidenceModule from '../modules/CurrentRequestedProcedureEvidenceModule.js';

export default class KeyObjectSelection extends Entity {

    /**
     * Get the Current Requested Procedure Evidence Module.
     * @returns {CurrentRequestedProcedureEvidenceModule} The evidence accessor.
     */
    get currentRequestedProcedureEvidenceModule() {
        return new CurrentRequestedProcedureEvidenceModule(this.attributeSet);
    }

    /**
     * Get the evidence accessor.
     * @returns {CurrentRequestedProcedureEvidenceModule} The evidence accessor.
     */
    get evidence() {
        return this.currentRequestedProcedureEvidenceModule;
    }

    /**
     * Get flattened referenced SOP Instance UIDs.
     * @returns {Array<string>} The referenced SOP Instance UIDs.
     */
    get referencedSopInstanceUids() {
        return this.currentRequestedProcedureEvidenceModule.referencedSopInstanceUids;
    }

    /**
     * Constructs a DICOM Key Object Selection entity.
     * @param {Instance | AttributeSet} instance The source instance or attribute set.
     */
    constructor(instance) {
        super(instance);
    }

};
