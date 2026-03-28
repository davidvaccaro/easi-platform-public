//
// Element.js - 1.0.0
//
// FHIR Element Class 
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

import Base from "./Base.js"

export default class Element extends Base {
  
    /**
     * Gets the id value.
     */
    get id() {
        return this._id;
    }

    /**
     * Sets the id value.
     */
    set id(id) {
        this._id = id;
    }

    /**
     * Add a specified value to the potentially multi-vaued property identified by the specified name.
     * @param {string} name The specified name of the multi-valued property to append to.
     * @param {*} value The value to append.
     */
    addMultiValue(name, value) {

        // First, Check the params
        if (value == null) {
            // Null/undefined add requests are ignored by design.
            return;

        }

        // Get the current value of the property
        var current = this[name];

        // If there current is NO current value, just set the value
        if (current == null) {
            this[name] = value;
        }
        else {

            // Establish the collection of values
            var values = (typeof current == 'array') ? current : [current];

            // Append the new value to the value collection
            if (Array.isArray(value)) {
                values.push(...value);
            } else {
                values.push(value);
            }

            // Set the new value
            this[name] = values;

        }

    }

    constructor(data) {

        // Call the base
        super();

        // Assign any provided data
        if (data != null) {
            Object.assign(this, data);
        }

    }

};
