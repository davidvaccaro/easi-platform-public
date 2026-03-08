//
// Entity.js - 1.0.0
//
// DICOM Dicom Entity Class 
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

import GeneralSeriesModule from '../modules/GeneralSeriesModule.js';
import ImagePixelModule from '../modules/ImagePixelModule.js';
import PatientModule from '../modules/PatientModule.js';
import Tag from '../Tag.js';

export default class Entity {

    /**
     * Get the General Series Module.
     * @returns The Rows value.
     */
    get generalSeriesModule() {
        return new GeneralSeriesModule(this.attributeSet);
    }

    /**
     * Get the General Series Module.
     * @returns The Rows value.
     */
    get series() {
        return this.generalSeriesModule;
    }

    /**
     * Get the Patient Module.
     * @returns The Patient Module.
     */
    get patientModule() {
        return new PatientModule(this.attributeSet);
    }

    /**
     * Get the Patient Module.
     * @returns The Patient Module.
     */
    get patient() {
        return this.patientModule;
    }

    /**
     * Get the Image Pixel Module.
     * @returns The Image Pixel Module.
     */
    get imagePixelModule() {
        return new ImagePixelModule(this.attributeSet);
    }

    /**
     * Get the Patient Module.
     * @returns The Patient Module.
     */
    get image() {
        return this.imagePixelModule;
    }

    /**
     * Gets the SOP Instance UID value.
     * @returns {string} The SOP Instance UID when available.
     */
    get sopInstanceUid() {

        if (this.attributeSet == null)
            return '';

        var attribute = this.attributeSet.find(Tag.SOPInstanceUID);
        if (attribute == null)
            return '';

        return attribute.value;

    }

    /**
     * Get the Patient accessor.
     * @returns {PatientModule} The Patient accessor.
     */
    get patient() {
        return this.patientModule;
    }

    /**
     * Construct an DICOM Object Accessor instance.
     */
    constructor(instance) {

        // Support both Instance and raw AttributeSet inputs.
        // Prefer Instance so entities can always reference the full source object.
        if ((instance != null)
            && (typeof instance == 'object')
            && (Object.prototype.hasOwnProperty.call(instance, 'dataSet') || ('dataSet' in instance))) {
            this.instance = instance;
            this.attributeSet = instance.dataSet;
        }
        else {
            this.instance = null;
            this.attributeSet = instance;
        }

    }

};
