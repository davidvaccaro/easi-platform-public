//
// WorklistItem.js - 1.0.0
//
// DICOM Worklist Item Entity Class
//

import Entity from './Entity.js';
import RequestedProcedureModule from '../modules/RequestedProcedureModule.js';
import ScheduledProcedureStepModule from '../modules/ScheduledProcedureStepModule.js';

export default class WorklistItem extends Entity {

    /**
     * Get the Requested Procedure Module.
     * @returns {RequestedProcedureModule} The requested procedure accessor.
     */
    get requestedProcedureModule() {
        return new RequestedProcedureModule(this.attributeSet);
    }

    /**
     * Get the Requested Procedure accessor.
     * @returns {RequestedProcedureModule} The requested procedure accessor.
     */
    get requestedProcedure() {
        return this.requestedProcedureModule;
    }

    /**
     * Get the Scheduled Procedure Step Module.
     * @returns {ScheduledProcedureStepModule} The SPS accessor.
     */
    get scheduledProcedureStepModule() {
        return new ScheduledProcedureStepModule(this.attributeSet);
    }

    /**
     * Get the Scheduled Procedure Step accessor.
     * @returns {ScheduledProcedureStepModule} The SPS accessor.
     */
    get scheduledProcedureStep() {
        return this.scheduledProcedureStepModule;
    }

    /**
     * Constructs a DICOM Worklist Item entity.
     * @param {Instance | AttributeSet} instance The source instance or attribute set.
     */
    constructor(instance) {
        super(instance);
    }

};
