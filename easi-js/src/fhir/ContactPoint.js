//
// ContactPoint.js - 1.0.0
//
// FHIR ContactPoint Class 
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

import Element from "./Element.js"
import StringUtils from "../utils/StringUtils.js";

export default class ContactPoint extends Element {
  
    /**
     * Gets the system value.
     */
    get system() {
        return this._system;
    }

    /**
     * Sets the system value.
     */
    set system(system) {
        this._system = system;
    }    

    /**
     * Gets the value value.
     */
    get value() {
        return this._value;
    }

    /**
     * Sets the value value.
     */
    set value(value) {
        this._value = value;
    }    

    /**
     * Gets the use value.
     */
    get use() {
        return this._use;
    }

    /**
     * Sets the use value.
     */
    set use(use) {
        this._use = use;
    }

    /**
     * Gets the rank value.
     */
    get rank() {
        return this._rank;
    }

    /**
     * Sets the rank value.
     */
    set rank(rank) {
        this._rank = rank;
    }

    /**
     * Gets the period value.
     */
    get period() {
        return this._period;
    }

    /**
     * Sets the period value.
     */
    set period(period) {
        this._period = period;
    }

    /**
     * Coerce the specified value into a complete ContactPoint.
     * @param {ContactPoint | object | string} value The specified value.
     */
    static coerce(value) {

        // Handle NOOP NULL or existing ContactPoint.
        if ((value == null) || (value instanceof ContactPoint)) {
            return value;
        }

        var result = new ContactPoint();

        // Handle coercing from string.
        if (typeof value === 'string') {

            var text = value.trim();
            if (StringUtils.isValid(text) == false)
                return null;

            result.value = text;

            // Basic heuristic for common FHIR ContactPoint.system.
            if (text.includes('@') == true) {
                result.system = 'email';
            }
            else if (/^https?:\/\//i.test(text) == true) {
                result.system = 'url';
            }
            else {
                result.system = 'phone';
            }

            return result;

        }

        // Handle coercing from plain object.
        if (typeof value === 'object') {

            if (StringUtils.isValid(String(value.system ?? '')) == true)
                result.system = String(value.system).trim();
            if (StringUtils.isValid(String(value.value ?? '')) == true)
                result.value = String(value.value).trim();
            if (StringUtils.isValid(String(value.use ?? '')) == true)
                result.use = String(value.use).trim();
            if (Number.isFinite(Number(value.rank)) == true)
                result.rank = Number(value.rank);
            if (value.period != null)
                result.period = value.period;

            // Support common alternate key names seen in feed payloads.
            if ((result.system == null) && (StringUtils.isValid(String(value.type ?? '')) == true))
                result.system = String(value.type).trim();
            if ((result.value == null) && (StringUtils.isValid(String(value.contact ?? '')) == true))
                result.value = String(value.contact).trim();

            // If no useful content was provided, return null.
            if ((result.system == null)
                && (result.value == null)
                && (result.use == null)
                && (result.rank == null)
                && (result.period == null)) {
                return null;
            }

            // Default system when only a value exists.
            if ((result.system == null) && (result.value != null))
                result.system = 'phone';

            return result;

        }

        // Unsupported input type.
        return null;

    }

    constructor() {

        // Call the super
        super();

    }

};
