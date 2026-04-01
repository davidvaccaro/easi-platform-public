//
// WorklistItem.js
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
