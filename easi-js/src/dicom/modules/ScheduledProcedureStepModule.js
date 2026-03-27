//
// ScheduledProcedureStepModule.js - 1.0.0
//
// DICOM Scheduled Procedure Step Module Class
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
