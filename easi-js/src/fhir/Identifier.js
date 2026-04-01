//
// Identifier.js
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
import CodeableConcept from "./CodeableConcept.js";

export default class Identifier extends Element {
  
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
     * Gets the type value.
     */
    get type() {
        return this._type;
    }

    /**
     * Sets the type value.
     */
    set type(type) {
        this._type = type;
    }

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

    constructor() {

        // Call the super
        super();

    }

};