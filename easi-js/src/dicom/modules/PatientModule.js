//
// PatientModule.js - 1.0.0
//
// DICOM Patient Module Class
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

export default class PatientModule extends Module {

    /**
     * Get the Patient Name.
     * @returns The Patient Name value.
     */
    get patientName() {
        return this.attributeSet.value(Tag.PatientName);
    }

    /**
     * Get the Patient Name.
     * @returns The Patient Name value.
     */
    get name() {
        return this.patientName;
    }

    /**
     * Get the Patient ID.
     * @returns The Patient ID value.
     */
    get patientId() {
        return this.attributeSet.value(Tag.PatientID);
    }

    /**
     * Get the Patient ID.
     * @returns The Patient ID value.
     */
    get id() {
        return this.patientID;
    }

    /**
     * Get the Issuer Of Patient ID.
     * @returns The Issuer Of Patient ID value.
     */
    get issuerOfPatientID() {
        return this.attributeSet.value(Tag.IssuerOfPatientID);
    }

    /**
     * Get the Type Of Patient ID.
     * @returns The Type Of Patient ID value.
     */
    get typeOfPatientID() {
        return this.attributeSet.value(Tag.TypeOfPatientID);
    }

    /**
     * Get the Patient Birth Date.
     * @returns The Patient Birth Date value.
     */
    get patientBirthDate() {
        return this.attributeSet.value(Tag.PatientBirthDate);
    }

    /**
     * Get the Patient Birth Date.
     * @returns The Patient Birth Date value.
     */
    get birthDate() {
        return this.patientBirthDate;
    }

    /**
     * Get the Patient Birth Time.
     * @returns The Patient Birth Time value.
     */
    get patientBirthTime() {
        return this.attributeSet.value(Tag.PatientBirthTime);
    }

    /**
     * Get the Patient Birth Time.
     * @returns The Patient Birth Time value.
     */
    get birthTime() {
        return this.patientBirthTime;
    }

    /**
     * Get the Patient Sex.
     * @returns The Patient Sex value.
     */
    get patientSex() {
        return this.attributeSet.value(Tag.PatientSex);
    }

    /**
     * Get the Patient Sex.
     * @returns The Patient Sex value.
     */
    get sex() {
        return this.patientSex;
    }

    /**
     * Get the Other Patient IDs.
     * @returns The Other Patient IDs value.
     */
    get otherPatientIDs() {
        return this.attributeSet.value(Tag.OtherPatientIDs);
    }

    /**
     * Get the Other Patient Names.
     * @returns The Other Patient Names value.
     */
    get otherPatientNames() {
        return this.attributeSet.value(Tag.OtherPatientNames);
    }

    /**
     * Get the Ethnic Group.
     * @returns The Ethnic Group value.
     */
    get ethnicGroup() {
        return this.attributeSet.value(Tag.EthnicGroup);
    }

    /**
     * Get the Patient Comments.
     * @returns The Patient Comments value.
     */
    get patientComments() {
        return this.attributeSet.value(Tag.PatientComments);
    }

    /**
     * Construct a Patient Module accessor instance.
     */
    constructor(attributeSet) {

        // Call the super constructor
        super(attributeSet);

    }

};
