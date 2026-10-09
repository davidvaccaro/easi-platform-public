//
// Coding.js
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

export default class Coding extends Element {
  
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
     * Gets the version value.
     */
    get version() {
        return this._version;
    }

    /**
     * Sets the version value.
     */
    set version(version) {
        this._version = version;
    }

    /**
     * Gets the code value.
     */
    get code() {
        return this._code;
    }

    /**
     * Sets the code value.
     */
    set code(code) {
        this._code = code;
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
     * Gets the userSelected value.
     */
    get userSelected() {
        return this._userSelected;
    }

    /**
     * Sets the userSelected value.
     */
    set userSelected(userSelected) {
        this._userSelected = userSelected;
    }

    /**
     * Create a new Coding instance.
     * @param {string} system The specified system.
     * @param {string} code The specified system.
     */
    static create(system, code) {

        // First, check the params
        if (code == null) {
            return null;
        }

        var normalized = String(code).trim();
        if (normalized.length === 0)
            return null;
        
        // Create the new codeable concept instance
        return new Coding({ 
            system: system, 
            code: normalized
        });
        
    }

    /**
     * Convert to JSON data
     * @returns 
     */
    toJSON() {
        return toFhirJSON({
            system: this.system,
            version: this.version,
            code: this.code,
            display: this.display,
            userSelected: this.userSelected
        });
    }

    constructor(data) {
        
        // Call the base
        super(data);

    }

};
