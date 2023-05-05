//
// Patient.js - 1.0.0
//
// FHIR Patient Class 
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

import DomainResource from "./DomainResource.js"
import HumanName from "./HumanName.js";
import ContactPoint from "./ContactPoint.js";
import { AdministrativeGender } from "./AdministrativeGender.js";
import DateUtils from "../utils/DateUtils.js";

export default class Patient extends DomainResource {
  
    /**
     * Gets the identifier value.
     */
    get identifier() {
        return this._identifier;
    }

    /**
     * Sets the identifier value.
     */
    set identifier(identifier) {
        this._identifier = identifier;
    }

    /**
     * Gets the active value.
     */
    get active() {
        return this._active;
    }

    /**
     * Sets the active value.
     */
    set active(active) {
        this._active = active;
    }

    /**
     * Gets the name value.
     */
    get name() {
        return this._name;
    }

    /**
     * Sets the name value.
     */
    set name(name) {
        this._name = HumanName.coerce(name);
    }

    /**
     * Adds the name value.
     * @param {*} name The name value to add.
     */
    addName(name) {
        this.addMultiValue('name', HumanName.coerce(name));
    }

    /**
     * Gets the telcom value.
     */
    get telcom() {
        return this._telcom;
    }

    /**
     * Sets the telcom value.
     */
    set telcom(telcom) {
        this._telcom = telcom;
    }

    /**
     * Adds the telcom value.
     * @param {*} telcom The telcom value to add.
     */
    addTelcom(telcom) {
        this.addMultiValue('telcom', ContactPoint.coerce(telcom));
    }

    /**
     * Gets the gender value.
     */
    get gender() {
        return this._gender;
    }

    /**
     * Sets the gender value.
     */
    set gender(gender) {
        this._gender = AdministrativeGender.coerce(gender);
    }

    /**
     * Gets the birthDate value.
     */
    get birthDate() {
        return this._birthDate;
    }

    /**
     * Sets the birthDate value.
     */
    set birthDate(birthDate) {
        this._birthDate = birthDate;
    }

    /**
     * Convert to JSON data
     * @returns 
     */
    toJSON() {
        return {
            resourceType: this.resourceType,
            identifier: this.identifier,
            active: this.active,
            name: this.name,
            telcom: this.telcom,
            gender: AdministrativeGender.toJSON(this.gender),
            birthDate: DateUtils.formatToYYYYMMDD(this.birthDate)
        }
    }

    constructor() {

        // Call the super
        super();

    }

};