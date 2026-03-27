//
// StructuredReport.js - 1.0.0
//
// DICOM Structured Report Entity Class
//

import Entity from './Entity.js';
import StructuredReportModule from '../modules/StructuredReportModule.js';

export default class StructuredReport extends Entity {

    /**
     * Get the Structured Report Module.
     * @returns {StructuredReportModule} The SR module accessor.
     */
    get structuredReportModule() {
        return new StructuredReportModule(this.attributeSet);
    }

    /**
     * Get the Structured Report accessor.
     * @returns {StructuredReportModule} The SR module accessor.
     */
    get report() {
        return this.structuredReportModule;
    }

    /**
     * Construct a DICOM Structured Report entity.
     * @param {Instance | AttributeSet} instance The source instance or attribute set.
     */
    constructor(instance) {
        super(instance);
    }

};
