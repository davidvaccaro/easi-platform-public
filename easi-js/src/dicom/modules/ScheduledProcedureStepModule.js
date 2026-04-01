//
// ScheduledProcedureStepModule.js
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

import Module from './Module.js';
import Tag from '../Tag.js';

export default class ScheduledProcedureStepModule extends Module {

    /**
     * Get all Scheduled Procedure Step sequence items.
     * @returns {Array<AttributeSet>} The sequence items.
     */
    get items() {
        return this.accessSequenceItems(Tag.ScheduledProcedureStepSequence);
    }

    /**
     * Get the first Scheduled Procedure Step sequence item.
     * @returns {AttributeSet | null} The first sequence item.
     */
    get firstItem() {
        return this.accessFirstSequenceItem(Tag.ScheduledProcedureStepSequence);
    }

    /**
     * Determine whether one or more SPS items exist.
     * @returns {boolean} TRUE when items exist.
     */
    get hasItems() {
        return (this.items.length > 0);
    }

    /**
     * Access the first-item value for a SPS tag.
     * @param {Tag} tag The DICOM tag.
     * @param {*} defaultValue The default value.
     * @returns {*} The first-item value.
     */
    firstValue(tag, defaultValue = null) {
        var item = this.firstItem;
        if (item == null)
            return defaultValue;
        return item.value(tag, defaultValue);
    }

    /**
     * Get the Scheduled Station AE Title.
     * @returns The Scheduled Station AE Title value.
     */
    get scheduledStationAETitle() {
        return this.firstValue(Tag.ScheduledStationAETitle);
    }

    /**
     * Get the Scheduled Station Name.
     * @returns The Scheduled Station Name value.
     */
    get scheduledStationName() {
        return this.firstValue(Tag.ScheduledStationName);
    }

    /**
     * Get the Scheduled Procedure Step Start Date.
     * @returns The Scheduled Procedure Step Start Date value.
     */
    get scheduledProcedureStepStartDate() {
        return this.firstValue(Tag.ScheduledProcedureStepStartDate);
    }

    /**
     * Get the Scheduled Procedure Step Start Time.
     * @returns The Scheduled Procedure Step Start Time value.
     */
    get scheduledProcedureStepStartTime() {
        return this.firstValue(Tag.ScheduledProcedureStepStartTime);
    }

    /**
     * Get the Scheduled Performing Physician Name.
     * @returns The Scheduled Performing Physician Name value.
     */
    get scheduledPerformingPhysicianName() {
        return this.firstValue(Tag.ScheduledPerformingPhysicianName);
    }

    /**
     * Get the Scheduled Procedure Step Description.
     * @returns The Scheduled Procedure Step Description value.
     */
    get scheduledProcedureStepDescription() {
        return this.firstValue(Tag.ScheduledProcedureStepDescription);
    }

    /**
     * Get the Scheduled Procedure Step ID.
     * @returns The Scheduled Procedure Step ID value.
     */
    get scheduledProcedureStepId() {
        return this.firstValue(Tag.ScheduledProcedureStepID);
    }

    /**
     * Get the Scheduled Protocol Code Sequence in the first SPS item.
     * @returns {AttributeSequence | null} The sequence attribute.
     */
    get scheduledProtocolCodeSequence() {
        var item = this.firstItem;
        if (item == null)
            return null;
        return item.find(Tag.ScheduledProtocolCodeSequence);
    }

    /**
     * Constructs a Scheduled Procedure Step Module accessor instance.
     * @param {AttributeSet} attributeSet The source attribute set.
     */
    constructor(attributeSet) {
        super(attributeSet);
    }

};
