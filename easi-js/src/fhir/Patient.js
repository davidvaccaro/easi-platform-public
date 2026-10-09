//
// Patient.js
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
import Identifier from "./Identifier.js";
import { AdministrativeGender } from "./AdministrativeGender.js";
import DateUtils from "../utils/DateUtils.js";
import { asArray, toFhirJSON } from "./FhirJson.js";

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
        this._identifier = asArray(identifier).filter((value) => value != null).map((value) =>
            (typeof value === 'string') ? new Identifier({ value: value }) : value
        );
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
        this._name = asArray(name).map(element => HumanName.coerce(element)).filter(element => element != null);
    }

    /**
     * Adds the name value.
     * @param {HumanName | string} name The name value to add.
     */
    addName(name) {
        this.appendMultiValue('name', HumanName.coerce(name));
    }

    /**
     * Gets the telecom value.
     */
    get telecom() {
        return this._telecom;
    }

    /**
     * Sets the telecom value.
     */
    set telecom(telecom) {
        this._telecom = asArray(telecom).map(element => ContactPoint.coerce(element)).filter(element => element != null);
    }

    /**
     * Adds a telecom value.
     */
    addTelecom(telecom) {
        this.appendMultiValue('telecom', ContactPoint.coerce(telecom));
    }

    /**
     * Gets the telcom compatibility alias.
     */
    get telcom() {
        return this.telecom;
    }

    /**
     * Sets the telcom value.
     */
    set telcom(telcom) {
        this.telecom = telcom;
    }

    /**
     * Adds the telcom value.
     * @param {ContactPoint | object | string} telcom The telcom value to add.
     */
    addTelcom(telcom) {
        this.addTelecom(telcom);
    }

    /**
     * Add one value to a potentially multi-valued patient property.
     * @param {string} name Property name.
     * @param {*} value The value to append.
     */
    appendMultiValue(name, value) {

        if (value == null)
            return;

        var current = this[name];

        if (current == null) {
            this[name] = value;
            return;
        }

        var values = Array.isArray(current) ? current : [current];

        if (Array.isArray(value) == true) {
            values.push(...value);
        }
        else {
            values.push(value);
        }

        this[name] = values;

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
        var birthDate = this.birthDate;
        if (birthDate instanceof Date) {
            birthDate = Number.isFinite(birthDate.getTime()) ? DateUtils.formatToYYYYMMDD(birthDate) : undefined;
        }

        return toFhirJSON({
            resourceType: this.resourceType,
            id: this.id,
            identifier: this.identifier,
            active: this.active,
            name: this.name,
            telecom: this.telecom,
            gender: AdministrativeGender.toJSON(this.gender),
            birthDate: birthDate
        });
    }

    constructor() {

        // Call the super
        super();

        this._identifier = [];
        this._name = [];
        this._telecom = [];

    }

};
