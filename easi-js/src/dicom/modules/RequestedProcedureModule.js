//
// RequestedProcedureModule.js - 1.0.0
//
// DICOM Requested Procedure Module Class
//

import Module from './Module.js';
import Tag from '../Tag.js';

export default class RequestedProcedureModule extends Module {

    /**
     * Get the Accession Number.
     * @returns The Accession Number value.
     */
    get accessionNumber() {
        return this.attributeSet.value(Tag.AccessionNumber);
    }

    /**
     * Get the Requested Procedure ID.
     * @returns The Requested Procedure ID value.
     */
    get requestedProcedureId() {
        return this.attributeSet.value(Tag.RequestedProcedureID);
    }

    /**
     * Get the Requested Procedure Description.
     * @returns The Requested Procedure Description value.
     */
    get requestedProcedureDescription() {
        return this.attributeSet.value(Tag.RequestedProcedureDescription);
    }

    /**
     * Get the Study Instance UID.
     * @returns The Study Instance UID value.
     */
    get studyInstanceUid() {
        return this.attributeSet.value(Tag.StudyInstanceUID);
    }

    /**
     * Constructs a Requested Procedure Module accessor instance.
     * @param {AttributeSet} attributeSet The source attribute set.
     */
    constructor(attributeSet) {
        super(attributeSet);
    }

};
