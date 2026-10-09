//
// Reference.js
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
import { toFhirJSON } from "./FhirJson.js";

export default class Reference extends Element {

    /**
     * Gets the reference value.
     */
    get reference() {
        return this._reference;
    }

    /**
     * Sets the reference value.
     */
    set reference(reference) {
        this._reference = reference;
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
     * Gets the display value.
     */
    get display() {
        return this._display;
    }

    /**
     * Sets the display value.
     */
    set display(display) {
        this._display = display;
    }

    /**
     * Convert to JSON data
     * @returns 
     */
    toJSON() {
        return toFhirJSON({
            reference: this.reference,
            type: this.type,
            identifier: this.identifier,
            display: this.display
        });
    }

    /**
     * Create a new reference instance.
     * @param {string} reference The reference value.
     */
    constructor(reference) {

        // Call the super
        super((typeof reference === 'object') ? reference : null);

        // Set the reference value
        if ((reference != null) && (typeof reference !== 'object')) {
            this._reference = reference;
        }

    }

};
